// Supabase reads/writes for the config document. Statements run sequentially
// in FK-safe order (parents before children, deletes after the child rewrite).
// Not transactional over PostgREST — a mid-save failure leaves a partial
// config until the caller's retry succeeds, which the tiny data size makes
// acceptable.

import { supabase } from "@/admin/data/supabase.ts";
import { unwrap } from "@/admin/data/postgrest.ts";
import type { Settings } from "@/admin/domain/types.ts";
import type { ChangeSet } from "./diff.ts";
import {
    rowsToSettings,
    type BatchLineRow,
    type DbSnapshot,
    type IngredientRow,
    type MenuItemRow,
    type RecipeLineRow,
    type SettingsRow,
    type VariantRow,
} from "./rows.ts";

/** Load everything, or null if the settings row doesn't exist. */
export async function fetchSettings(): Promise<Settings | null> {
    const [
        settingsRow,
        ingredients,
        batchLines,
        menuItems,
        variants,
        recipeLines,
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
    ]);

    if (!settingsRow) return null;

    const snapshot: DbSnapshot = {
        settings: settingsRow,
        ingredients,
        batchLines,
        menuItems,
        variants,
        recipeLines,
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
}
