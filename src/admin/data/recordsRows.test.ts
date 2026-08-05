import { describe, expect, test } from "vitest";
import { DEFAULT_RECORDS } from "@/test/fixtures/defaultSettings.ts";
import type { OperatingRecords } from "@/admin/domain/types.ts";
import { recordsToRows, rowsToRecords } from "./recordsRows.ts";

/** A full round-trip through the persistence shape. */
function normalize(records: OperatingRecords): OperatingRecords {
    return rowsToRecords(recordsToRows(records));
}

describe("recordsToRows / rowsToRecords", () => {
    test("purchases and fees survive the round-trip", () => {
        const records: OperatingRecords = {
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
        expect(() =>
            rowsToRecords({
                purchases: [
                    {
                        id: "p1",
                        date: "2026-07-20",
                        category: "beverages",
                        amount: 1,
                        note: null,
                    },
                ],
                processorFees: [],
            }),
        ).toThrow(/Unexpected purchase category: beverages/);
    });
});
