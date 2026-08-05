// Pure mapping between the app's nested Settings object and the flat,
// snake_case rows stored in Supabase. `position` columns preserve the UI
// order of every list; composite keys carry the parent ids.

import {
    PROTEINS,
    UNITS,
    type Ingredient,
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

/** How an ingredient's per-unit cost is set; mirrors the DB check constraint. */
const PRICING_MODES = ["direct", "batch"] as const;

export interface DbSnapshot {
    settings: SettingsRow;
    ingredients: IngredientRow[];
    batchLines: BatchLineRow[];
    menuItems: MenuItemRow[];
    variants: VariantRow[];
    recipeLines: RecipeLineRow[];
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
        employeeHourlyRate: snapshot.settings.employee_hourly_rate,
        salesTaxRatePercent: snapshot.settings.sales_tax_rate_percent,
    };
}
