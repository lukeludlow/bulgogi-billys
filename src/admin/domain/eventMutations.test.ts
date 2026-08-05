import { expect, test } from "vitest";
import {
    addExpenses,
    emptyEvent,
    overrideMarket,
    removeExpenses,
    updateEvent,
    type EventSlice,
} from "./eventMutations.ts";
import type { Market, MarketEvent } from "@/admin/domain/types.ts";

// 2026-07-25 is a Saturday (Grogan's Mill) and 2026-07-19 is the third Sunday
// of its month (New Caney) — see marketForDate in eventAnalytics.ts.
const SATURDAY = "2026-07-25";
const SUNDAY = "2026-07-19";

function event(
    date: string,
    market: Market,
    fields: Partial<MarketEvent> = {},
): MarketEvent {
    return { ...emptyEvent(date, market), ...fields };
}

function slice(
    events: MarketEvent[],
    marketOverrides: Record<string, Market> = {},
): EventSlice {
    return { events, marketOverrides };
}

test("updateEvent patches only the row at that date and market", () => {
    const state = slice([
        event(SUNDAY, "new-caney", { marketFee: 20 }),
        event(SUNDAY, "other", { marketFee: 5 }),
        event(SATURDAY, "new-caney", { marketFee: 7 }),
    ]);

    const next = updateEvent(state, SUNDAY, "new-caney", { marketFee: 2 });

    expect(next.events.map((e) => e.marketFee)).toEqual([2, 5, 7]);
    // The original object is untouched — callers rely on immutable updates.
    expect(state.events[0].marketFee).toBe(20);
});

test("updateEvent is a no-op when no row matches", () => {
    const state = slice([event(SUNDAY, "new-caney", { marketFee: 20 })]);

    const next = updateEvent(state, SATURDAY, "grogans-mill", { waste: 9 });

    expect(next.events).toEqual(state.events);
});

test("addExpenses appends a zeroed row for the day", () => {
    const state = slice([event(SUNDAY, "new-caney", { marketFee: 20 })]);

    const next = addExpenses(state, SATURDAY, "grogans-mill");

    expect(next.events).toHaveLength(2);
    expect(next.events[1]).toEqual({
        date: SATURDAY,
        market: "grogans-mill",
        marketFee: 0,
        waste: 0,
        employeeHours: 0,
        billysHours: 0,
    });
});

test("removeExpenses drops only that day's row at that market", () => {
    const state = slice([
        event(SUNDAY, "new-caney", { marketFee: 20 }),
        event(SUNDAY, "other", { marketFee: 5 }),
    ]);

    const next = removeExpenses(state, SUNDAY, "new-caney");

    expect(next.events).toEqual([event(SUNDAY, "other", { marketFee: 5 })]);
});

test("overrideMarket re-tags a day whose expense row has no counterpart", () => {
    const state = slice([
        event(SUNDAY, "new-caney", {
            marketFee: 20,
            waste: 3,
            employeeHours: 4,
            billysHours: 6,
        }),
    ]);

    const next = overrideMarket(state, SUNDAY, "new-caney", "fm-1488");

    expect(next.marketOverrides).toEqual({ [SUNDAY]: "fm-1488" });
    expect(next.events).toEqual([
        event(SUNDAY, "fm-1488", {
            marketFee: 20,
            waste: 3,
            employeeHours: 4,
            billysHours: 6,
        }),
    ]);
});

test("overrideMarket merges into an existing row by summing every field", () => {
    const state = slice([
        event(SUNDAY, "new-caney", {
            marketFee: 20,
            waste: 3,
            employeeHours: 4,
            billysHours: 6,
        }),
        event(SUNDAY, "fm-1488", {
            marketFee: 15,
            waste: 1,
            employeeHours: 2.5,
            billysHours: 5,
        }),
        // A different day at the same market must survive untouched.
        event(SATURDAY, "fm-1488", { marketFee: 99 }),
    ]);

    const next = overrideMarket(state, SUNDAY, "new-caney", "fm-1488");

    expect(next.marketOverrides).toEqual({ [SUNDAY]: "fm-1488" });
    const sunday = next.events.filter((e) => e.date === SUNDAY);
    expect(sunday).toEqual([
        event(SUNDAY, "fm-1488", {
            marketFee: 35,
            waste: 4,
            employeeHours: 6.5,
            billysHours: 11,
        }),
    ]);
    expect(next.events).toContainEqual(
        event(SATURDAY, "fm-1488", { marketFee: 99 }),
    );
    // Neither source row is left behind to be double-counted.
    expect(next.events).toHaveLength(2);
});

test("overrideMarket clearing to auto deletes the override and moves the row back", () => {
    const state = slice([event(SUNDAY, "fm-1488", { marketFee: 20 })], {
        [SUNDAY]: "fm-1488",
    });

    // "" means "trust the schedule", which puts this Sunday at New Caney.
    const next = overrideMarket(state, SUNDAY, "fm-1488", "");

    expect(next.marketOverrides).toEqual({});
    expect(next.events).toEqual([
        event(SUNDAY, "new-caney", { marketFee: 20 }),
    ]);
});

test("overrideMarket clearing to auto leaves events alone when the market is unchanged", () => {
    const state = slice([event(SUNDAY, "new-caney", { marketFee: 20 })], {
        [SUNDAY]: "new-caney",
    });

    const next = overrideMarket(state, SUNDAY, "new-caney", "");

    expect(next.marketOverrides).toEqual({});
    expect(next.events).toBe(state.events);
});

test("overrideMarket records the override for a day with no expense row", () => {
    const state = slice([event(SATURDAY, "grogans-mill", { marketFee: 20 })]);

    const next = overrideMarket(state, SUNDAY, "new-caney", "other");

    expect(next.marketOverrides).toEqual({ [SUNDAY]: "other" });
    expect(next.events).toBe(state.events);
});

test("overrideMarket re-selecting the current market only pins the override", () => {
    const state = slice([event(SUNDAY, "new-caney", { marketFee: 20 })]);

    const next = overrideMarket(state, SUNDAY, "new-caney", "new-caney");

    expect(next.marketOverrides).toEqual({ [SUNDAY]: "new-caney" });
    expect(next.events).toBe(state.events);
});

test("overrideMarket leaves the caller's other fields intact", () => {
    const state = { ...slice([]), employeeHourlyRate: 12 };

    const next = overrideMarket(state, SUNDAY, "new-caney", "other");

    expect(next.employeeHourlyRate).toBe(12);
});
