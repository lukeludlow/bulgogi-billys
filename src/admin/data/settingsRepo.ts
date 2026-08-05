// Supabase reads/writes for the dashboard. Statements run sequentially in
// FK-safe order (parents before children, deletes after the child rewrite).
// Not transactional over PostgREST — a mid-save failure leaves a partial
// config until the caller's retry succeeds, which the tiny data size makes
// acceptable.

import { supabase } from "@/admin/data/supabase.ts";
import { fetchAllRows, unwrap } from "@/admin/data/postgrest.ts";
import type { Settings } from "@/admin/domain/types.ts";
import type { ChangeSet } from "./diff.ts";
import {
    rowsToSettings,
    type BatchLineRow,
    type DbSnapshot,
    type EventRow,
    type IngredientRow,
    type MarketOverrideRow,
    type MarketSettingsRow,
    type MenuItemRow,
    type ProcessorFeeRow,
    type PurchaseRow,
    type RecipeLineRow,
    type SettingsRow,
    type TransactionRow,
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
        transactions,
        events,
        purchases,
        marketOverrides,
        processorFees,
        marketSettings,
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
        fetchAllRows<TransactionRow>("transactions", "date", "id"),
        fetchAllRows<EventRow>("events", "date", "market"),
        fetchAllRows<PurchaseRow>("purchases", "date", "id"),
        // One row per corrected day, growing without bound — paged like the
        // tables above. `date` is the primary key, so it needs no tiebreaker.
        fetchAllRows<MarketOverrideRow>("market_overrides", "date"),
        // Genuinely small tables (a handful of rows) — no paging needed.
        supabase
            .from("processor_fees")
            .select("*")
            .then(unwrap<ProcessorFeeRow[]>),
        supabase
            .from("market_settings")
            .select("*")
            .then(unwrap<MarketSettingsRow[]>),
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
        purchases,
        marketOverrides,
        processorFees,
        marketSettings,
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
                await supabase.from("events").upsert(changeSet.events.upserts, {
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

    if (changeSet.purchases) {
        if (changeSet.purchases.upserts.length > 0) {
            unwrap(
                await supabase
                    .from("purchases")
                    .upsert(changeSet.purchases.upserts, {
                        onConflict: "id",
                    }),
            );
        }
        if (changeSet.purchases.deletes.length > 0) {
            unwrap(
                await supabase
                    .from("purchases")
                    .delete()
                    .in("id", changeSet.purchases.deletes),
            );
        }
    }

    if (changeSet.marketOverrides) {
        if (changeSet.marketOverrides.upserts.length > 0) {
            unwrap(
                await supabase
                    .from("market_overrides")
                    .upsert(changeSet.marketOverrides.upserts, {
                        onConflict: "date",
                    }),
            );
        }
        if (changeSet.marketOverrides.deletes.length > 0) {
            unwrap(
                await supabase
                    .from("market_overrides")
                    .delete()
                    .in("date", changeSet.marketOverrides.deletes),
            );
        }
    }

    if (changeSet.processorFees) {
        if (changeSet.processorFees.upserts.length > 0) {
            unwrap(
                await supabase
                    .from("processor_fees")
                    .upsert(changeSet.processorFees.upserts, {
                        onConflict: "month",
                    }),
            );
        }
        if (changeSet.processorFees.deletes.length > 0) {
            unwrap(
                await supabase
                    .from("processor_fees")
                    .delete()
                    .in("month", changeSet.processorFees.deletes),
            );
        }
    }

    if (changeSet.marketSettings) {
        unwrap(
            await supabase
                .from("market_settings")
                .upsert(changeSet.marketSettings),
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
