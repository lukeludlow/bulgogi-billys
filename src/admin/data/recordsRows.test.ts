import { describe, expect, test } from "vitest";
import { DEFAULT_RECORDS } from "@/test/fixtures/defaultSettings.ts";
import type { OperatingRecords } from "@/admin/domain/types.ts";
import { recordsToRows, rowsToRecords } from "./recordsRows.ts";

/** A full round-trip through the persistence shape. */
function normalize(records: OperatingRecords): OperatingRecords {
    return rowsToRecords(recordsToRows(records));
}

describe("recordsToRows / rowsToRecords", () => {
    test("events and classifications survive the round-trip", () => {
        const records: OperatingRecords = {
            ...DEFAULT_RECORDS,
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
            marketOverrides: { "2026-07-25": "new-caney" },
            marketClassifications: {
                ...DEFAULT_RECORDS.marketClassifications,
                "grogans-mill": "core",
            },
            marketHourlyRates: {
                ...DEFAULT_RECORDS.marketHourlyRates,
                "grogans-mill": 15,
            },
        };
        const back = normalize(records);
        expect(back.events).toEqual(records.events);
        expect(back.marketOverrides).toEqual(records.marketOverrides);
        expect(back.marketClassifications["grogans-mill"]).toBe("core");
        expect(back.marketClassifications["new-caney"]).toBeNull();
        expect(back.marketHourlyRates).toEqual(records.marketHourlyRates);
    });

    test("missing market_settings rows synthesize all-null records", () => {
        // An existing database migrated before any classification was chosen
        // has an empty market_settings table.
        const snapshot = recordsToRows(DEFAULT_RECORDS);
        snapshot.marketSettings = [];
        const records = rowsToRecords(snapshot);
        expect(records.marketClassifications).toEqual({
            "grogans-mill": null,
            "new-caney": null,
            "fm-1488": null,
            other: null,
        });
        expect(records.marketHourlyRates).toEqual({
            "grogans-mill": null,
            "new-caney": null,
            "fm-1488": null,
            other: null,
        });
    });

    test("unknown markets in market_settings are skipped, not rejected", () => {
        // A row left behind by a removed market must not brick the load.
        const snapshot = recordsToRows(DEFAULT_RECORDS);
        snapshot.marketSettings = [
            {
                market: "narnia",
                classification: "core",
                employee_hourly_rate: 12,
            },
        ];
        const records = rowsToRecords(snapshot);
        expect(records.marketClassifications["grogans-mill"]).toBeNull();
        expect(Object.keys(records.marketClassifications)).not.toContain(
            "narnia",
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
        const a: OperatingRecords = {
            ...DEFAULT_RECORDS,
            events: [
                event("2026-07-25", "grogans-mill"),
                event("2026-07-20", "other"),
            ],
        };
        const b: OperatingRecords = {
            ...DEFAULT_RECORDS,
            events: [
                event("2026-07-20", "other"),
                event("2026-07-25", "grogans-mill"),
            ],
        };
        expect(recordsToRows(a).events).toEqual(recordsToRows(b).events);
    });

    test("purchases and fees survive the round-trip", () => {
        const records: OperatingRecords = {
            ...DEFAULT_RECORDS,
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
            processorFees: [{ month: "2026-07", amount: 84.5 }],
        };
        const back = normalize(records);
        expect(back.purchases).toEqual(records.purchases);
        expect(back.processorFees).toEqual(records.processorFees);
    });

    test("purchase note maps between undefined and null", () => {
        const records: OperatingRecords = {
            ...DEFAULT_RECORDS,
            purchases: [
                { id: "p1", date: "2026-07-20", category: "fuel", amount: 40 },
            ],
        };
        const snapshot = recordsToRows(records);
        expect(snapshot.purchases[0].note).toBeNull();
        const back = rowsToRecords(snapshot).purchases[0];
        expect("note" in back).toBe(false);
    });

    test("purchase rows are emitted sorted by date+id for stable diffs", () => {
        const purchase = (id: string, date: string) => ({
            id,
            date,
            category: "fuel" as const,
            amount: 10,
        });
        const a: OperatingRecords = {
            ...DEFAULT_RECORDS,
            purchases: [
                purchase("b", "2026-07-25"),
                purchase("a", "2026-07-20"),
            ],
        };
        const b: OperatingRecords = {
            ...DEFAULT_RECORDS,
            purchases: [
                purchase("a", "2026-07-20"),
                purchase("b", "2026-07-25"),
            ],
        };
        expect(recordsToRows(a).purchases).toEqual(recordsToRows(b).purchases);
    });

    test("fee rows are emitted sorted by month for stable diffs", () => {
        const a: OperatingRecords = {
            ...DEFAULT_RECORDS,
            processorFees: [
                { month: "2026-08", amount: 2 },
                { month: "2026-07", amount: 1 },
            ],
        };
        const b: OperatingRecords = {
            ...DEFAULT_RECORDS,
            processorFees: [
                { month: "2026-07", amount: 1 },
                { month: "2026-08", amount: 2 },
            ],
        };
        expect(recordsToRows(a).processorFees).toEqual(
            recordsToRows(b).processorFees,
        );
    });

    test("out-of-range enum values are rejected at the rows boundary", () => {
        // The generated row types leave check-constrained columns as plain
        // strings; rowsToRecords must fail loudly on drift, not mistype it.
        const withBadCategory = recordsToRows(DEFAULT_RECORDS);
        withBadCategory.purchases = [
            {
                id: "p1",
                date: "2026-07-20",
                category: "beverages",
                amount: 1,
                note: null,
            },
        ];
        expect(() => rowsToRecords(withBadCategory)).toThrow(
            "Unexpected purchase category: beverages",
        );

        const withBadMarket = recordsToRows(DEFAULT_RECORDS);
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
        expect(() => rowsToRecords(withBadMarket)).toThrow(
            "Unexpected event market: narnia",
        );

        const withBadOverride = recordsToRows(DEFAULT_RECORDS);
        withBadOverride.marketOverrides = [
            { date: "2026-07-25", market: "narnia" },
        ];
        expect(() => rowsToRecords(withBadOverride)).toThrow(
            "Unexpected market override market: narnia",
        );
    });
});
