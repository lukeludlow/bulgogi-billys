import { useEffect, useState } from "react";
import { getIsDarkMode } from "@/lib/theme.ts";

/**
 * Tracks whether the site is currently in dark mode by watching the `.dark`
 * class that `DarkModeToggle` toggles on `<html>`. Lets charts recolor the
 * instant the theme flips, without threading theme state through props.
 */
export function useIsDarkMode(): boolean {
    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        if (typeof document === "undefined") return false;
        return getIsDarkMode();
    });

    useEffect(() => {
        const root = document.documentElement;
        const update = () => setIsDarkMode(root.classList.contains("dark"));
        update();
        const observer = new MutationObserver(update);
        observer.observe(root, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => observer.disconnect();
    }, []);

    return isDarkMode;
}
