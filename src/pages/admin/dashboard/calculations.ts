import {
    PROTEIN_INGREDIENT_ID,
    type Combination,
    type Ingredient,
    type Protein,
    type Settings,
    type Variant,
} from "./types.ts";

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
        const ingredient = resolveIngredient(line.ingredientId, ingredients, protein);
        if (ingredient) cost += line.amount * ingredient.costPerUnit;
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
    const cost = variantCost(variant, ingredients, protein, packagingCostPerOrder);
    const grossProfit = revenue - cost;
    const marginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const foodCostPercent = revenue > 0 ? (cost / revenue) * 100 : 0;
    return { revenue, cost, grossProfit, marginPercent, foodCostPercent };
}

/** Every item×size combination flattened, with its economics — for charts/tables. */
export function allCombinations(settings: Settings): Combination[] {
    const { ingredients, items, selectedProtein, packagingCostPerOrder } = settings;
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
        if (combination.marginPercent < worst.marginPercent) worst = combination;
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
            avgGrossProfit > 0 ? settings.groceryWeeklySpend / avgGrossProfit : null,
    };
}

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(value);
}

export function formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
}
