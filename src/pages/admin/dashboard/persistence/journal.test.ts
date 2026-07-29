import { afterEach, beforeEach, expect, test } from "vitest";
import {
    clearPendingJournal,
    readPendingJournal,
    writePendingJournal,
} from "./journal.ts";
import { DEFAULT_SETTINGS } from "../defaults.ts";

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

test("clearPendingJournal removes the journal", () => {
    writePendingJournal(DEFAULT_SETTINGS);
    clearPendingJournal();
    expect(localStorage.getItem(PENDING_KEY)).toBeNull();
});
