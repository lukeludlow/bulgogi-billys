import {
    PROTEIN_INGREDIENT_ID,
    type Combination,
    type Ingredient,
    type Protein,
    type Settings,
    type Variant,
} from "@/admin/domain/types.ts";

/** Compact item name for chart axes, e.g. "Bulgogi Fries" -> "Fries". */
function shortItemName(name: string): string {
    return name.replace(/^Bulgogi\s+/i, "");
}

function resolveIngredient(
    ingredientId: string,
    ingredients: Ingredient[],
    protein: Protein,
): Ingredient | undefined {
    const id = ingredientId === PROTEIN_INGREDIENT_ID ? protein : ingredientId;
    return ingredients.find((ingredient) => ingredient.id === id);
}

/**
 * The dollars-per-unit actually used to cost an ingredient. When priced by
 * batch, it's the batch's total line cost divided by its yield; otherwise it's
 * the directly-entered `costPerUnit`. Falls back to the direct cost if the
 * batch is empty or has a non-positive yield.
 */
export function effectiveCostPerUnit(ingredient: Ingredient): number {
    if (ingredient.pricing === "batch" && ingredient.batch) {
        const { yield: batchYield, lines } = ingredient.batch;
        if (batchYield > 0) {
            const total = lines.reduce(
                (sum, line) => sum + (line.cost || 0),
                0,
            );
            return total / batchYield;
        }
    }
    return ingredient.costPerUnit || 0;
}

/**
 * Total ingredient + packaging cost to make one order of `variant`, pricing the
 * protein sentinel with the currently selected protein.
 */
export function variantCost(
    variant: Variant,
    ingredients: Ingredient[],
    protein: Protein,
    packagingCostPerOrder: number,
): number {
    let cost = packagingCostPerOrder || 0;
    for (const line of variant.recipe) {
        const ingredient = resolveIngredient(
            line.ingredientId,
            ingredients,
            protein,
        );
        if (ingredient) cost += line.amount * effectiveCostPerUnit(ingredient);
    }
    return cost;
}

export interface Margin {
    revenue: number;
    cost: number;
    grossProfit: number;
    marginPercent: number;
    foodCostPercent: number;
}

export function variantMargin(
    variant: Variant,
    ingredients: Ingredient[],
    protein: Protein,
    packagingCostPerOrder: number,
): Margin {
    const revenue = variant.sellPrice || 0;
    const cost = variantCost(
        variant,
        ingredients,
        protein,
        packagingCostPerOrder,
    );
    const grossProfit = revenue - cost;
    const marginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const foodCostPercent = revenue > 0 ? (cost / revenue) * 100 : 0;
    return { revenue, cost, grossProfit, marginPercent, foodCostPercent };
}

/** Every item×size combination flattened, with its economics — for charts/tables. */
export function allCombinations(settings: Settings): Combination[] {
    const { ingredients, items, selectedProtein, packagingCostPerOrder } =
        settings;
    const combinations: Combination[] = [];
    for (const item of items) {
        for (const variant of item.variants) {
            const margin = variantMargin(
                variant,
                ingredients,
                selectedProtein,
                packagingCostPerOrder,
            );
            combinations.push({
                itemId: item.id,
                itemName: item.name,
                variantId: variant.id,
                variantLabel: variant.label,
                label: `${item.name} — ${variant.label}`,
                shortLabel: `${shortItemName(item.name)} · ${variant.label}`,
                unitsSoldThisWeek: variant.unitsSoldThisWeek || 0,
                ...margin,
            });
        }
    }
    return combinations;
}

export interface SummaryStats {
    best: Combination | null;
    worst: Combination | null;
    avgMarginPercent: number;
    avgFoodCostPercent: number;
    avgGrossProfit: number;
    /** Orders needed to cover the weekly grocery spend at the average gross profit. */
    breakEvenOrdersPerWeek: number | null;
}

export function summaryStats(settings: Settings): SummaryStats {
    const combinations = allCombinations(settings);
    if (combinations.length === 0) {
        return {
            best: null,
            worst: null,
            avgMarginPercent: 0,
            avgFoodCostPercent: 0,
            avgGrossProfit: 0,
            breakEvenOrdersPerWeek: null,
        };
    }

    let best = combinations[0];
    let worst = combinations[0];
    let marginSum = 0;
    let foodCostSum = 0;
    let grossProfitSum = 0;
    for (const combination of combinations) {
        if (combination.marginPercent > best.marginPercent) best = combination;
        if (combination.marginPercent < worst.marginPercent)
            worst = combination;
        marginSum += combination.marginPercent;
        foodCostSum += combination.foodCostPercent;
        grossProfitSum += combination.grossProfit;
    }

    const count = combinations.length;
    const avgGrossProfit = grossProfitSum / count;
    return {
        best,
        worst,
        avgMarginPercent: marginSum / count,
        avgFoodCostPercent: foodCostSum / count,
        avgGrossProfit,
        breakEvenOrdersPerWeek:
            avgGrossProfit > 0
                ? settings.groceryWeeklySpend / avgGrossProfit
                : null,
    };
}

/** One item×size's contribution to the week, weighted by units sold. */
export interface WeeklyLine {
    combination: Combination;
    unitsSold: number;
    revenue: number;
    ingredientCost: number;
    grossProfit: number;
}

export interface WeeklyStats {
    unitsSold: number;
    revenue: number;
    ingredientCost: number;
    grossProfit: number;
    /** Gross profit less the week's grocery spend. */
    net: number;
    lines: WeeklyLine[];
}

/**
 * Actual economics for the week, scaling each item×size's per-order numbers by
 * how many were sold. `net` subtracts the flat weekly grocery spend from the
 * summed gross profit.
 */
export function weeklyStats(settings: Settings): WeeklyStats {
    const lines: WeeklyLine[] = allCombinations(settings).map((combination) => {
        const unitsSold = combination.unitsSoldThisWeek;
        return {
            combination,
            unitsSold,
            revenue: combination.revenue * unitsSold,
            ingredientCost: combination.cost * unitsSold,
            grossProfit: combination.grossProfit * unitsSold,
        };
    });

    const totals = lines.reduce(
        (acc, line) => ({
            unitsSold: acc.unitsSold + line.unitsSold,
            revenue: acc.revenue + line.revenue,
            ingredientCost: acc.ingredientCost + line.ingredientCost,
            grossProfit: acc.grossProfit + line.grossProfit,
        }),
        { unitsSold: 0, revenue: 0, ingredientCost: 0, grossProfit: 0 },
    );

    return {
        ...totals,
        net: totals.grossProfit - (settings.groceryWeeklySpend || 0),
        lines,
    };
}
