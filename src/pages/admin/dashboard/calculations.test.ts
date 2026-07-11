import { expect, test } from "vitest";
import {
    allCombinations,
    effectiveCostPerUnit,
    summaryStats,
    variantCost,
    variantMargin,
    weeklyStats,
} from "./calculations.ts";
import { PROTEIN_INGREDIENT_ID, type Ingredient, type Settings, type Variant } from "./types.ts";
import { DEFAULT_SETTINGS } from "./defaults.ts";

const ingredients: Ingredient[] = [
    { id: "beef", name: "Beef", unit: "lb", costPerUnit: 8 },
    { id: "pork", name: "Pork", unit: "lb", costPerUnit: 4 },
    { id: "cheese", name: "Cheese", unit: "oz", costPerUnit: 0.25 },
];

const variant: Variant = {
    id: "regular",
    label: "Regular",
    sellPrice: 10,
    recipe: [
        { ingredientId: PROTEIN_INGREDIENT_ID, amount: 0.5 },
        { ingredientId: "cheese", amount: 2 },
    ],
};

test("variantCost prices the protein sentinel with the selected protein", () => {
    // beef: 0.5 * 8 + 2 * 0.25 cheese + 0.25 packaging = 4 + 0.5 + 0.25
    expect(variantCost(variant, ingredients, "beef", 0.25)).toBeCloseTo(4.75);
    // pork: 0.5 * 4 + 0.5 + 0.25
    expect(variantCost(variant, ingredients, "pork", 0.25)).toBeCloseTo(2.75);
});

test("variantCost ignores unknown ingredient ids", () => {
    const withUnknown: Variant = {
        ...variant,
        recipe: [...variant.recipe, { ingredientId: "ghost", amount: 99 }],
    };
    expect(variantCost(withUnknown, ingredients, "beef", 0)).toBeCloseTo(4.5);
});

test("variantMargin derives profit, margin %, and food cost %", () => {
    const margin = variantMargin(variant, ingredients, "beef", 0.25);
    expect(margin.revenue).toBe(10);
    expect(margin.cost).toBeCloseTo(4.75);
    expect(margin.grossProfit).toBeCloseTo(5.25);
    expect(margin.marginPercent).toBeCloseTo(52.5);
    expect(margin.foodCostPercent).toBeCloseTo(47.5);
});

test("variantMargin is safe when the sell price is zero", () => {
    const free: Variant = { ...variant, sellPrice: 0 };
    const margin = variantMargin(free, ingredients, "beef", 0);
    expect(margin.marginPercent).toBe(0);
    expect(margin.foodCostPercent).toBe(0);
});

test("switching protein lowers cost and raises margin for the defaults", () => {
    const beef = summaryStats({ ...DEFAULT_SETTINGS, selectedProtein: "beef" });
    const pork = summaryStats({ ...DEFAULT_SETTINGS, selectedProtein: "pork" });
    expect(pork.avgMarginPercent).toBeGreaterThan(beef.avgMarginPercent);
});

test("allCombinations covers every item and size in the defaults", () => {
    const combos = allCombinations(DEFAULT_SETTINGS);
    // Fries (4) + Rice (4) + Tacos (2) = 10
    expect(combos).toHaveLength(10);
    expect(combos.every((c) => c.label.length > 0)).toBe(true);
});

test("effectiveCostPerUnit returns the direct cost by default", () => {
    const ingredient: Ingredient = {
        id: "x",
        name: "X",
        unit: "oz",
        costPerUnit: 0.5,
    };
    expect(effectiveCostPerUnit(ingredient)).toBe(0.5);
});

test("effectiveCostPerUnit derives cost from a batch's lines and yield", () => {
    const seoul: Ingredient = {
        id: "seoul",
        name: "Seoul sauce",
        unit: "oz",
        costPerUnit: 999, // ignored while pricing by batch
        pricing: "batch",
        batch: {
            yield: 80,
            lines: [
                { id: "a", name: "Soy", cost: 6 },
                { id: "b", name: "Sugar", cost: 3 },
                { id: "c", name: "Sesame", cost: 4 },
                { id: "d", name: "Aromatics", cost: 3 },
            ],
        },
    };
    // (6 + 3 + 4 + 3) / 80 = 0.20
    expect(effectiveCostPerUnit(seoul)).toBeCloseTo(0.2);
});

test("effectiveCostPerUnit falls back to direct cost for a zero-yield batch", () => {
    const ingredient: Ingredient = {
        id: "x",
        name: "X",
        unit: "oz",
        costPerUnit: 0.4,
        pricing: "batch",
        batch: { yield: 0, lines: [{ id: "a", name: "n", cost: 5 }] },
    };
    expect(effectiveCostPerUnit(ingredient)).toBe(0.4);
});

test("a batch-priced ingredient flows through variantCost", () => {
    const batchIngredients: Ingredient[] = [
        {
            id: "sauce",
            name: "Sauce",
            unit: "oz",
            costPerUnit: 0,
            pricing: "batch",
            batch: { yield: 10, lines: [{ id: "a", name: "n", cost: 20 }] }, // $2/oz
        },
    ];
    const sauced: Variant = {
        id: "v",
        label: "V",
        sellPrice: 10,
        recipe: [{ ingredientId: "sauce", amount: 2 }], // 2 oz * $2 = $4
    };
    expect(variantCost(sauced, batchIngredients, "beef", 0)).toBeCloseTo(4);
});

test("weeklyStats scales each combination by units sold and nets grocery spend", () => {
    const settings: Settings = {
        ...DEFAULT_SETTINGS,
        groceryWeeklySpend: 100,
        packagingCostPerOrder: 0,
        ingredients: [],
        items: [
            {
                id: "x",
                name: "Test",
                hasProtein: false,
                variants: [
                    {
                        id: "a",
                        label: "A",
                        sellPrice: 10,
                        recipe: [],
                        unitsSoldThisWeek: 3,
                    },
                    {
                        id: "b",
                        label: "B",
                        sellPrice: 5,
                        recipe: [],
                        unitsSoldThisWeek: 2,
                    },
                ],
            },
        ],
    };
    const stats = weeklyStats(settings);
    // 3 sold @ $10 + 2 sold @ $5 = $40 revenue, no cost => $40 gross profit
    expect(stats.unitsSold).toBe(5);
    expect(stats.revenue).toBeCloseTo(40);
    expect(stats.ingredientCost).toBeCloseTo(0);
    expect(stats.grossProfit).toBeCloseTo(40);
    expect(stats.net).toBeCloseTo(-60); // 40 - 100 grocery spend
    expect(stats.lines).toHaveLength(2);
});

test("summaryStats picks the highest and lowest margin combinations", () => {
    const settings: Settings = {
        ...DEFAULT_SETTINGS,
        items: [
            {
                id: "x",
                name: "Test",
                hasProtein: false,
                variants: [
                    { id: "cheap", label: "Cheap", sellPrice: 2, recipe: [] },
                    { id: "rich", label: "Rich", sellPrice: 20, recipe: [] },
                ],
            },
        ],
        packagingCostPerOrder: 1,
    };
    const stats = summaryStats(settings);
    expect(stats.best?.variantId).toBe("rich");
    expect(stats.worst?.variantId).toBe("cheap");
});
