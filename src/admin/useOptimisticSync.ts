// The optimistic sync engine shared by the admin data contexts: load once,
// edit in memory, debounce a coalesced save, retry with backoff, and journal a
// dirty edit to localStorage if the page unloads before the save lands.
//
// Each consumer supplies what its slice needs — how to load it, how to diff
// two snapshots into a change set, how to write one, and where to journal —
// so the config document and the operational records share this machinery
// without sharing a table.

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from "react";
import {
    clearLegacyCache,
    clearPendingJournal,
    readPendingJournal,
    writePendingJournal,
} from "@/admin/data/journal.ts";
import type { SyncStatus } from "@/admin/syncStatus.ts";

const SAVE_DEBOUNCE_MS = 800;
const RETRY_BASE_MS = 2_000;
const RETRY_MAX_MS = 10_000;

export interface OptimisticSyncConfig<T, C> {
    /** Null means "unusable" and lands on the error screen. */
    load: () => Promise<T | null>;
    diff: (base: T, snapshot: T) => C;
    isEmpty: (change: C) => boolean;
    apply: (change: C) => Promise<void>;
    /** localStorage key for this slice's crash journal. */
    journalKey: string;
    isUsable: (value: unknown) => value is T;
}

export interface OptimisticSync<T> {
    /** Null until the first load resolves. */
    value: T | null;
    set: Dispatch<SetStateAction<T>>;
    status: SyncStatus;
    loadError: boolean;
    retryLoad: () => void;
}

export function useOptimisticSync<T, C>(
    config: OptimisticSyncConfig<T, C>,
): OptimisticSync<T> {
    const [value, setValue] = useState<T | null>(null);
    const [status, setStatus] = useState<SyncStatus>("loading");
    const [loadError, setLoadError] = useState(false);
    const [loadAttempt, setLoadAttempt] = useState(0);

    // Read through a ref so callers can pass an inline config object without
    // restarting the load or the save loop on every render. This effect is
    // declared first, so it refreshes the ref before the ones that read it.
    const configRef = useRef(config);
    useEffect(() => {
        configRef.current = config;
    });

    // The snapshot known to be in the database; autosave diffs against it.
    const lastPersisted = useRef<T | null>(null);
    const latest = useRef<T | null>(null);
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
                const { diff, isEmpty, apply, journalKey } = configRef.current;
                const base = lastPersisted.current;
                const snapshot = latest.current;
                if (!base || !snapshot) return;
                const changeSet = diff(base, snapshot);
                if (isEmpty(changeSet)) {
                    lastPersisted.current = snapshot;
                    setStatus("saved");
                    clearPendingJournal(journalKey);
                    return;
                }
                setStatus("saving");
                try {
                    await apply(changeSet);
                } catch {
                    setStatus("error");
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
    // on its way out.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { load, journalKey, isUsable } = configRef.current;
            try {
                const loaded = await load();
                if (!loaded) throw new Error("nothing to load");
                if (cancelled) return;
                lastPersisted.current = loaded;
                const journal = readPendingJournal(journalKey, isUsable);
                clearPendingJournal(journalKey);
                clearLegacyCache();
                if (journal) {
                    // Adopt the journaled edit; autosave will diff it against
                    // the DB state and persist whatever is actually new.
                    setValue(journal);
                } else {
                    setValue(loaded);
                    setStatus("saved");
                }
            } catch {
                if (!cancelled) setLoadError(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [loadAttempt]);

    // Debounced autosave whenever the value changes. The "dirty" status is set
    // by `set` (the only source of user edits), keeping this effect free of
    // synchronous state updates.
    useEffect(() => {
        latest.current = value;
        if (!value || !lastPersisted.current) return;
        if (value === lastPersisted.current) return;
        const timer = setTimeout(() => void runSave(), SAVE_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [value, runSave]);

    useEffect(() => () => clearTimeout(retryTimer.current), []);

    // A fetch can't be awaited during unload, so journal a dirty edit to
    // localStorage instead; the next session replays it through autosave.
    useEffect(() => {
        const flush = () => {
            const { diff, isEmpty, journalKey } = configRef.current;
            const base = lastPersisted.current;
            const snapshot = latest.current;
            if (!base || !snapshot || snapshot === base) return;
            if (isEmpty(diff(base, snapshot))) return;
            writePendingJournal(journalKey, snapshot);
        };
        window.addEventListener("pagehide", flush);
        return () => window.removeEventListener("pagehide", flush);
    }, []);

    const set: Dispatch<SetStateAction<T>> = useCallback((action) => {
        setValue((prev) => {
            if (prev === null) return prev;
            return typeof action === "function"
                ? (action as (prev: T) => T)(prev)
                : action;
        });
        setStatus("dirty");
    }, []);

    const retryLoad = useCallback(() => {
        setLoadError(false);
        setStatus("loading");
        setLoadAttempt((n) => n + 1);
    }, []);

    return { value, set, status, loadError, retryLoad };
}
