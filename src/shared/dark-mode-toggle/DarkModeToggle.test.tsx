import { afterEach, expect, test, vi } from "vitest";
import DarkModeToggle from "./DarkModeToggle.tsx";
import { setDarkMode } from "@/shared/theme.ts";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

function stubMatchMedia(matches: boolean) {
    vi.stubGlobal(
        "matchMedia",
        vi.fn().mockImplementation((query: string) => ({
            matches,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    );
}

afterEach(() => {
    vi.unstubAllGlobals();
});

test("defaults to dark mode when the OS prefers dark and no theme is stored", async () => {
    stubMatchMedia(true);

    const { getByRole } = await renderWithProviders(<DarkModeToggle />);

    await expect
        .element(getByRole("switch"))
        .toHaveAttribute("aria-checked", "true");
    // index.html's inline script applies the theme; mounting only reflects it.
    expect(localStorage.theme).toBeUndefined();
});

test("defaults to light mode when the OS prefers light and no theme is stored", async () => {
    stubMatchMedia(false);

    const { getByRole } = await renderWithProviders(<DarkModeToggle />);

    await expect
        .element(getByRole("switch"))
        .toHaveAttribute("aria-checked", "false");
    expect(localStorage.theme).toBeUndefined();
});

test("respects a stored theme preference over the OS preference", async () => {
    stubMatchMedia(true);
    localStorage.setItem("theme", "light");

    const { getByRole } = await renderWithProviders(<DarkModeToggle />);

    await expect
        .element(getByRole("switch"))
        .toHaveAttribute("aria-checked", "false");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
});

test("clicking the switch toggles the dark class and persists the choice", async () => {
    stubMatchMedia(false);

    const { getByRole } = await renderWithProviders(<DarkModeToggle />);
    const toggle = getByRole("switch");

    await toggle.click();

    await expect.element(toggle).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.theme).toBe("dark");

    await toggle.click();

    await expect.element(toggle).toHaveAttribute("aria-checked", "false");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.theme).toBe("light");
});

test("follows a theme change made by another toggle on the page", async () => {
    stubMatchMedia(false);

    const { getByRole } = await renderWithProviders(<DarkModeToggle />);
    await expect
        .element(getByRole("switch"))
        .toHaveAttribute("aria-checked", "false");

    setDarkMode(true);

    await expect
        .element(getByRole("switch"))
        .toHaveAttribute("aria-checked", "true");
});
