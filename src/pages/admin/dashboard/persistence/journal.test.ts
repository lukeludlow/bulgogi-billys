import { afterEach, beforeEach, expect, test } from "vitest";
import {
    clearPendingJournal,
    readPendingJournal,
    writePendingJournal,
} from "./journal.ts";
import { DEFAULT_SETTINGS } from "@/test/fixtures/defaultSettings.ts";

const PENDING_KEY = "bb_admin_pending";

// Clear before and after so a write leaked from another suite in the same
// browser origin can't turn a "nothing stored" assertion into a false hit.
beforeEach(() => {
    localStorage.removeItem(PENDING_KEY);
});

afterEach(() => {
    localStorage.removeItem(PENDING_KEY);
});

test("the pending journal round-trips an unsaved edit", () => {
    const edited = { ...DEFAULT_SETTINGS, packagingCostPerOrder: 0.99 };
    writePendingJournal(edited);
    const restored = readPendingJournal();
    expect(restored?.packagingCostPerOrder).toBe(0.99);
});

test("readPendingJournal returns null when nothing was journaled", () => {
    expect(readPendingJournal()).toBeNull();
});

test("readPendingJournal rejects corrupt or misshapen payloads", () => {
    localStorage.setItem(PENDING_KEY, "{not valid json");
    expect(readPendingJournal()).toBeNull();

    localStorage.setItem(PENDING_KEY, JSON.stringify({ hello: "world" }));
    expect(readPendingJournal()).toBeNull();
});

test("readPendingJournal rejects a journal from a pre-events app version", () => {
    // A journal written before the events feature existed lacks the newer
    // Settings fields; adopting it would crash the events page.
    const stale: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    delete stale.events;
    delete stale.employeeHourlyRate;
    localStorage.setItem(PENDING_KEY, JSON.stringify(stale));
    expect(readPendingJournal()).toBeNull();
});

test("readPendingJournal rejects a journal from a pre-purchases app version", () => {
    // Journals from before the purchases log still carry per-event
    // fuel/propane and lack the purchases/marketOverrides fields; replaying
    // one would resurrect the removed columns.
    const stale: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    delete stale.purchases;
    delete stale.marketOverrides;
    localStorage.setItem(PENDING_KEY, JSON.stringify(stale));
    expect(readPendingJournal()).toBeNull();
});

test("clearPendingJournal removes the journal", () => {
    writePendingJournal(DEFAULT_SETTINGS);
    clearPendingJournal();
    expect(localStorage.getItem(PENDING_KEY)).toBeNull();
});
