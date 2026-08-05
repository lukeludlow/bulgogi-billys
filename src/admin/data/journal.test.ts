import { afterEach, beforeEach, expect, test } from "vitest";
import {
    CONFIG_JOURNAL_KEY,
    clearLegacyCache,
    clearPendingJournal,
    isUsableSettings,
    readPendingJournal,
    writePendingJournal,
} from "./journal.ts";
import { DEFAULT_SETTINGS } from "@/test/fixtures/defaultSettings.ts";

const LEGACY_KEY = "bb_admin_pending";

function readConfigJournal() {
    return readPendingJournal(CONFIG_JOURNAL_KEY, isUsableSettings);
}

function writeConfigJournal(value: unknown) {
    writePendingJournal(CONFIG_JOURNAL_KEY, value);
}

// Clear before and after so a write leaked from another suite in the same
// browser origin can't turn a "nothing stored" assertion into a false hit.
beforeEach(() => {
    localStorage.removeItem(CONFIG_JOURNAL_KEY);
    localStorage.removeItem(LEGACY_KEY);
});

afterEach(() => {
    localStorage.removeItem(CONFIG_JOURNAL_KEY);
    localStorage.removeItem(LEGACY_KEY);
});

test("the pending journal round-trips an unsaved edit", () => {
    const edited = { ...DEFAULT_SETTINGS, packagingCostPerOrder: 0.99 };
    writeConfigJournal(edited);
    const restored = readConfigJournal();
    expect(restored?.packagingCostPerOrder).toBe(0.99);
});

test("readPendingJournal returns null when nothing was journaled", () => {
    expect(readConfigJournal()).toBeNull();
});

test("readPendingJournal rejects corrupt or misshapen payloads", () => {
    localStorage.setItem(CONFIG_JOURNAL_KEY, "{not valid json");
    expect(readConfigJournal()).toBeNull();

    localStorage.setItem(
        CONFIG_JOURNAL_KEY,
        JSON.stringify({ hello: "world" }),
    );
    expect(readConfigJournal()).toBeNull();
});

test("readPendingJournal rejects a journal from a pre-events app version", () => {
    // A journal written before the events feature existed lacks the newer
    // Settings fields; adopting it would crash the events page.
    const stale: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    delete stale.events;
    delete stale.employeeHourlyRate;
    localStorage.setItem(CONFIG_JOURNAL_KEY, JSON.stringify(stale));
    expect(readConfigJournal()).toBeNull();
});

test("readPendingJournal rejects a journal from a pre-purchases app version", () => {
    // Journals from before the purchases log still carry per-event
    // fuel/propane and lack the purchases/marketOverrides fields; replaying
    // one would resurrect the removed columns.
    const stale: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    delete stale.purchases;
    delete stale.marketOverrides;
    localStorage.setItem(CONFIG_JOURNAL_KEY, JSON.stringify(stale));
    expect(readConfigJournal()).toBeNull();
});

test("a journal under one key is invisible to another", () => {
    // Each sync engine journals separately; one must never read or clear the
    // other's pending edit.
    writePendingJournal("bb_admin_other_pending", DEFAULT_SETTINGS);
    expect(readConfigJournal()).toBeNull();

    writeConfigJournal(DEFAULT_SETTINGS);
    clearPendingJournal(CONFIG_JOURNAL_KEY);
    expect(localStorage.getItem("bb_admin_other_pending")).not.toBeNull();
    localStorage.removeItem("bb_admin_other_pending");
});

test("clearLegacyCache drops the single pre-split journal", () => {
    // Its payload carried slices the config document no longer owns, so
    // replaying it would silently drop them.
    localStorage.setItem(LEGACY_KEY, JSON.stringify(DEFAULT_SETTINGS));
    clearLegacyCache();
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
});

test("clearPendingJournal removes the journal", () => {
    writeConfigJournal(DEFAULT_SETTINGS);
    clearPendingJournal(CONFIG_JOURNAL_KEY);
    expect(localStorage.getItem(CONFIG_JOURNAL_KEY)).toBeNull();
});
