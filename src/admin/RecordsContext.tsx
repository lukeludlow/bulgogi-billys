import {
    createContext,
    useContext,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from "react";
import DataGate from "@/admin/components/DataGate.tsx";
import { RECORDS_JOURNAL_KEY, isUsableRecords } from "@/admin/data/journal.ts";
import {
    computeRecordsChangeSet,
    isEmptyRecordsChangeSet,
} from "@/admin/data/recordsDiff.ts";
import {
    applyRecordsChangeSet,
    fetchRecords,
} from "@/admin/data/recordsRepo.ts";
import {
    useOptimisticSync,
    type OptimisticSync,
} from "@/admin/useOptimisticSync.ts";
import type { SyncStatus } from "@/admin/syncStatus.ts";
import type { OperatingRecords } from "@/admin/domain/types.ts";

interface RecordsContextValue {
    records: OperatingRecords;
    setRecords: Dispatch<SetStateAction<OperatingRecords>>;
}

const RecordsContext = createContext<OptimisticSync<OperatingRecords> | null>(
    null,
);

/**
 * Holds the operational records — the keyed logs the dashboard appends to —
 * on their own sync engine, separate from the config document. Deliberately
 * does NOT gate its children: rendering them immediately lets the other
 * admin fetches start in parallel with this one. RecordsGate below does the
 * gating, inside SettingsProvider.
 */
export function RecordsProvider({ children }: { children: ReactNode }) {
    const sync = useOptimisticSync({
        load: fetchRecords,
        diff: computeRecordsChangeSet,
        isEmpty: isEmptyRecordsChangeSet,
        apply: applyRecordsChangeSet,
        journalKey: RECORDS_JOURNAL_KEY,
        isUsable: isUsableRecords,
    });

    return (
        <RecordsContext.Provider value={sync}>
            {children}
        </RecordsContext.Provider>
    );
}

function useSync(): OptimisticSync<OperatingRecords> {
    const sync = useContext(RecordsContext);
    if (!sync) {
        throw new Error("useRecords must be used inside a RecordsProvider");
    }
    return sync;
}

/** Blocks rendering until the records have loaded. */
export function RecordsGate({ children }: { children: ReactNode }) {
    const sync = useSync();
    return (
        <DataGate
            loadError={sync.loadError}
            ready={sync.value !== null}
            onRetry={sync.retryLoad}
        >
            {children}
        </DataGate>
    );
}

export function useRecords(): RecordsContextValue {
    const sync = useSync();
    if (!sync.value) {
        throw new Error("useRecords must be used inside a RecordsGate");
    }
    return { records: sync.value, setRecords: sync.set };
}

/** Readable outside the gate, so the status bar can report a pending load. */
export function useRecordsStatus(): SyncStatus {
    return useSync().status;
}
