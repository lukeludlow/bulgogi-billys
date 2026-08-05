// Crash-recovery journal: a network save can't be awaited during pagehide, so
// a dirty edit is written to localStorage on the way out and replayed through
// autosave by the next session (see useOptimisticSync).
//
// Each sync engine journals under its own key, and reads back through its own
// shape guard, so a payload written by an older app version — or by the other
// engine — is dropped instead of being half-adopted.

import type { OperatingRecords, Settings } from "@/admin/domain/types.ts";

/** The config document (settings + menu/recipe tables). */
export const CONFIG_JOURNAL_KEY = "bb_admin_config_pending";

/** The operational records (purchases, fees, …). */
export const RECORDS_JOURNAL_KEY = "bb_admin_records_pending";

/**
 * The pre-Supabase settings cache and the single pre-split journal; both are
 * cleared on load and never written. The old journal carried slices that no
 * longer live in the config document, so replaying it would silently drop
 * them — dropping the whole payload is the honest outcome.
 */
const LEGACY_KEYS = ["bb_admin_settings", "bb_admin_pending"];

/**
 * Shape check so a corrupt journal — or one written by an older app version
 * missing newer Settings fields — is dropped instead of crashing the load.
 */
export function isUsableSettings(value: unknown): value is Settings {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Partial<Settings>;
    return (
        Array.isArray(candidate.ingredients) &&
        Array.isArray(candidate.items) &&
        typeof candidate.employeeHourlyRate === "number" &&
        typeof candidate.salesTaxRatePercent === "number"
    );
}

/** The same check for the records engine's payload. */
export function isUsableRecords(value: unknown): value is OperatingRecords {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Partial<OperatingRecords>;
    return (
        Array.isArray(candidate.events) &&
        Array.isArray(candidate.purchases) &&
        Array.isArray(candidate.processorFees) &&
        typeof candidate.marketOverrides === "object" &&
        candidate.marketOverrides !== null &&
        typeof candidate.marketClassifications === "object" &&
        candidate.marketClassifications !== null
    );
}

/** An edit that hadn't been saved when the page unloaded, or null. */
export function readPendingJournal<T>(
    key: string,
    isUsable: (value: unknown) => value is T,
): T | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return isUsable(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export function writePendingJournal(key: string, value: unknown): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore quota / private-mode write failures — the journal is a best
        // effort; the in-memory state is still correct for this session.
    }
}

export function clearPendingJournal(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch {
        // ignore
    }
}

/** Drop payloads from older app versions; Postgres is the source of truth. */
export function clearLegacyCache(): void {
    try {
        for (const key of LEGACY_KEYS) localStorage.removeItem(key);
    } catch {
        // ignore
    }
}
