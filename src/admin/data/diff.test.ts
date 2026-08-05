import { describe, expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "@/test/fixtures/defaultSettings.ts";
import type { Settings } from "@/admin/domain/types.ts";
import { computeChangeSet, isEmptyChangeSet } from "./diff.ts";
import { rowsToSettings, settingsToRows } from "./rows.ts";

const BASE: Settings = rowsToSettings(settingsToRows(DEFAULT_SETTINGS));

describe("computeChangeSet", () => {
    test("identical settings produce an empty change set", () => {
        const changeSet = computeChangeSet(BASE, structuredClone(BASE));
        expect(isEmptyChangeSet(changeSet)).toBe(true);
    });

    test("a scalar edit touches only the settings row", () => {
        const next = { ...BASE, groceryWeeklySpend: 500 };
        const changeSet = computeChangeSet(BASE, next);
        expect(changeSet.settings?.grocery_weekly_spend).toBe(500);
        expect(changeSet.config).toBeUndefined();
    });

    test("an ingredient edit emits the config block and nothing else", () => {
        const next = structuredClone(BASE);
        next.ingredients[0].costPerUnit = 8.5;
        const changeSet = computeChangeSet(BASE, next);
        expect(changeSet.config).toBeDefined();
        expect(changeSet.config?.ingredients[0].cost_per_unit).toBe(8.5);
        expect(changeSet.config?.ingredientDeletes).toEqual([]);
        expect(changeSet.settings).toBeUndefined();
    });

    test("a removed variant shows up in variantDeletes", () => {
        const next = structuredClone(BASE);
        const removed = next.items[0].variants.pop()!;
        const changeSet = computeChangeSet(BASE, next);
        expect(changeSet.config?.variantDeletes).toEqual([
            { itemId: next.items[0].id, id: removed.id },
        ]);
    });

    test("a removed ingredient shows up in ingredientDeletes", () => {
        const next = structuredClone(BASE);
        const removed = next.ingredients.pop()!;
        const changeSet = computeChangeSet(BASE, next);
        expect(changeSet.config?.ingredientDeletes).toEqual([removed.id]);
    });

    test("hourly rate and tax rate ride the settings row", () => {
        const next = {
            ...BASE,
            employeeHourlyRate: 15,
            salesTaxRatePercent: 6.25,
        };
        const changeSet = computeChangeSet(BASE, next);
        expect(changeSet.settings?.employee_hourly_rate).toBe(15);
        expect(changeSet.settings?.sales_tax_rate_percent).toBe(6.25);
    });
});
