const THEME_EVENT = "themechange";

/**
 * The stored choice, or the OS preference when there is none — the same rule
 * the inline script in index.html applies before first paint.
 */
export function getIsDarkMode(): boolean {
    return (
        localStorage.theme === "dark" ||
        (!("theme" in localStorage) &&
            window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
}

/** Applies and remembers a theme choice, and tells subscribers. */
export function setDarkMode(isDark: boolean): void {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
    window.dispatchEvent(new Event(THEME_EVENT));
}

/**
 * useSyncExternalStore subscription: fires on this tab's setDarkMode and on
 * another tab changing the stored theme.
 */
export function subscribeToTheme(onChange: () => void): () => void {
    window.addEventListener(THEME_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
        window.removeEventListener(THEME_EVENT, onChange);
        window.removeEventListener("storage", onChange);
    };
}
