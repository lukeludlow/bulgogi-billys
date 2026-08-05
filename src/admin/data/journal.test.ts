import { afterEach, beforeEach, expect, test } from "vitest";
import {
    CONFIG_JOURNAL_KEY,
    RECORDS_JOURNAL_KEY,
    clearLegacyCache,
    clearPendingJournal,
    isUsableRecords,
    isUsableSettings,
    readPendingJournal,
    writePendingJournal,
} from "./journal.ts";
import {
    DEFAULT_RECORDS,
    DEFAULT_SETTINGS,
} from "@/test/fixtures/defaultSettings.ts";

const LEGACY_KEY = "bb_admin_pending";

function readConfigJournal() {
    return readPendingJournal(CONFIG_JOURNAL_KEY, isUsableSettings);
}

function writeConfigJournal(value: unknown) {
    writePendingJournal(CONFIG_JOURNAL_KEY, value);
}

function readRecordsJournal() {
    return readPendingJournal(RECORDS_JOURNAL_KEY, isUsableRecords);
}

// Clear before and after so a write leaked from another suite in the same
// browser origin can't turn a "nothing stored" assertion into a false hit.
function clearAll() {
    localStorage.removeItem(CONFIG_JOURNAL_KEY);
    localStorage.removeItem(RECORDS_JOURNAL_KEY);
    localStorage.removeItem(LEGACY_KEY);
}

beforeEach(clearAll);
afterEach(clearAll);

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

test("readPendingJournal rejects a config journal missing newer fields", () => {
    // A journal written by an older app version lacks fields the current one
    // reads; adopting it would crash the dashboard.
    const stale: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    delete stale.employeeHourlyRate;
    localStorage.setItem(CONFIG_JOURNAL_KEY, JSON.stringify(stale));
    expect(readConfigJournal()).toBeNull();
});

test("the records journal round-trips and rejects a config payload", () => {
    writePendingJournal(RECORDS_JOURNAL_KEY, {
        ...DEFAULT_RECORDS,
        purchases: [
            { id: "p1", date: "2026-07-20", category: "fuel", amount: 12 },
        ],
    });
    expect(readRecordsJournal()?.purchases).toHaveLength(1);

    // Each engine's payload has a distinct shape, so a mix-up is caught.
    writePendingJournal(RECORDS_JOURNAL_KEY, DEFAULT_SETTINGS);
    expect(readRecordsJournal()).toBeNull();
});

test("readPendingJournal rejects a records journal missing a slice", () => {
    const stale: Record<string, unknown> = { ...DEFAULT_RECORDS };
    delete stale.marketOverrides;
    localStorage.setItem(RECORDS_JOURNAL_KEY, JSON.stringify(stale));
    expect(readRecordsJournal()).toBeNull();
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
