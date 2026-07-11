import { afterEach, expect, test } from "vitest";
import { loadSettings, resetSettings, saveSettings } from "./storage.ts";
import { DEFAULT_SETTINGS } from "./defaults.ts";

const STORAGE_KEY = "bb_admin_settings";

afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
});

test("loadSettings returns the defaults when nothing is stored", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
});

test("saveSettings + loadSettings round-trips customized values", () => {
    const customized = {
        ...DEFAULT_SETTINGS,
        packagingCostPerOrder: 0.99,
        selectedProtein: "pork" as const,
    };
    saveSettings(customized);
    const loaded = loadSettings();
    expect(loaded.packagingCostPerOrder).toBe(0.99);
    expect(loaded.selectedProtein).toBe("pork");
});

test("loadSettings falls back to defaults for a version mismatch", () => {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...DEFAULT_SETTINGS, version: 999 }),
    );
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
});

test("loadSettings falls back to defaults for corrupt JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
});

test("resetSettings clears storage and returns fresh defaults", () => {
    saveSettings({ ...DEFAULT_SETTINGS, packagingCostPerOrder: 5 });
    const fresh = resetSettings();
    expect(fresh).toEqual(DEFAULT_SETTINGS);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
});
