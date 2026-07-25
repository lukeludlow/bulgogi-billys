import { afterEach, beforeEach, expect, test } from "vitest";
import { loadSettings, resetSettings, saveSettings } from "./storage.ts";
import { DEFAULT_SETTINGS } from "./defaults.ts";

const STORAGE_KEY = "bb_admin_settings";

// Clear before and after so a save leaked from another suite in the same
// browser origin can't turn a "nothing stored" assertion into a migration.
beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
});

afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
});

test("loadSettings returns the defaults when nothing is stored", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
});

test("saveSettings + loadSettings round-trips customized values", () => {
    const customized = {
        ...DEFAULT_SETTINGS,
        packagingCostPerOrder: 0.99,
        selectedProtein: "pork" as const,
    };
    saveSettings(customized);
    const loaded = loadSettings();
    expect(loaded.packagingCostPerOrder).toBe(0.99);
    expect(loaded.selectedProtein).toBe("pork");
});

test("loadSettings migrates a v1 payload instead of discarding it", () => {
    // A pre-batch / pre-weekly-sales save: version 1, ingredients without a
    // `pricing` field, variants without `unitsSoldThisWeek`.
    const v1 = {
        version: 1,
        selectedProtein: "pork",
        groceryWeeklySpend: 321,
        packagingCostPerOrder: 0.33,
        ingredients: [
            { id: "beef", name: "Beef", unit: "lb", costPerUnit: 9 },
        ],
        items: [
            {
                id: "fries",
                name: "Bulgogi Fries",
                hasProtein: true,
                variants: [
                    {
                        id: "small",
                        label: "Small",
                        sellPrice: 8,
                        recipe: [{ ingredientId: "beef", amount: 0.2 }],
                    },
                ],
            },
        ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1));

    const loaded = loadSettings();
    // Customizations survive.
    expect(loaded.selectedProtein).toBe("pork");
    expect(loaded.groceryWeeklySpend).toBe(321);
    expect(loaded.ingredients[0].costPerUnit).toBe(9);
    // New fields are filled in and the version is bumped to the latest.
    expect(loaded.version).toBe(3);
    expect(loaded.ingredients[0].pricing).toBe("direct");
    expect(loaded.items[0].variants[0].unitsSoldThisWeek).toBe(0);
    // v3 fields default in.
    expect(loaded.transactions).toEqual([]);
    expect(loaded.blendedFoodCostPercent).toBe(32);
});

test("loadSettings migrates a v2 payload, defaulting the sales fields", () => {
    // A pre-sales-import save: has ingredients/items but no transactions or
    // blended food-cost percentage.
    const v2 = {
        ...DEFAULT_SETTINGS,
        version: 2,
        blendedFoodCostPercent: undefined,
    } as unknown as Record<string, unknown>;
    delete v2.transactions;
    delete v2.blendedFoodCostPercent;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v2));

    const loaded = loadSettings();
    expect(loaded.version).toBe(3);
    expect(loaded.transactions).toEqual([]);
    expect(loaded.blendedFoodCostPercent).toBe(32);
});

test("loadSettings falls back to defaults for corrupt JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
});

test("resetSettings clears storage and returns fresh defaults", () => {
    saveSettings({ ...DEFAULT_SETTINGS, packagingCostPerOrder: 5 });
    const fresh = resetSettings();
    expect(fresh).toEqual(DEFAULT_SETTINGS);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
});
