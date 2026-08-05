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

    test("events and classifications survive the round-trip", () => {
        const settings: Settings = {
            ...DEFAULT_SETTINGS,
            events: [
                {
                    date: "2026-07-25",
                    market: "grogans-mill",
                    marketFee: 20,
                    waste: 12,
                    employeeHours: 4.5,
                    billysHours: 7,
                },
            ],
            marketClassifications: {
                ...DEFAULT_SETTINGS.marketClassifications,
                "grogans-mill": "core",
            },
        };
        const back = normalize(settings);
        expect(back.events).toEqual(settings.events);
        expect(back.marketClassifications["grogans-mill"]).toBe("core");
        expect(back.marketClassifications["new-caney"]).toBeNull();
        expect(back.employeeHourlyRate).toBe(settings.employeeHourlyRate);
        expect(back.salesTaxRatePercent).toBe(settings.salesTaxRatePercent);
    });

    test("purchases, overrides, fees, and per-market rates survive the round-trip", () => {
        const settings: Settings = {
            ...DEFAULT_SETTINGS,
            purchases: [
                {
                    id: "p1",
                    date: "2026-07-20",
                    category: "propane",
                    amount: 30,
                    note: "refill",
                },
                { id: "p2", date: "2026-07-22", category: "ice", amount: 6 },
            ],
            marketOverrides: { "2026-07-25": "new-caney" },
            processorFees: [{ month: "2026-07", amount: 84.5 }],
            marketHourlyRates: {
                ...DEFAULT_SETTINGS.marketHourlyRates,
                "grogans-mill": 15,
            },
        };
        const back = normalize(settings);
        expect(back.purchases).toEqual(settings.purchases);
        expect(back.marketOverrides).toEqual(settings.marketOverrides);
        expect(back.processorFees).toEqual(settings.processorFees);
        expect(back.marketHourlyRates).toEqual(settings.marketHourlyRates);
    });

    test("purchase note maps between undefined and null", () => {
        const settings: Settings = {
            ...DEFAULT_SETTINGS,
            purchases: [
                { id: "p1", date: "2026-07-20", category: "fuel", amount: 40 },
            ],
        };
        const snapshot = settingsToRows(settings);
        expect(snapshot.purchases[0].note).toBeNull();
        const back = rowsToSettings(snapshot).purchases[0];
        expect("note" in back).toBe(false);
    });

    test("missing market_settings rows synthesize all-null records", () => {
        // An existing database migrated before any classification was chosen
        // has an empty market_settings table.
        const snapshot = settingsToRows(DEFAULT_SETTINGS);
        snapshot.marketSettings = [];
        const settings = rowsToSettings(snapshot);
        expect(settings.marketClassifications).toEqual({
            "grogans-mill": null,
            "new-caney": null,
            "fm-1488": null,
            other: null,
        });
        expect(settings.marketHourlyRates).toEqual({
            "grogans-mill": null,
            "new-caney": null,
            "fm-1488": null,
            other: null,
        });
    });

    test("purchase rows are emitted sorted by date+id for stable diffs", () => {
        const purchase = (id: string, date: string) => ({
            id,
            date,
            category: "fuel" as const,
            amount: 10,
        });
        const a: Settings = {
            ...DEFAULT_SETTINGS,
            purchases: [
                purchase("b", "2026-07-25"),
                purchase("a", "2026-07-20"),
            ],
        };
        const b: Settings = {
            ...DEFAULT_SETTINGS,
            purchases: [
                purchase("a", "2026-07-20"),
                purchase("b", "2026-07-25"),
            ],
        };
        expect(settingsToRows(a).purchases).toEqual(
            settingsToRows(b).purchases,
        );
    });

    test("event rows are emitted sorted by date+market for stable diffs", () => {
        const event = (date: string, market: "grogans-mill" | "other") => ({
            date,
            market,
            marketFee: 0,
            waste: 0,
            employeeHours: 0,
            billysHours: 0,
        });
        const a: Settings = {
            ...DEFAULT_SETTINGS,
            events: [
                event("2026-07-25", "grogans-mill"),
                event("2026-07-20", "other"),
            ],
        };
        const b: Settings = {
            ...DEFAULT_SETTINGS,
            events: [
                event("2026-07-20", "other"),
                event("2026-07-25", "grogans-mill"),
            ],
        };
        expect(settingsToRows(a).events).toEqual(settingsToRows(b).events);
    });

    test("out-of-range enum values are rejected at the rows boundary", () => {
        // The generated row types leave check-constrained columns as plain
        // strings; rowsToSettings must fail loudly on drift, not mistype it.
        const withBadUnit = settingsToRows(DEFAULT_SETTINGS);
        withBadUnit.ingredients[0].unit = "stone";
        expect(() => rowsToSettings(withBadUnit)).toThrow(
            "Unexpected ingredient unit: stone",
        );

        const withBadMarket = settingsToRows(DEFAULT_SETTINGS);
        withBadMarket.events = [
            {
                date: "2026-07-25",
                market: "narnia",
                market_fee: 0,
                waste: 0,
                employee_hours: 0,
                billys_hours: 0,
            },
        ];
        expect(() => rowsToSettings(withBadMarket)).toThrow(
            "Unexpected event market: narnia",
        );

        const withBadOverride = settingsToRows(DEFAULT_SETTINGS);
        withBadOverride.marketOverrides = [
            { date: "2026-07-25", market: "narnia" },
        ];
        expect(() => rowsToSettings(withBadOverride)).toThrow(
            "Unexpected market override market: narnia",
        );
    });

    test("unknown markets in market_settings are skipped, not rejected", () => {
        // A row left behind by a removed market must not brick the load.
        const snapshot = settingsToRows(DEFAULT_SETTINGS);
        snapshot.marketSettings = [
            {
                market: "narnia",
                classification: "core",
                employee_hourly_rate: 12,
            },
        ];
        const settings = rowsToSettings(snapshot);
        expect(settings.marketClassifications["grogans-mill"]).toBeNull();
        expect(Object.keys(settings.marketClassifications)).not.toContain(
            "narnia",
        );
    });
});
