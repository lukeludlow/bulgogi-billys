import {
    createContext,
    useContext,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from "react";
import DataGate from "@/admin/components/DataGate.tsx";
import { computeConfigChange, isEmptyConfigChange } from "@/admin/data/diff.ts";
import { CONFIG_JOURNAL_KEY, isUsableSettings } from "@/admin/data/journal.ts";
import { applyConfig, fetchSettings } from "@/admin/data/settingsRepo.ts";
import { useOptimisticSync } from "@/admin/useOptimisticSync.ts";
import type { SyncStatus } from "@/admin/syncStatus.ts";
import type { Settings } from "@/admin/domain/types.ts";

export type { SyncStatus };

interface SettingsContextValue {
    settings: Settings;
    setSettings: Dispatch<SetStateAction<Settings>>;
    /** Where the last edit stands relative to the database. */
    syncStatus: SyncStatus;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Holds the one Settings object shared by every admin page, loaded from and
 * autosaved to Supabase. Lives in the /admin layout route so switching pages
 * can't drop a just-made edit. Children only render once settings exist, so
 * `useSettings` always returns a non-null Settings.
 *
 * An empty database is unexpected (it holds the real data): fetchSettings
 * returns null without a settings row, which lands on the error screen.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
    const sync = useOptimisticSync({
        load: fetchSettings,
        diff: computeConfigChange,
        isEmpty: isEmptyConfigChange,
        // Non-null because the engine only applies a change isEmpty rejected.
        apply: (change) => applyConfig(change!),
        journalKey: CONFIG_JOURNAL_KEY,
        isUsable: isUsableSettings,
    });

    return (
        <DataGate
            loadError={sync.loadError}
            ready={sync.value !== null}
            onRetry={sync.retryLoad}
        >
            <SettingsContext.Provider
                value={{
                    settings: sync.value!,
                    setSettings: sync.set,
                    syncStatus: sync.status,
                }}
            >
                {children}
            </SettingsContext.Provider>
        </DataGate>
    );
}

export function useSettings(): SettingsContextValue {
    const value = useContext(SettingsContext);
    if (!value) {
        throw new Error("useSettings must be used inside a SettingsProvider");
    }
    return value;
}
