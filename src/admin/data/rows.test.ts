import { describe, expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "@/test/fixtures/defaultSettings.ts";
import { PROTEIN_INGREDIENT_ID, type Settings } from "@/admin/domain/types.ts";
import { rowsToSettings, settingsToRows } from "./rows.ts";

/** The canonical shape settings take after one trip through the mappers. */
function normalize(settings: Settings): Settings {
    return rowsToSettings(settingsToRows(settings));
}

describe("settingsToRows / rowsToSettings", () => {
    test("round-trip is lossless for the defaults", () => {
        const normalized = normalize(DEFAULT_SETTINGS);
        expect(normalize(normalized)).toEqual(normalized);

        // Semantics survive: same names, prices, and recipe contents.
        expect(normalized.ingredients.map((i) => i.name)).toEqual(
            DEFAULT_SETTINGS.ingredients.map((i) => i.name),
        );
        expect(normalized.items.map((i) => i.name)).toEqual(
            DEFAULT_SETTINGS.items.map((i) => i.name),
        );
        expect(normalized.items[0].variants.map((v) => v.sellPrice)).toEqual(
            DEFAULT_SETTINGS.items[0].variants.map((v) => v.sellPrice),
        );
        expect(normalized.items[0].variants[0].recipe).toEqual(
            DEFAULT_SETTINGS.items[0].variants[0].recipe,
        );
        expect(normalized.groceryWeeklySpend).toBe(
            DEFAULT_SETTINGS.groceryWeeklySpend,
        );
    });

    test("position columns restore order even when rows arrive shuffled", () => {
        const snapshot = settingsToRows(DEFAULT_SETTINGS);
        const shuffled = {
            ...snapshot,
            ingredients: [...snapshot.ingredients].reverse(),
            menuItems: [...snapshot.menuItems].reverse(),
            variants: [...snapshot.variants].reverse(),
            recipeLines: [...snapshot.recipeLines].reverse(),
            batchLines: [...snapshot.batchLines].reverse(),
        };
        expect(rowsToSettings(shuffled)).toEqual(rowsToSettings(snapshot));
    });

    test("sentinel protein recipe lines survive the round-trip", () => {
        const normalized = normalize(DEFAULT_SETTINGS);
        const friesSmall = normalized.items[0].variants[0];
        expect(
            friesSmall.recipe.some(
                (line) => line.ingredientId === PROTEIN_INGREDIENT_ID,
            ),
        ).toBe(true);
    });

    test("duplicate variant ids across items stay distinct", () => {
        const normalized = normalize(DEFAULT_SETTINGS);
        const fries = normalized.items.find((i) => i.id === "fries")!;
        const rice = normalized.items.find((i) => i.id === "rice")!;
        const friesSmall = fries.variants.find((v) => v.id === "small")!;
        const riceSmall = rice.variants.find((v) => v.id === "small")!;
        expect(friesSmall.recipe).not.toEqual(riceSmall.recipe);
        expect(friesSmall.recipe[0].ingredientId).toBe("fries");
        expect(riceSmall.recipe[0].ingredientId).toBe("rice");
    });

    test("batch ingredients keep their yield and lines; direct ones get no batch", () => {
        const normalized = normalize(DEFAULT_SETTINGS);
        const seoul = normalized.ingredients.find((i) => i.id === "seoul")!;
        expect(seoul.pricing).toBe("batch");
        expect(seoul.batch).toEqual(
            DEFAULT_SETTINGS.ingredients.find((i) => i.id === "seoul")!.batch,
        );
        const beef = normalized.ingredients.find((i) => i.id === "beef")!;
        expect(beef.pricing).toBe("direct");
        expect(beef.batch).toBeUndefined();
    });

    test("out-of-range enum values are rejected at the rows boundary", () => {
        // The generated row types leave check-constrained columns as plain
        // strings; rowsToSettings must fail loudly on drift, not mistype it.
        const withBadUnit = settingsToRows(DEFAULT_SETTINGS);
        withBadUnit.ingredients[0].unit = "stone";
        expect(() => rowsToSettings(withBadUnit)).toThrow(
            "Unexpected ingredient unit: stone",
        );
    });
});
