import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { SettingsProvider, useSettings } from "@/admin/SettingsContext.tsx";
import { DEFAULT_SETTINGS } from "@/test/fixtures/defaultSettings.ts";
import { rowsToSettings, settingsToRows } from "@/admin/data/rows.ts";
import { applyConfig, fetchSettings } from "@/admin/data/settingsRepo.ts";
import { CONFIG_JOURNAL_KEY as PENDING_KEY } from "@/admin/data/journal.ts";

vi.mock("@/admin/data/settingsRepo.ts", () => ({
    fetchSettings: vi.fn(),
    applyConfig: vi.fn(),
}));

const BASE = rowsToSettings(settingsToRows(DEFAULT_SETTINGS));
beforeEach(() => {
    localStorage.removeItem(PENDING_KEY);
    vi.mocked(fetchSettings).mockResolvedValue(structuredClone(BASE));
    vi.mocked(applyConfig).mockResolvedValue(undefined);
});

afterEach(() => {
    localStorage.removeItem(PENDING_KEY);
    vi.clearAllMocks();
});

/** Small consumer exposing state + a way to make an edit. */
function Probe() {
    const { settings, setSettings, syncStatus } = useSettings();
    return (
        <div>
            <output aria-label="status">{syncStatus}</output>
            <output aria-label="spend">{settings.groceryWeeklySpend}</output>
            <button
                onClick={() =>
                    setSettings((prev) => ({
                        ...prev,
                        groceryWeeklySpend: prev.groceryWeeklySpend + 1,
                    }))
                }
            >
                bump
            </button>
        </div>
    );
}

function renderProvider() {
    return render(
        <SettingsProvider>
            <Probe />
        </SettingsProvider>,
    );
}

test("shows a loading state, then the children with the fetched settings", async () => {
    let resolve!: (value: typeof BASE) => void;
    vi.mocked(fetchSettings).mockReturnValue(
        new Promise((r) => {
            resolve = r;
        }),
    );
    const screen = await renderProvider();

    await expect
        .element(screen.getByText("Loading dashboard…"))
        .toBeInTheDocument();

    resolve(structuredClone(BASE));
    await expect
        .element(screen.getByLabelText("spend"))
        .toHaveTextContent(String(BASE.groceryWeeklySpend));
    await expect
        .element(screen.getByLabelText("status"))
        .toHaveTextContent("saved");
});

test("an empty database shows the error screen instead of seeding", async () => {
    vi.mocked(fetchSettings).mockResolvedValue(null);
    const screen = await renderProvider();

    await expect
        .element(screen.getByText("Couldn’t load the dashboard data."))
        .toBeInTheDocument();
});

test("shows an error with a retry that reloads", async () => {
    vi.mocked(fetchSettings).mockRejectedValueOnce(new Error("network down"));
    const screen = await renderProvider();

    await expect
        .element(screen.getByText("Couldn’t load the dashboard data."))
        .toBeInTheDocument();

    await screen.getByRole("button", { name: "Retry" }).click();
    await expect
        .element(screen.getByLabelText("spend"))
        .toHaveTextContent(String(BASE.groceryWeeklySpend));
});

test("an edit autosaves exactly once after the debounce", async () => {
    const screen = await renderProvider();
    await expect
        .element(screen.getByLabelText("status"))
        .toHaveTextContent("saved");

    await screen.getByRole("button", { name: "bump" }).click();
    await expect
        .element(screen.getByLabelText("status"), { timeout: 5_000 })
        .toHaveTextContent("saved");

    expect(applyConfig).toHaveBeenCalledOnce();
    // The save shape: one call carrying the whole document, edit included.
    const payload = vi.mocked(applyConfig).mock.calls[0][0];
    expect(payload.settings.grocery_weekly_spend).toBe(
        BASE.groceryWeeklySpend + 1,
    );
    expect(payload.ingredients).toHaveLength(BASE.ingredients.length);
    expect(payload.menu_items).toHaveLength(BASE.items.length);
});

test("an edit made during a save is saved right after it", async () => {
    let resolveFirst!: () => void;
    vi.mocked(applyConfig).mockReturnValueOnce(
        new Promise((r) => {
            resolveFirst = () => r(undefined);
        }),
    );
    const screen = await renderProvider();
    await expect
        .element(screen.getByLabelText("status"))
        .toHaveTextContent("saved");

    await screen.getByRole("button", { name: "bump" }).click();
    await expect
        .element(screen.getByLabelText("status"), { timeout: 5_000 })
        .toHaveTextContent("saving");

    // Second edit lands while the first request is still in flight.
    await screen.getByRole("button", { name: "bump" }).click();
    resolveFirst();

    await expect
        .element(screen.getByLabelText("status"), { timeout: 5_000 })
        .toHaveTextContent("saved");
    expect(applyConfig).toHaveBeenCalledTimes(2);
    const second = vi.mocked(applyConfig).mock.calls[1][0];
    expect(second.settings.grocery_weekly_spend).toBe(
        BASE.groceryWeeklySpend + 2,
    );
});

test("a failed save shows an error and retries until it succeeds", async () => {
    vi.mocked(applyConfig).mockRejectedValueOnce(new Error("offline"));
    const screen = await renderProvider();
    await expect
        .element(screen.getByLabelText("status"))
        .toHaveTextContent("saved");

    await screen.getByRole("button", { name: "bump" }).click();
    await expect
        .element(screen.getByLabelText("status"), { timeout: 5_000 })
        .toHaveTextContent("error");

    // The 2s backoff retry runs against the now-working mock.
    await expect
        .element(screen.getByLabelText("status"), { timeout: 10_000 })
        .toHaveTextContent("saved");
    expect(applyConfig).toHaveBeenCalledTimes(2);
});

test("a journaled edit from a previous session is adopted and persisted", async () => {
    const journaled = {
        ...structuredClone(BASE),
        groceryWeeklySpend: 777,
    };
    localStorage.setItem(PENDING_KEY, JSON.stringify(journaled));
    const screen = await renderProvider();

    // The journal wins over the DB copy and is written back through autosave.
    await expect
        .element(screen.getByLabelText("spend"))
        .toHaveTextContent("777");
    await expect
        .element(screen.getByLabelText("status"), { timeout: 5_000 })
        .toHaveTextContent("saved");
    expect(applyConfig).toHaveBeenCalledOnce();
    const payload = vi.mocked(applyConfig).mock.calls[0][0];
    expect(payload.settings.grocery_weekly_spend).toBe(777);
    expect(localStorage.getItem(PENDING_KEY)).toBeNull();
});
