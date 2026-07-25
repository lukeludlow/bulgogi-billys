import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from "react";
import { loadSettings, saveSettings } from "./dashboard/storage.ts";
import type { Settings } from "./dashboard/types.ts";

interface SettingsContextValue {
    settings: Settings;
    setSettings: Dispatch<SetStateAction<Settings>>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Holds the one Settings object shared by every admin page. Lives in the
 * /admin layout route so switching pages can't drop a just-made edit.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Settings>(() => loadSettings());

    // Persist to localStorage shortly after edits settle, so every keystroke
    // isn't a write but nothing is ever lost on reload.
    useEffect(() => {
        const timer = setTimeout(() => saveSettings(settings), 300);
        return () => clearTimeout(timer);
    }, [settings]);

    // Flush a pending edit if the page unloads before the debounce fires
    // (e.g. logout's hard navigation away from the SPA).
    const latest = useRef(settings);
    useEffect(() => {
        latest.current = settings;
    }, [settings]);
    useEffect(() => {
        const flush = () => saveSettings(latest.current);
        window.addEventListener("pagehide", flush);
        return () => window.removeEventListener("pagehide", flush);
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, setSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings(): SettingsContextValue {
    const value = useContext(SettingsContext);
    if (!value) {
        throw new Error("useSettings must be used inside a SettingsProvider");
    }
    return value;
}
