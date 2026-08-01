import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from "react";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import { computeChangeSet, isEmptyChangeSet } from "@/admin/data/diff.ts";
import { applyChangeSet, fetchSettings } from "@/admin/data/settingsRepo.ts";
import {
    clearLegacyCache,
    clearPendingJournal,
    readPendingJournal,
    writePendingJournal,
} from "@/admin/data/journal.ts";
import type { Settings } from "@/admin/domain/types.ts";

export type SyncStatus = "loading" | "saving" | "saved" | "dirty" | "error";

interface SettingsContextValue {
    settings: Settings;
    setSettings: Dispatch<SetStateAction<Settings>>;
    /** Where the last edit stands relative to the database. */
    syncStatus: SyncStatus;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const SAVE_DEBOUNCE_MS = 800;
const RETRY_BASE_MS = 2_000;
const RETRY_MAX_MS = 10_000;

/**
 * Holds the one Settings object shared by every admin page, loaded from and
 * autosaved to Supabase. Lives in the /admin layout route so switching pages
 * can't drop a just-made edit. Children only render once settings exist, so
 * `useSettings` always returns a non-null Settings.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettingsState] = useState<Settings | null>(null);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
    const [loadError, setLoadError] = useState(false);
    const [loadAttempt, setLoadAttempt] = useState(0);

    // The snapshot known to be in the database; autosave diffs against it.
    const lastPersisted = useRef<Settings | null>(null);
    const latest = useRef<Settings | null>(null);
    const saveInFlight = useRef(false);
    const retryDelay = useRef(RETRY_BASE_MS);
    const retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Lets the retry timer call the latest runSave without a self-reference.
    const runSaveRef = useRef<() => Promise<void>>(async () => {});

    const runSave = useCallback(async () => {
        if (saveInFlight.current) return;
        saveInFlight.current = true;
        try {
            // Loop so edits that land while a request is in flight get their
            // own save right after it, instead of waiting for a new debounce.
            for (;;) {
                const base = lastPersisted.current;
                const snapshot = latest.current;
                if (!base || !snapshot) return;
                const changeSet = computeChangeSet(base, snapshot);
                if (isEmptyChangeSet(changeSet)) {
                    lastPersisted.current = snapshot;
                    setSyncStatus("saved");
                    clearPendingJournal();
                    return;
                }
                setSyncStatus("saving");
                try {
                    await applyChangeSet(changeSet);
                } catch {
                    setSyncStatus("error");
                    clearTimeout(retryTimer.current);
                    retryTimer.current = setTimeout(
                        () => void runSaveRef.current(),
                        retryDelay.current,
                    );
                    retryDelay.current = Math.min(
                        retryDelay.current * 2.5,
                        RETRY_MAX_MS,
                    );
                    return;
                }
                lastPersisted.current = snapshot;
                retryDelay.current = RETRY_BASE_MS;
            }
        } finally {
            saveInFlight.current = false;
        }
    }, []);

    useEffect(() => {
        runSaveRef.current = runSave;
    }, [runSave]);

    // Initial load: database → apply any edit the previous session journaled
    // on its way out. An empty database is unexpected (it holds the real
    // data) and lands on the error screen.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const loaded = await fetchSettings();
                if (!loaded) throw new Error("settings have never been seeded");
                if (cancelled) return;
                lastPersisted.current = loaded;
                const journal = readPendingJournal();
                clearPendingJournal();
                clearLegacyCache();
                if (journal) {
                    // Adopt the journaled edit; autosave will diff it against
                    // the DB state and persist whatever is actually new.
                    setSettingsState(journal);
                } else {
                    setSettingsState(loaded);
                    setSyncStatus("saved");
                }
            } catch {
                if (!cancelled) setLoadError(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [loadAttempt]);

    // Debounced autosave whenever the settings object changes. The "dirty"
    // status is set by setSettings (the only source of user edits), keeping
    // this effect free of synchronous state updates.
    useEffect(() => {
        latest.current = settings;
        if (!settings || !lastPersisted.current) return;
        if (settings === lastPersisted.current) return;
        const timer = setTimeout(() => void runSave(), SAVE_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [settings, runSave]);

    useEffect(() => () => clearTimeout(retryTimer.current), []);

    // A fetch can't be awaited during unload, so journal a dirty edit to
    // localStorage instead; the next session replays it through autosave.
    useEffect(() => {
        const flush = () => {
            const base = lastPersisted.current;
            const snapshot = latest.current;
            if (!base || !snapshot || snapshot === base) return;
            if (isEmptyChangeSet(computeChangeSet(base, snapshot))) return;
            writePendingJournal(snapshot);
        };
        window.addEventListener("pagehide", flush);
        return () => window.removeEventListener("pagehide", flush);
    }, []);

    const setSettings: Dispatch<SetStateAction<Settings>> = useCallback(
        (action) => {
            setSettingsState((prev) => {
                if (prev === null) return prev;
                return typeof action === "function" ? action(prev) : action;
            });
            setSyncStatus("dirty");
        },
        [],
    );

    if (loadError) {
        return (
            <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
                <Text>Couldn’t load the dashboard data.</Text>
                <Button
                    outline
                    onClick={() => {
                        setLoadError(false);
                        setSyncStatus("loading");
                        setLoadAttempt((n) => n + 1);
                    }}
                >
                    Retry
                </Button>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="flex min-h-dvh items-center justify-center p-6">
                <Text aria-live="polite">Loading dashboard…</Text>
            </div>
        );
    }

    return (
        <SettingsContext.Provider
            value={{
                settings,
                setSettings,
                syncStatus,
            }}
        >
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
