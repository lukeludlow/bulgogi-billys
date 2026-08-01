// Crash-recovery journal: a network save can't be awaited during pagehide, so
// a dirty edit is written to localStorage on the way out and replayed through
// autosave by the next session (see SettingsContext).

import type { Settings } from "../types.ts";

const PENDING_KEY = "bb_admin_pending";
/** The pre-Supabase localStorage cache; cleared on load, never written. */
const LEGACY_CACHE_KEY = "bb_admin_settings";

/**
 * Shape check so a corrupt journal — or one written by an older app version
 * missing newer Settings fields — is dropped instead of crashing the load.
 */
function isUsableSettings(value: unknown): value is Settings {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Partial<Settings>;
    return (
        Array.isArray(candidate.ingredients) &&
        Array.isArray(candidate.items) &&
        Array.isArray(candidate.events) &&
        // Also rejects pre-purchases journals whose events still carry
        // per-event fuel/propane fields.
        Array.isArray(candidate.purchases) &&
        typeof candidate.marketOverrides === "object" &&
        candidate.marketOverrides !== null &&
        typeof candidate.employeeHourlyRate === "number" &&
        typeof candidate.salesTaxRatePercent === "number"
    );
}

/** An edit that hadn't been saved when the page unloaded, or null. */
export function readPendingJournal(): Settings | null {
    try {
        const raw = localStorage.getItem(PENDING_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return isUsableSettings(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export function writePendingJournal(settings: Settings): void {
    try {
        localStorage.setItem(PENDING_KEY, JSON.stringify(settings));
    } catch {
        // Ignore quota / private-mode write failures — the journal is a best
        // effort; the in-memory state is still correct for this session.
    }
}

export function clearPendingJournal(): void {
    try {
        localStorage.removeItem(PENDING_KEY);
    } catch {
        // ignore
    }
}

/** Drop the pre-Supabase settings cache — Postgres is the source of truth now. */
export function clearLegacyCache(): void {
    try {
        localStorage.removeItem(LEGACY_CACHE_KEY);
    } catch {
        // ignore
    }
}
