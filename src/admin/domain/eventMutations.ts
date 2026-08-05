// Pure edits to the per-event expense rows and the day→market overrides.
//
// Every function takes whatever object currently holds those two lists and
// returns a new one of the same type, so the same mutators serve the Settings
// blob today and the operational-records slice they move to (REFACTOR_PLAN
// B4). Components apply these through their state setter; nothing here knows
// about React or persistence.

import {
    marketForDate,
    parseLocalDate,
} from "@/admin/domain/eventAnalytics.ts";
import type { Market, MarketEvent } from "@/admin/domain/types.ts";

/** The state these mutators read and write, wherever it happens to live. */
export interface EventSlice {
    events: MarketEvent[];
    marketOverrides: Record<string, Market>;
}

/**
 * Re-attach a changed slice to the caller's state object. By construction the
 * result is still a T, but TypeScript can't prove that for a generic spread.
 */
function patched<T extends EventSlice>(
    state: T,
    patch: Partial<EventSlice>,
): T {
    return { ...state, ...patch } as T;
}

/** A fresh expense row with nothing recorded yet. */
export function emptyEvent(date: string, market: Market): MarketEvent {
    return {
        date,
        market,
        marketFee: 0,
        waste: 0,
        employeeHours: 0,
        billysHours: 0,
    };
}

/** Patch the expense row at (date, market); a no-op if there isn't one. */
export function updateEvent<T extends EventSlice>(
    state: T,
    date: string,
    market: Market,
    patch: Partial<MarketEvent>,
): T {
    return patched(state, {
        events: state.events.map((event) =>
            event.date === date && event.market === market
                ? { ...event, ...patch }
                : event,
        ),
    });
}

/** Start recording expenses for a day that only had sales until now. */
export function addExpenses<T extends EventSlice>(
    state: T,
    date: string,
    market: Market,
): T {
    return patched(state, {
        events: [...state.events, emptyEvent(date, market)],
    });
}

/** Drop the expense row at (date, market); the day's sales are unaffected. */
export function removeExpenses<T extends EventSlice>(
    state: T,
    date: string,
    market: Market,
): T {
    return patched(state, {
        events: state.events.filter(
            (event) => !(event.date === date && event.market === market),
        ),
    });
}

/**
 * Set (or clear, selection = "") the day's market override, and move any
 * expense row recorded under the old market along with it. If the target
 * (date, market) already has an expense row, the two are merged by summing —
 * both describe the same physical day.
 */
export function overrideMarket<T extends EventSlice>(
    state: T,
    date: string,
    currentMarket: Market,
    selection: string,
): T {
    const marketOverrides = { ...state.marketOverrides };
    const newMarket =
        selection === ""
            ? marketForDate(parseLocalDate(date))
            : (selection as Market);
    if (selection === "") {
        delete marketOverrides[date];
    } else {
        marketOverrides[date] = selection as Market;
    }

    let events = state.events;
    const moving = state.events.find(
        (event) => event.date === date && event.market === currentMarket,
    );
    if (moving && newMarket !== currentMarket) {
        const existing = state.events.find(
            (event) => event.date === date && event.market === newMarket,
        );
        const merged: MarketEvent = existing
            ? {
                  ...existing,
                  marketFee: existing.marketFee + moving.marketFee,
                  waste: existing.waste + moving.waste,
                  employeeHours: existing.employeeHours + moving.employeeHours,
                  billysHours: existing.billysHours + moving.billysHours,
              }
            : { ...moving, market: newMarket };
        events = [
            ...state.events.filter(
                (event) =>
                    !(
                        event.date === date &&
                        (event.market === currentMarket ||
                            event.market === newMarket)
                    ),
            ),
            merged,
        ];
    }

    return patched(state, { marketOverrides, events });
}
