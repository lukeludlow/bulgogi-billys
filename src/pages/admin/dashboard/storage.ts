import { DEFAULT_SETTINGS, SETTINGS_VERSION } from "./defaults.ts";
import type { Settings } from "./types.ts";

const STORAGE_KEY = "bb_admin_settings";

function clone<T>(value: T): T {
    return typeof structuredClone === "function"
        ? structuredClone(value)
        : JSON.parse(JSON.stringify(value));
}

/** Basic shape check so a stale/corrupt payload falls back to defaults. */
function isUsableSettings(value: unknown): value is Settings {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Partial<Settings>;
    return (
        candidate.version === SETTINGS_VERSION &&
        Array.isArray(candidate.ingredients) &&
        Array.isArray(candidate.items)
    );
}

/** Read customized settings from localStorage, or a fresh copy of the defaults. */
export function loadSettings(): Settings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return clone(DEFAULT_SETTINGS);
        const parsed = JSON.parse(raw);
        if (!isUsableSettings(parsed)) return clone(DEFAULT_SETTINGS);
        return parsed;
    } catch {
        return clone(DEFAULT_SETTINGS);
    }
}

export function saveSettings(settings: Settings): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // Ignore quota / private-mode write failures — the in-memory state is
        // still correct for this session.
    }
}

/** Clear the saved customizations and return a fresh copy of the defaults. */
export function resetSettings(): Settings {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
    return clone(DEFAULT_SETTINGS);
}

/** Persist settings to the shared Vercel Blob store via the admin API. */
export async function saveToCloud(settings: Settings): Promise<void> {
    const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
    });
    if (!response.ok) {
        throw new Error(`Cloud save failed (${response.status})`);
    }
}

/** Load settings from the shared Vercel Blob store. Returns null if none saved. */
export async function loadFromCloud(): Promise<Settings | null> {
    const response = await fetch("/api/settings");
    if (!response.ok) {
        throw new Error(`Cloud load failed (${response.status})`);
    }
    const data = await response.json();
    if (!isUsableSettings(data)) return null;
    return data;
}
