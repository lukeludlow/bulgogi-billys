import { expect, test } from "vitest";
import {
    allCombinations,
    summaryStats,
    variantCost,
    variantMargin,
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
