import { describe, expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "@/test/fixtures/defaultSettings.ts";
import type { Settings } from "@/admin/domain/types.ts";
import {
    computeConfigChange,
    configPayload,
    isEmptyConfigChange,
} from "./diff.ts";
import { rowsToSettings, settingsToRows } from "./rows.ts";

const BASE: Settings = rowsToSettings(settingsToRows(DEFAULT_SETTINGS));

describe("configPayload", () => {
    test("is keyed by table name, which is what the RPC reads", () => {
        // apply_config looks up config->'batch_lines', not ->'batchLines'.
        expect(Object.keys(configPayload(BASE)).sort()).toEqual([
            "batch_lines",
            "ingredients",
            "menu_items",
            "recipe_lines",
            "settings",
            "variants",
        ]);
    });
});

describe("computeConfigChange", () => {
    test("identical settings produce no change", () => {
        const change = computeConfigChange(BASE, structuredClone(BASE));
        expect(change).toBeNull();
        expect(isEmptyConfigChange(change)).toBe(true);
    });

    test("a scalar edit sends the whole document", () => {
        const next = { ...BASE, groceryWeeklySpend: 500 };
        const change = computeConfigChange(BASE, next);
        expect(isEmptyConfigChange(change)).toBe(false);
        expect(change?.settings.grocery_weekly_spend).toBe(500);
        expect(change?.ingredients).toEqual(configPayload(BASE).ingredients);
    });

    test("an ingredient edit rides the same payload", () => {
        const next = structuredClone(BASE);
        next.ingredients[0].costPerUnit = 8.5;
        const change = computeConfigChange(BASE, next);
        expect(change?.ingredients[0].cost_per_unit).toBe(8.5);
    });

    test("a removed variant is simply absent from the payload", () => {
        // No delete list: apply_config drops whatever the payload omits.
        const next = structuredClone(BASE);
        const item = next.items[0];
        // Variant ids repeat across items, so both halves of the key matter.
        const removed = item.variants.pop()!;
        const change = computeConfigChange(BASE, next);
        expect(
            change?.variants.some(
                (row) => row.item_id === item.id && row.id === removed.id,
            ),
        ).toBeFalsy();
        expect(
            change?.recipe_lines.some(
                (row) =>
                    row.item_id === item.id && row.variant_id === removed.id,
            ),
        ).toBeFalsy();
    });

    test("a removed ingredient takes its batch lines out of the payload", () => {
        const next = structuredClone(BASE);
        const removed = next.ingredients.find((i) => i.batch)!;
        next.ingredients = next.ingredients.filter((i) => i.id !== removed.id);
        const change = computeConfigChange(BASE, next);
        expect(
            change?.ingredients.some((row) => row.id === removed.id),
        ).toBeFalsy();
        expect(
            change?.batch_lines.some((row) => row.ingredient_id === removed.id),
        ).toBeFalsy();
    });

    test("hourly rate and tax rate ride the settings row", () => {
        const next = {
            ...BASE,
            employeeHourlyRate: 15,
            salesTaxRatePercent: 6.25,
        };
        const change = computeConfigChange(BASE, next);
        expect(change?.settings.employee_hourly_rate).toBe(15);
        expect(change?.settings.sales_tax_rate_percent).toBe(6.25);
    });

    test("the reserve transfer rates ride the settings row", () => {
        const next = {
            ...BASE,
            emergencyReservePercent: 4,
            expansionFundPercent: 1,
        };
        const change = computeConfigChange(BASE, next);
        expect(change?.settings.emergency_reserve_percent).toBe(4);
        expect(change?.settings.expansion_fund_percent).toBe(1);
    });
});
