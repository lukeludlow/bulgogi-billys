import { Switch } from "@/shared/catalyst-ui-kit/switch.tsx";
import {
    getIsDarkMode,
    setDarkMode,
    subscribeToTheme,
} from "@/shared/theme.ts";
import { MoonIcon, SunIcon } from "@heroicons/react/16/solid";
import { useSyncExternalStore } from "react";

// Prerendered HTML can't know the visitor's theme, so the server renders the
// switch off and hydration flips it to the real value. There is deliberately
// no mount effect writing the theme back: the inline script in index.html
// already applied it before first paint, and an effect would run with the
// server's value during hydration and overwrite the visitor's choice.
const serverSnapshot = () => false;

export default function DarkModeToggle() {
    const isDarkMode = useSyncExternalStore(
        subscribeToTheme,
        getIsDarkMode,
        serverSnapshot,
    );
    const iconSize = 5;

    return (
        <div
            className={
                "flex flex-row items-center min-w-20 text-zinc-950 dark:text-white"
            }
        >
            <SunIcon className={`size-${iconSize}`} />
            <Switch checked={isDarkMode} onChange={setDarkMode} />
            <MoonIcon className={`size-${iconSize}`} />
        </div>
    );
}
