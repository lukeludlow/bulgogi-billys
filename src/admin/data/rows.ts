// Pure mapping between the app's nested Settings object and the flat,
// snake_case rows stored in Supabase. `position` columns preserve the UI
// order of every list; composite keys carry the parent ids.

import {
    MARKET_CLASSIFICATIONS,
    MARKETS,
    PROTEINS,
    UNITS,
    type Ingredient,
    type Market,
    type MarketClassification,
    type MarketEvent,
    type MenuItem,
    type Settings,
} from "@/admin/domain/types.ts";
import { oneOf, type Row } from "./schema.ts";

// `updated_at` is DB-managed (default + trigger); the write path must never
// send it, so the app-facing settings row omits it.
export type SettingsRow = Omit<Row<"settings">, "updated_at">;
export type IngredientRow = Row<"ingredients">;
export type BatchLineRow = Row<"batch_lines">;
export type MenuItemRow = Row<"menu_items">;
export type VariantRow = Row<"variants">;
export type RecipeLineRow = Row<"recipe_lines">;
export type EventRow = Row<"events">;
export type MarketOverrideRow = Row<"market_overrides">;
export type MarketSettingsRow = Row<"market_settings">;

/** How an ingredient's per-unit cost is set; mirrors the DB check constraint. */
const PRICING_MODES = ["direct", "batch"] as const;

export interface DbSnapshot {
    settings: SettingsRow;
    ingredients: IngredientRow[];
    batchLines: BatchLineRow[];
    menuItems: MenuItemRow[];
    variants: VariantRow[];
    recipeLines: RecipeLineRow[];
    events: EventRow[];
    marketOverrides: MarketOverrideRow[];
    marketSettings: MarketSettingsRow[];
}

export function settingsToRows(settings: Settings): DbSnapshot {
    const batchLines: BatchLineRow[] = [];
    const ingredients = settings.ingredients.map((ingredient, position) => {
        for (const [index, line] of (ingredient.batch?.lines ?? []).entries()) {
            batchLines.push({
                ingredient_id: ingredient.id,
                id: line.id,
                name: line.name,
                cost: line.cost,
                position: index,
            });
        }
        return {
            id: ingredient.id,
            name: ingredient.name,
            unit: ingredient.unit,
            cost_per_unit: ingredient.costPerUnit,
            pricing: ingredient.pricing ?? "direct",
            batch_yield: ingredient.batch?.yield ?? null,
            position,
        } satisfies IngredientRow;
    });

    const variants: VariantRow[] = [];
    const recipeLines: RecipeLineRow[] = [];
    const menuItems = settings.items.map((item, position) => {
        for (const [variantIndex, variant] of item.variants.entries()) {
            variants.push({
                item_id: item.id,
                id: variant.id,
                label: variant.label,
                sell_price: variant.sellPrice,
                units_sold_this_week: variant.unitsSoldThisWeek ?? 0,
                position: variantIndex,
            });
            for (const [lineIndex, line] of variant.recipe.entries()) {
                recipeLines.push({
                    item_id: item.id,
                    variant_id: variant.id,
                    ingredient_id: line.ingredientId,
                    amount: line.amount,
                    position: lineIndex,
                });
            }
        }
        return {
            id: item.id,
            name: item.name,
            has_protein: item.hasProtein,
            position,
        } satisfies MenuItemRow;
    });

    return {
        settings: {
            id: 1,
            selected_protein: settings.selectedProtein,
            grocery_weekly_spend: settings.groceryWeeklySpend,
            packaging_cost_per_order: settings.packagingCostPerOrder,
            blended_food_cost_percent: settings.blendedFoodCostPercent,
            employee_hourly_rate: settings.employeeHourlyRate,
            sales_tax_rate_percent: settings.salesTaxRatePercent,
        },
        ingredients,
        batchLines,
        menuItems,
        variants,
        recipeLines,
        // Sorted so both sides of a diff serialize identically regardless of
        // the order the UI happened to append rows in.
        events: [...settings.events]
            .sort((a, b) =>
                `${a.date} ${a.market}`.localeCompare(`${b.date} ${b.market}`),
            )
            .map(eventToRow),
        marketOverrides: Object.entries(settings.marketOverrides)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, market]) => ({ date, market })),
        marketSettings: MARKETS.map((market) => ({
            market,
            classification: settings.marketClassifications[market],
            employee_hourly_rate: settings.marketHourlyRates[market],
        })),
    };
}

export function eventToRow(event: MarketEvent): EventRow {
    return {
        date: event.date,
        market: event.market,
        market_fee: event.marketFee,
        waste: event.waste,
        employee_hours: event.employeeHours,
        billys_hours: event.billysHours,
    };
}

function byPosition<T extends { position: number }>(a: T, b: T): number {
    return a.position - b.position;
}

export function rowsToSettings(snapshot: DbSnapshot): Settings {
    const ingredients: Ingredient[] = [...snapshot.ingredients]
        .sort(byPosition)
        .map((row) => {
            const lines = snapshot.batchLines
                .filter((line) => line.ingredient_id === row.id)
                .sort(byPosition)
                .map((line) => ({
                    id: line.id,
                    name: line.name,
                    cost: line.cost,
                }));
            const ingredient: Ingredient = {
                id: row.id,
                name: row.name,
                unit: oneOf(row.unit, UNITS, "ingredient unit"),
                costPerUnit: row.cost_per_unit,
                pricing: oneOf(
                    row.pricing,
                    PRICING_MODES,
                    "ingredient pricing",
                ),
            };
            if (row.pricing === "batch") {
                ingredient.batch = { yield: row.batch_yield ?? 0, lines };
            }
            return ingredient;
        });

    const items: MenuItem[] = [...snapshot.menuItems]
        .sort(byPosition)
        .map((itemRow) => ({
            id: itemRow.id,
            name: itemRow.name,
            hasProtein: itemRow.has_protein,
            variants: snapshot.variants
                .filter((variant) => variant.item_id === itemRow.id)
                .sort(byPosition)
                .map((variant) => ({
                    id: variant.id,
                    label: variant.label,
                    sellPrice: variant.sell_price,
                    unitsSoldThisWeek: variant.units_sold_this_week,
                    recipe: snapshot.recipeLines
                        .filter(
                            (line) =>
                                line.item_id === itemRow.id &&
                                line.variant_id === variant.id,
                        )
                        .sort(byPosition)
                        .map((line) => ({
                            ingredientId: line.ingredient_id,
                            amount: line.amount,
                        })),
                })),
        }));

    const events: MarketEvent[] = [...snapshot.events]
        .sort((a, b) =>
            `${b.date} ${b.market}`.localeCompare(`${a.date} ${a.market}`),
        )
        .map((row) => ({
            date: row.date,
            market: oneOf(row.market, MARKETS, "event market"),
            marketFee: row.market_fee,
            waste: row.waste,
            employeeHours: row.employee_hours,
            billysHours: row.billys_hours,
        }));

    const marketOverrides: Record<string, Market> = {};
    for (const row of snapshot.marketOverrides) {
        marketOverrides[row.date] = oneOf(
            row.market,
            MARKETS,
            "market override market",
        );
    }

    // Start from all-null so markets with no stored row (e.g. a database
    // migrated before any classification was chosen) are still present.
    const marketClassifications = Object.fromEntries(
        MARKETS.map((market) => [market, null]),
    ) as Record<Market, MarketClassification | null>;
    const marketHourlyRates = Object.fromEntries(
        MARKETS.map((market) => [market, null]),
    ) as Record<Market, number | null>;
    // Unknown markets are skipped, not rejected — a row left behind by an old
    // market must not brick the whole load.
    for (const row of snapshot.marketSettings) {
        if (!(MARKETS as readonly string[]).includes(row.market)) continue;
        const market = oneOf(row.market, MARKETS, "market settings market");
        marketClassifications[market] =
            row.classification === null
                ? null
                : oneOf(
                      row.classification,
                      MARKET_CLASSIFICATIONS,
                      "market classification",
                  );
        marketHourlyRates[market] = row.employee_hourly_rate;
    }

    return {
        selectedProtein: oneOf(
            snapshot.settings.selected_protein,
            PROTEINS,
            "selected protein",
        ),
        ingredients,
        items,
        groceryWeeklySpend: snapshot.settings.grocery_weekly_spend,
        packagingCostPerOrder: snapshot.settings.packaging_cost_per_order,
        blendedFoodCostPercent: snapshot.settings.blended_food_cost_percent,
        events,
        marketOverrides,
        marketClassifications,
        employeeHourlyRate: snapshot.settings.employee_hourly_rate,
        salesTaxRatePercent: snapshot.settings.sales_tax_rate_percent,
        marketHourlyRates,
    };
}
