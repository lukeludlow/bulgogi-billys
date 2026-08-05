import { expect, test } from "vitest";
import { DEFAULT_RECORDS } from "@/test/fixtures/defaultSettings.ts";
import type { OperatingRecords, Purchase } from "@/admin/domain/types.ts";
import {
    computeRecordsChangeSet,
    isEmptyRecordsChangeSet,
} from "./recordsDiff.ts";

function makePurchase(id: string, amount = 25): Purchase {
    return { id, date: "2026-07-20", category: "propane", amount };
}

const BASE: OperatingRecords = DEFAULT_RECORDS;

test("identical records produce an empty change set", () => {
    const changeSet = computeRecordsChangeSet(BASE, structuredClone(BASE));
    expect(isEmptyRecordsChangeSet(changeSet)).toBe(true);
});

test("editing one purchase upserts exactly that row", () => {
    const prev = {
        ...BASE,
        purchases: [makePurchase("p1"), makePurchase("p2")],
    };
    const next = {
        ...prev,
        purchases: [makePurchase("p1"), makePurchase("p2", 40)],
    };
    const changeSet = computeRecordsChangeSet(prev, next);
    expect(changeSet.purchases?.upserts).toEqual([
        {
            id: "p2",
            date: "2026-07-20",
            category: "propane",
            amount: 40,
            note: null,
        },
    ]);
    expect(changeSet.purchases?.deletes).toEqual([]);
    expect(isEmptyRecordsChangeSet(changeSet)).toBe(false);
});

test("removing a purchase deletes by id", () => {
    const prev = {
        ...BASE,
        purchases: [makePurchase("p1"), makePurchase("p2")],
    };
    const next = { ...prev, purchases: [makePurchase("p1")] };
    const changeSet = computeRecordsChangeSet(prev, next);
    expect(changeSet.purchases?.upserts).toEqual([]);
    expect(changeSet.purchases?.deletes).toEqual(["p2"]);
});

test("processor fee edits upsert and delete by month", () => {
    const prev = {
        ...BASE,
        processorFees: [
            { month: "2026-06", amount: 70 },
            { month: "2026-07", amount: 80 },
        ],
    };
    const next = {
        ...prev,
        processorFees: [{ month: "2026-07", amount: 92 }],
    };
    const changeSet = computeRecordsChangeSet(prev, next);
    expect(changeSet.processorFees?.upserts).toEqual([
        { month: "2026-07", amount: 92 },
    ]);
    expect(changeSet.processorFees?.deletes).toEqual(["2026-06"]);
});

test("an untouched slice is omitted entirely", () => {
    const prev = { ...BASE, purchases: [makePurchase("p1")] };
    const next = {
        ...prev,
        processorFees: [{ month: "2026-07", amount: 5 }],
    };
    const changeSet = computeRecordsChangeSet(prev, next);
    expect(changeSet.purchases).toBeUndefined();
    expect(changeSet.processorFees?.upserts).toHaveLength(1);
});
