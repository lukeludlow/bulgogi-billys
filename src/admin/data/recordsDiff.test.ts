import { expect, test } from "vitest";
import { DEFAULT_RECORDS } from "@/test/fixtures/defaultSettings.ts";
import type {
    MarketEvent,
    OperatingRecords,
    Purchase,
} from "@/admin/domain/types.ts";
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

const EVENTS_BASE: OperatingRecords = {
    ...BASE,
    events: [
        makeEvent("2026-07-11", "grogans-mill"),
        makeEvent("2026-07-18", "grogans-mill"),
        makeEvent("2026-07-19", "new-caney"),
    ],
};

test("editing one event upserts exactly that row", () => {
    const next = structuredClone(EVENTS_BASE);
    next.events[1] = { ...next.events[1], waste: 15 };
    const changeSet = computeRecordsChangeSet(EVENTS_BASE, next);
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
    expect(changeSet.marketSettings).toBeUndefined();
});

test("adding an event upserts it; removing one deletes by key", () => {
    const next = structuredClone(EVENTS_BASE);
    next.events.push(makeEvent("2026-07-25", "grogans-mill"));
    next.events = next.events.filter((event) => event.date !== "2026-07-19");
    const changeSet = computeRecordsChangeSet(EVENTS_BASE, next);
    expect(changeSet.events?.upserts.map((row) => row.date)).toEqual([
        "2026-07-25",
    ]);
    expect(changeSet.events?.deletes).toEqual([
        { date: "2026-07-19", market: "new-caney" },
    ]);
});

test("untouched events emit no events slice", () => {
    const changeSet = computeRecordsChangeSet(
        EVENTS_BASE,
        structuredClone(EVENTS_BASE),
    );
    expect(isEmptyRecordsChangeSet(changeSet)).toBe(true);
});

test("moving an event between markets upserts the new key and deletes the old", () => {
    // What overrideMarket's merge produces: one row replaces two.
    const prev: OperatingRecords = {
        ...BASE,
        events: [
            makeEvent("2026-07-19", "new-caney"),
            makeEvent("2026-07-19", "fm-1488"),
        ],
    };
    const next: OperatingRecords = {
        ...BASE,
        events: [{ ...makeEvent("2026-07-19", "fm-1488"), marketFee: 40 }],
        marketOverrides: { "2026-07-19": "fm-1488" },
    };
    const changeSet = computeRecordsChangeSet(prev, next);
    expect(changeSet.events?.upserts).toEqual([
        {
            date: "2026-07-19",
            market: "fm-1488",
            market_fee: 40,
            waste: 0,
            employee_hours: 0,
            billys_hours: 0,
        },
    ]);
    expect(changeSet.events?.deletes).toEqual([
        { date: "2026-07-19", market: "new-caney" },
    ]);
    expect(changeSet.marketOverrides?.upserts).toEqual([
        { date: "2026-07-19", market: "fm-1488" },
    ]);
});

test("setting and clearing a market override upserts and deletes by date", () => {
    const withOverride = {
        ...BASE,
        marketOverrides: { "2026-07-25": "new-caney" as const },
    };
    const set = computeRecordsChangeSet(BASE, withOverride);
    expect(set.marketOverrides?.upserts).toEqual([
        { date: "2026-07-25", market: "new-caney" },
    ]);
    expect(set.marketOverrides?.deletes).toEqual([]);

    const cleared = computeRecordsChangeSet(withOverride, BASE);
    expect(cleared.marketOverrides?.upserts).toEqual([]);
    expect(cleared.marketOverrides?.deletes).toEqual(["2026-07-25"]);
});

test("a classification change rewrites the four-row set wholesale", () => {
    const next = structuredClone(BASE);
    next.marketClassifications["fm-1488"] = "probation";
    const changeSet = computeRecordsChangeSet(BASE, next);
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
        { market: "other", classification: null, employee_hourly_rate: null },
    ]);
    expect(isEmptyRecordsChangeSet(changeSet)).toBe(false);
});

test("a per-market rate edit rides the marketSettings slice", () => {
    const next = structuredClone(BASE);
    next.marketHourlyRates["grogans-mill"] = 15;
    const changeSet = computeRecordsChangeSet(BASE, next);
    expect(
        changeSet.marketSettings?.find((row) => row.market === "grogans-mill")
            ?.employee_hourly_rate,
    ).toBe(15);
});

test("a blank per-market rate stays null rather than becoming zero", () => {
    const withRate = structuredClone(BASE);
    withRate.marketHourlyRates["grogans-mill"] = 15;
    const changeSet = computeRecordsChangeSet(withRate, BASE);
    expect(
        changeSet.marketSettings?.find((row) => row.market === "grogans-mill")
            ?.employee_hourly_rate,
    ).toBeNull();
});
