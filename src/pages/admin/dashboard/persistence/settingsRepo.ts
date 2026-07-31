// Supabase reads/writes for the dashboard. Statements run sequentially in
// FK-safe order (parents before children, deletes after the child rewrite).
// Not transactional over PostgREST — a mid-save failure leaves a partial
// config until the caller's retry succeeds, which the tiny data size makes
// acceptable.

import { supabase } from "@/lib/supabase.ts";
import type { Settings } from "../types.ts";
import type { ChangeSet } from "./diff.ts";
import {
    rowsToSettings,
    type BatchLineRow,
    type DbSnapshot,
    type EventRow,
    type IngredientRow,
    type MarketClassificationRow,
    type MenuItemRow,
    type RecipeLineRow,
    type SettingsRow,
    type TransactionRow,
    type VariantRow,
} from "./rows.ts";

// PostgREST caps each response at 1000 rows (db.max-rows), so large tables
// must be fetched in pages. The tiebreaker column keeps the sort order total;
// with date alone, rows sharing a date could shift between pages and be
// skipped or duplicated.
const PAGE_SIZE = 1000;

async function fetchAllRows<T>(
    table: string,
    tiebreaker: string,
): Promise<T[]> {
    const rows: T[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
            .from(table)
            .select("*")
            .order("date", { ascending: false })
            .order(tiebreaker, { ascending: true })
            .range(from, from + PAGE_SIZE - 1);
        if (error) throw new Error(error.message);
        rows.push(...((data ?? []) as T[]));
        if (!data || data.length < PAGE_SIZE) return rows;
    }
}

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

/** Load everything, or null if the settings row doesn't exist. */
export async function fetchSettings(): Promise<Settings | null> {
    const [
        settingsRow,
        ingredients,
        batchLines,
        menuItems,
        variants,
        recipeLines,
        transactions,
        events,
        marketClassifications,
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
        fetchAllRows<TransactionRow>("transactions", "id"),
        fetchAllRows<EventRow>("events", "market"),
        supabase
            .from("market_classifications")
            .select("*")
            .then(unwrap<MarketClassificationRow[]>),
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
        events,
        marketClassifications,
    };
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

    if (changeSet.events) {
        if (changeSet.events.upserts.length > 0) {
            unwrap(
                await supabase
                    .from("events")
                    .upsert(changeSet.events.upserts, {
                        onConflict: "date,market",
                    }),
            );
        }
        for (const key of changeSet.events.deletes) {
            unwrap(
                await supabase
                    .from("events")
                    .delete()
                    .eq("date", key.date)
                    .eq("market", key.market),
            );
        }
    }

    if (changeSet.marketClassifications) {
        unwrap(
            await supabase
                .from("market_classifications")
                .upsert(changeSet.marketClassifications),
        );
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

