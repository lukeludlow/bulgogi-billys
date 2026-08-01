// Pure mapping between the app's nested Settings object and the flat,
// snake_case rows stored in Supabase. `position` columns preserve the UI
// order of every list; composite keys carry the parent ids.

import {
    MARKETS,
    type Ingredient,
    type Market,
    type MarketClassification,
    type MarketEvent,
    type MenuItem,
    type ProcessorFee,
    type Purchase,
    type PurchaseCategory,
    type Settings,
    type Transaction,
} from "../types.ts";

export interface SettingsRow {
    id: number;
    selected_protein: string;
    grocery_weekly_spend: number;
    packaging_cost_per_order: number;
    blended_food_cost_percent: number;
    employee_hourly_rate: number;
    sales_tax_rate_percent: number;
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

export interface EventRow {
    date: string;
    market: string;
    market_fee: number;
    waste: number;
    employee_hours: number;
    billys_hours: number;
}

export interface PurchaseRow {
    id: string;
    date: string;
    category: string;
    amount: number;
    note: string | null;
}

export interface MarketOverrideRow {
    date: string;
    market: string;
}

export interface ProcessorFeeRow {
    month: string;
    amount: number;
}

export interface MarketSettingsRow {
    market: string;
    classification: string | null;
    employee_hourly_rate: number | null;
}

export interface DbSnapshot {
    settings: SettingsRow;
    ingredients: IngredientRow[];
    batchLines: BatchLineRow[];
    menuItems: MenuItemRow[];
    variants: VariantRow[];
    recipeLines: RecipeLineRow[];
    transactions: TransactionRow[];
    events: EventRow[];
    purchases: PurchaseRow[];
    marketOverrides: MarketOverrideRow[];
    processorFees: ProcessorFeeRow[];
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
        transactions: settings.transactions.map(transactionToRow),
        // Sorted so both sides of a diff serialize identically regardless of
        // the order the UI happened to append rows in.
        events: [...settings.events]
            .sort((a, b) =>
                `${a.date} ${a.market}`.localeCompare(`${b.date} ${b.market}`),
            )
            .map(eventToRow),
        purchases: [...settings.purchases]
            .sort((a, b) =>
                `${a.date} ${a.id}`.localeCompare(`${b.date} ${b.id}`),
            )
            .map(purchaseToRow),
        marketOverrides: Object.entries(settings.marketOverrides)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, market]) => ({ date, market })),
        processorFees: [...settings.processorFees]
            .sort((a, b) => a.month.localeCompare(b.month))
            .map((fee) => ({ month: fee.month, amount: fee.amount })),
        marketSettings: MARKETS.map((market) => ({
            market,
            classification: settings.marketClassifications[market],
            employee_hourly_rate: settings.marketHourlyRates[market],
        })),
    };
}

export function purchaseToRow(purchase: Purchase): PurchaseRow {
    return {
        id: purchase.id,
        date: purchase.date,
        category: purchase.category,
        amount: purchase.amount,
        note: purchase.note ?? null,
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

    const events: MarketEvent[] = [...snapshot.events]
        .sort((a, b) =>
            `${b.date} ${b.market}`.localeCompare(`${a.date} ${a.market}`),
        )
        .map((row) => ({
            date: row.date,
            market: row.market as Market,
            marketFee: row.market_fee,
            waste: row.waste,
            employeeHours: row.employee_hours,
            billysHours: row.billys_hours,
        }));

    const purchases: Purchase[] = [...snapshot.purchases]
        .sort((a, b) => `${a.date} ${a.id}`.localeCompare(`${b.date} ${b.id}`))
        .map((row) => {
            const purchase: Purchase = {
                id: row.id,
                date: row.date,
                category: row.category as PurchaseCategory,
                amount: row.amount,
            };
            if (row.note !== null) purchase.note = row.note;
            return purchase;
        });

    const marketOverrides: Record<string, Market> = {};
    for (const row of snapshot.marketOverrides) {
        marketOverrides[row.date] = row.market as Market;
    }

    const processorFees: ProcessorFee[] = [...snapshot.processorFees]
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((row) => ({ month: row.month, amount: row.amount }));

    // Start from all-null so markets with no stored row (e.g. a database
    // migrated before any classification was chosen) are still present.
    const marketClassifications = Object.fromEntries(
        MARKETS.map((market) => [market, null]),
    ) as Record<Market, MarketClassification | null>;
    const marketHourlyRates = Object.fromEntries(
        MARKETS.map((market) => [market, null]),
    ) as Record<Market, number | null>;
    for (const row of snapshot.marketSettings) {
        if ((MARKETS as string[]).includes(row.market)) {
            marketClassifications[row.market as Market] =
                row.classification as MarketClassification | null;
            marketHourlyRates[row.market as Market] = row.employee_hourly_rate;
        }
    }

    return {
        selectedProtein: snapshot.settings
            .selected_protein as Settings["selectedProtein"],
        ingredients,
        items,
        groceryWeeklySpend: snapshot.settings.grocery_weekly_spend,
        packagingCostPerOrder: snapshot.settings.packaging_cost_per_order,
        transactions,
        blendedFoodCostPercent: snapshot.settings.blended_food_cost_percent,
        events,
        purchases,
        marketOverrides,
        processorFees,
        marketClassifications,
        employeeHourlyRate: snapshot.settings.employee_hourly_rate,
        salesTaxRatePercent: snapshot.settings.sales_tax_rate_percent,
        marketHourlyRates,
    };
}
