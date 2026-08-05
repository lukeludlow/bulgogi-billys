import { expect, test } from "vitest";
import {
    addBatchLine,
    newId,
    removeBatchLine,
    updateBatchLine,
    updateBatchYield,
    updateIngredient,
    updateRecipe,
    updateVariant,
} from "./settingsMutations.ts";
import type { Ingredient, MenuItem, Settings } from "@/admin/domain/types.ts";

function ingredient(id: string, fields: Partial<Ingredient> = {}): Ingredient {
    return { id, name: id, unit: "lb", costPerUnit: 1, ...fields };
}

function settings(
    ingredients: Ingredient[] = [ingredient("beef"), ingredient("sriracha")],
    items: MenuItem[] = [
        {
            id: "fries",
            name: "Bulgogi Fries",
            hasProtein: true,
            variants: [
                {
                    id: "small",
                    label: "Small",
                    sellPrice: 7,
                    recipe: [{ ingredientId: "beef", amount: 0.15 }],
                },
                { id: "large", label: "Large", sellPrice: 12, recipe: [] },
            ],
        },
        {
            id: "tacos",
            name: "Tacos",
            hasProtein: true,
            // Variant ids repeat across items — a mutator that matched on
            // variant id alone would hit this one too.
            variants: [{ id: "small", label: "One", sellPrice: 4, recipe: [] }],
        },
    ],
): Settings {
    return {
        selectedProtein: "beef",
        ingredients,
        items,
        groceryWeeklySpend: 300,
        packagingCostPerOrder: 0.5,
        blendedFoodCostPercent: 32,
        employeeHourlyRate: 15,
        salesTaxRatePercent: 8.25,
    };
}

test("newId returns distinct ids", () => {
    expect(newId()).not.toBe(newId());
});

test("updateIngredient patches only the named ingredient", () => {
    const next = updateIngredient(settings(), "sriracha", { costPerUnit: 9 });

    expect(next.ingredients.map((i) => i.costPerUnit)).toEqual([1, 9]);
});

test("updateIngredient leaves the previous settings untouched", () => {
    const before = settings();
    const next = updateIngredient(before, "beef", { costPerUnit: 42 });

    expect(before.ingredients[0].costPerUnit).toBe(1);
    expect(next).not.toBe(before);
});

test("switching to batch pricing seeds a batch matching the typed cost", () => {
    const before = settings([ingredient("sriracha", { costPerUnit: 6 })]);
    const next = updateIngredient(before, "sriracha", { pricing: "batch" });

    // yield 1 with one line at the old cost means the derived per-unit cost
    // starts out identical to what was already there.
    expect(next.ingredients[0].batch).toMatchObject({
        yield: 1,
        lines: [{ name: "", cost: 6 }],
    });
    expect(next.ingredients[0].batch?.lines[0].id).toBeTruthy();
});

test("the seeded batch falls back to zero when no cost was typed", () => {
    const before = settings([ingredient("new", { costPerUnit: 0 })]);
    const next = updateIngredient(before, "new", { pricing: "batch" });

    expect(next.ingredients[0].batch?.lines[0].cost).toBe(0);
});

test("switching back to batch keeps an existing batch rather than reseeding", () => {
    const existing = {
        yield: 4,
        lines: [{ id: "line-1", name: "Bottle", cost: 5 }],
    };
    const before = settings([
        ingredient("seoul", { pricing: "direct", batch: existing }),
    ]);
    const next = updateIngredient(before, "seoul", { pricing: "batch" });

    expect(next.ingredients[0].batch).toEqual(existing);
});

test("updateBatchYield works on an ingredient that has no batch yet", () => {
    const next = updateBatchYield(settings(), "beef", 3);

    expect(next.ingredients[0].batch).toEqual({ yield: 3, lines: [] });
});

test("updateBatchLine patches the named line only", () => {
    const before = settings([
        ingredient("seoul", {
            pricing: "batch",
            batch: {
                yield: 2,
                lines: [
                    { id: "a", name: "Soy", cost: 4 },
                    { id: "b", name: "Sugar", cost: 2 },
                ],
            },
        }),
    ]);

    const next = updateBatchLine(before, "seoul", "b", { cost: 7 });

    expect(next.ingredients[0].batch?.lines).toEqual([
        { id: "a", name: "Soy", cost: 4 },
        { id: "b", name: "Sugar", cost: 7 },
    ]);
});

test("addBatchLine appends a blank line and removeBatchLine drops it", () => {
    const before = settings([
        ingredient("seoul", {
            pricing: "batch",
            batch: { yield: 2, lines: [{ id: "a", name: "Soy", cost: 4 }] },
        }),
    ]);

    const added = addBatchLine(before, "seoul");
    const lines = added.ingredients[0].batch!.lines;
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatchObject({ name: "", cost: 0 });

    const removed = removeBatchLine(added, "seoul", lines[1].id);
    expect(removed.ingredients[0].batch?.lines).toEqual([
        { id: "a", name: "Soy", cost: 4 },
    ]);
});

test("removeBatchLine ignores a line id that isn't there", () => {
    const before = settings([
        ingredient("seoul", {
            pricing: "batch",
            batch: { yield: 2, lines: [{ id: "a", name: "Soy", cost: 4 }] },
        }),
    ]);

    expect(
        removeBatchLine(before, "seoul", "nope").ingredients[0].batch,
    ).toEqual(before.ingredients[0].batch);
});

test("updateVariant patches one variant of one item", () => {
    const next = updateVariant(settings(), "fries", "small", { sellPrice: 9 });

    expect(next.items[0].variants[0].sellPrice).toBe(9);
    expect(next.items[0].variants[1].sellPrice).toBe(12);
    // The taco variant shares the id "small" and must not move.
    expect(next.items[1].variants[0].sellPrice).toBe(4);
});

test("updateVariant records weekly units sold", () => {
    const next = updateVariant(settings(), "fries", "large", {
        unitsSoldThisWeek: 6,
    });

    expect(next.items[0].variants[1].unitsSoldThisWeek).toBe(6);
});

test("updateRecipe edits an amount the variant already had", () => {
    const next = updateRecipe(settings(), "fries", "small", "beef", 0.5);

    expect(next.items[0].variants[0].recipe).toEqual([
        { ingredientId: "beef", amount: 0.5 },
    ]);
});

test("updateRecipe adds a line for an ingredient the variant lacked", () => {
    const next = updateRecipe(settings(), "fries", "large", "sriracha", 2);

    expect(next.items[0].variants[1].recipe).toEqual([
        { ingredientId: "sriracha", amount: 2 },
    ]);
});

test("updateRecipe leaves the other item's identically-named variant alone", () => {
    const next = updateRecipe(settings(), "fries", "small", "beef", 0.5);

    expect(next.items[1].variants[0].recipe).toEqual([]);
});
