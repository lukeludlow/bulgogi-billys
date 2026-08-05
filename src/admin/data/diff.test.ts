import { describe, expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "@/test/fixtures/defaultSettings.ts";
import type { MarketEvent, Settings } from "@/admin/domain/types.ts";
import { computeChangeSet, isEmptyChangeSet } from "./diff.ts";
import { rowsToSettings, settingsToRows } from "./rows.ts";

const BASE: Settings = rowsToSettings(settingsToRows(DEFAULT_SETTINGS));

function makeEvent(date: string, market: MarketEvent["market"]): MarketEvent {
    return {
        date,
        market,
        marketFee: 20,
        waste: 0,
        employeeHours: 0,
        billysHours: 0,
    };
}

const EVENTS_BASE: Settings = {
    ...BASE,
    events: [
        makeEvent("2026-07-11", "grogans-mill"),
        makeEvent("2026-07-18", "grogans-mill"),
        makeEvent("2026-07-19", "new-caney"),
    ],
};

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

    test("editing one event upserts exactly that row", () => {
        const next = structuredClone(EVENTS_BASE);
        next.events[1] = { ...next.events[1], waste: 15 };
        const changeSet = computeChangeSet(EVENTS_BASE, next);
        expect(changeSet.events?.upserts).toEqual([
            {
                date: "2026-07-18",
                market: "grogans-mill",
                market_fee: 20,
                waste: 15,
                employee_hours: 0,
                billys_hours: 0,
            },
        ]);
        expect(changeSet.events?.deletes).toEqual([]);
        expect(changeSet.settings).toBeUndefined();
        expect(changeSet.config).toBeUndefined();
    });

    test("adding an event upserts it; removing one deletes by key", () => {
        const next = structuredClone(EVENTS_BASE);
        next.events.push(makeEvent("2026-07-25", "grogans-mill"));
        next.events = next.events.filter(
            (event) => event.date !== "2026-07-19",
        );
        const changeSet = computeChangeSet(EVENTS_BASE, next);
        expect(changeSet.events?.upserts.map((row) => row.date)).toEqual([
            "2026-07-25",
        ]);
        expect(changeSet.events?.deletes).toEqual([
            { date: "2026-07-19", market: "new-caney" },
        ]);
    });

    test("untouched events emit no events slice", () => {
        const changeSet = computeChangeSet(
            EVENTS_BASE,
            structuredClone(EVENTS_BASE),
        );
        expect(isEmptyChangeSet(changeSet)).toBe(true);
    });

    test("a classification change rewrites the four-row set wholesale", () => {
        const next = structuredClone(BASE);
        next.marketClassifications["fm-1488"] = "probation";
        const changeSet = computeChangeSet(BASE, next);
        expect(changeSet.marketSettings).toEqual([
            {
                market: "grogans-mill",
                classification: null,
                employee_hourly_rate: null,
            },
            {
                market: "new-caney",
                classification: null,
                employee_hourly_rate: null,
            },
            {
                market: "fm-1488",
                classification: "probation",
                employee_hourly_rate: null,
            },
            {
                market: "other",
                classification: null,
                employee_hourly_rate: null,
            },
        ]);
        expect(isEmptyChangeSet(changeSet)).toBe(false);
        expect(changeSet.settings).toBeUndefined();
    });

    test("a per-market rate edit rides the marketSettings slice", () => {
        const next = structuredClone(BASE);
        next.marketHourlyRates["grogans-mill"] = 15;
        const changeSet = computeChangeSet(BASE, next);
        expect(
            changeSet.marketSettings?.find(
                (row) => row.market === "grogans-mill",
            )?.employee_hourly_rate,
        ).toBe(15);
        expect(changeSet.settings).toBeUndefined();
    });

    test("setting and clearing a market override upserts and deletes by date", () => {
        const withOverride = {
            ...BASE,
            marketOverrides: { "2026-07-25": "new-caney" as const },
        };
        const set = computeChangeSet(BASE, withOverride);
        expect(set.marketOverrides?.upserts).toEqual([
            { date: "2026-07-25", market: "new-caney" },
        ]);
        expect(set.marketOverrides?.deletes).toEqual([]);

        const cleared = computeChangeSet(withOverride, BASE);
        expect(cleared.marketOverrides?.upserts).toEqual([]);
        expect(cleared.marketOverrides?.deletes).toEqual(["2026-07-25"]);
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
