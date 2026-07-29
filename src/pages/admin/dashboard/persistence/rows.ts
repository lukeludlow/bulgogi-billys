// Pure mapping between the app's nested Settings object and the flat,
// snake_case rows stored in Supabase. `position` columns preserve the UI
// order of every list; composite keys carry the parent ids.

import type { Ingredient, MenuItem, Settings, Transaction } from "../types.ts";

export interface SettingsRow {
    id: number;
    selected_protein: string;
    grocery_weekly_spend: number;
    packaging_cost_per_order: number;
    blended_food_cost_percent: number;
}

export interface IngredientRow {
    id: string;
    name: string;
    unit: string;
    cost_per_unit: number;
    pricing: "direct" | "batch";
    batch_yield: number | null;
    position: number;
}

export interface BatchLineRow {
    ingredient_id: string;
    id: string;
    name: string;
    cost: number;
    position: number;
}

export interface MenuItemRow {
    id: string;
    name: string;
    has_protein: boolean;
    position: number;
}

export interface VariantRow {
    item_id: string;
    id: string;
    label: string;
    sell_price: number;
    units_sold_this_week: number;
    position: number;
}

export interface RecipeLineRow {
    item_id: string;
    variant_id: string;
    ingredient_id: string;
    amount: number;
    position: number;
}

export interface TransactionRow {
    id: string;
    date: string;
    amount: number;
    type: string;
    result: string;
    method: string;
    brand: string | null;
}

export interface DbSnapshot {
    settings: SettingsRow;
    ingredients: IngredientRow[];
    batchLines: BatchLineRow[];
    menuItems: MenuItemRow[];
    variants: VariantRow[];
    recipeLines: RecipeLineRow[];
    transactions: TransactionRow[];
}

export function settingsToRows(settings: Settings): DbSnapshot {
    const batchLines: BatchLineRow[] = [];
    const ingredients = settings.ingredients.map((ingredient, position) => {
        for (const [index, line] of (
            ingredient.batch?.lines ?? []
        ).entries()) {
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
        },
        ingredients,
        batchLines,
        menuItems,
        variants,
        recipeLines,
        transactions: settings.transactions.map(transactionToRow),
    };
}

export function transactionToRow(transaction: Transaction): TransactionRow {
    return {
        id: transaction.id,
        // Normalized so a round-trip through timestamptz compares equal.
        date: new Date(transaction.date).toISOString(),
        amount: transaction.amount,
        type: transaction.type,
        result: transaction.result,
        method: transaction.method,
        brand: transaction.brand ?? null,
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
                unit: row.unit as Ingredient["unit"],
                costPerUnit: row.cost_per_unit,
                pricing: row.pricing,
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

    const transactions: Transaction[] = snapshot.transactions.map((row) => {
        const transaction: Transaction = {
            id: row.id,
            date: new Date(row.date).toISOString(),
            amount: row.amount,
            type: row.type,
            result: row.result,
            method: row.method,
        };
        if (row.brand !== null) transaction.brand = row.brand;
        return transaction;
    });

    return {
        selectedProtein: snapshot.settings
            .selected_protein as Settings["selectedProtein"],
        ingredients,
        items,
        groceryWeeklySpend: snapshot.settings.grocery_weekly_spend,
        packagingCostPerOrder: snapshot.settings.packaging_cost_per_order,
        transactions,
        blendedFoodCostPercent: snapshot.settings.blended_food_cost_percent,
    };
}
