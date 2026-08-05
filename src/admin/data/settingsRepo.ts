// Supabase reads and writes for the config document: six small selects in,
// one apply_config(jsonb) call out. The RPC rewrites all six tables inside a
// single Postgres transaction, so a failed save changes nothing at all — the
// sequential statements this replaced could leave a half-written config
// behind, most sharply between a child table's delete-all and its insert.

import { supabase } from "@/admin/data/supabase.ts";
import { unwrap } from "@/admin/data/postgrest.ts";
import type { Settings } from "@/admin/domain/types.ts";
import type { Json } from "./database.types.ts";
import type { ConfigPayload } from "./diff.ts";
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

/**
 * Persist the whole document. Rows absent from the payload are deleted by the
 * function, which is why nothing here has to track removals.
 */
export async function applyConfig(config: ConfigPayload): Promise<void> {
    // The generated Args type is Json; ConfigPayload is a set of concrete row
    // interfaces, which don't satisfy an index-signature type structurally.
    const { error } = await supabase.rpc("apply_config", {
        config: config as unknown as Json,
    });
    if (error) throw new Error(error.message);
}
