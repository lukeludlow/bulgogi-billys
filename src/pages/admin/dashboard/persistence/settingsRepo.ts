// Supabase reads/writes for the dashboard. Statements run sequentially in
// FK-safe order (parents before children, deletes after the child rewrite).
// Not transactional over PostgREST — a mid-save failure leaves a partial
// config until the caller's retry succeeds, which the tiny data size makes
// acceptable.

import { supabase } from "@/lib/supabase.ts";
import { DEFAULT_SETTINGS } from "../defaults.ts";
import type { Settings } from "../types.ts";
import type { ChangeSet } from "./diff.ts";
import {
    rowsToSettings,
    settingsToRows,
    type BatchLineRow,
    type DbSnapshot,
    type IngredientRow,
    type MenuItemRow,
    type RecipeLineRow,
    type SettingsRow,
    type TransactionRow,
    type VariantRow,
} from "./rows.ts";

function unwrap<T>({
    data,
    error,
}: {
    data: T | null;
    error: { message: string } | null;
}): T {
    if (error) throw new Error(error.message);
    return data as T;
}

/** Load everything, or null if the app has never seeded the settings row. */
export async function fetchSettings(): Promise<Settings | null> {
    const [
        settingsRow,
        ingredients,
        batchLines,
        menuItems,
        variants,
        recipeLines,
        transactions,
    ] = await Promise.all([
        supabase
            .from("settings")
            .select("*")
            .maybeSingle()
            .then(unwrap<SettingsRow | null>),
        supabase
            .from("ingredients")
            .select("*")
            .order("position")
            .then(unwrap<IngredientRow[]>),
        supabase
            .from("batch_lines")
            .select("*")
            .order("position")
            .then(unwrap<BatchLineRow[]>),
        supabase
            .from("menu_items")
            .select("*")
            .order("position")
            .then(unwrap<MenuItemRow[]>),
        supabase
            .from("variants")
            .select("*")
            .order("position")
            .then(unwrap<VariantRow[]>),
        supabase
            .from("recipe_lines")
            .select("*")
            .order("position")
            .then(unwrap<RecipeLineRow[]>),
        supabase
            .from("transactions")
            .select("*")
            .order("date", { ascending: false })
            .then(unwrap<TransactionRow[]>),
    ]);

    if (!settingsRow) return null;

    const snapshot: DbSnapshot = {
        settings: settingsRow,
        ingredients,
        batchLines,
        menuItems,
        variants,
        recipeLines,
        transactions,
    };
    return rowsToSettings(snapshot);
}

async function insertSnapshot(snapshot: DbSnapshot): Promise<void> {
    unwrap(await supabase.from("settings").upsert(snapshot.settings));
    unwrap(await supabase.from("ingredients").upsert(snapshot.ingredients));
    unwrap(await supabase.from("batch_lines").upsert(snapshot.batchLines));
    unwrap(await supabase.from("menu_items").upsert(snapshot.menuItems));
    unwrap(
        await supabase
            .from("variants")
            .upsert(snapshot.variants, { onConflict: "item_id,id" }),
    );
    unwrap(await supabase.from("recipe_lines").upsert(snapshot.recipeLines));
    if (snapshot.transactions.length > 0) {
        unwrap(
            await supabase.from("transactions").upsert(snapshot.transactions, {
                onConflict: "id",
                ignoreDuplicates: true,
            }),
        );
    }
}

/** First-run seeding. Returns the normalized Settings that were written. */
export async function seedDefaults(): Promise<Settings> {
    const snapshot = settingsToRows(DEFAULT_SETTINGS);
    await insertSnapshot(snapshot);
    return rowsToSettings(snapshot);
}

export async function applyChangeSet(changeSet: ChangeSet): Promise<void> {
    const { config } = changeSet;
    if (config) {
        // Parents first so new child rows have something to reference.
        unwrap(await supabase.from("ingredients").upsert(config.ingredients));
        unwrap(await supabase.from("menu_items").upsert(config.menuItems));
        unwrap(
            await supabase
                .from("variants")
                .upsert(config.variants, { onConflict: "item_id,id" }),
        );

        // Child line tables are rewritten wholesale: delete-all then insert.
        unwrap(await supabase.from("batch_lines").delete().gte("position", 0));
        unwrap(await supabase.from("batch_lines").insert(config.batchLines));
        unwrap(await supabase.from("recipe_lines").delete().gte("position", 0));
        unwrap(await supabase.from("recipe_lines").insert(config.recipeLines));

        // Removed parents last; cascades sweep any remaining children.
        for (const variant of config.variantDeletes) {
            unwrap(
                await supabase
                    .from("variants")
                    .delete()
                    .eq("item_id", variant.itemId)
                    .eq("id", variant.id),
            );
        }
        if (config.menuItemDeletes.length > 0) {
            unwrap(
                await supabase
                    .from("menu_items")
                    .delete()
                    .in("id", config.menuItemDeletes),
            );
        }
        if (config.ingredientDeletes.length > 0) {
            unwrap(
                await supabase
                    .from("ingredients")
                    .delete()
                    .in("id", config.ingredientDeletes),
            );
        }
    }

    if (changeSet.settings) {
        unwrap(await supabase.from("settings").upsert(changeSet.settings));
    }

    if (changeSet.transactionInserts) {
        // ignoreDuplicates: existing rows win, matching mergeTransactions.
        unwrap(
            await supabase
                .from("transactions")
                .upsert(changeSet.transactionInserts, {
                    onConflict: "id",
                    ignoreDuplicates: true,
                }),
        );
    }
}

/** Reset: wipe config AND transactions, then reseed the defaults. */
export async function clearAllData(): Promise<Settings> {
    unwrap(await supabase.from("transactions").delete().neq("id", ""));
    unwrap(await supabase.from("menu_items").delete().neq("id", ""));
    unwrap(await supabase.from("ingredients").delete().neq("id", ""));
    return seedDefaults();
}
