import { useRecordsStatus } from "@/admin/RecordsContext.tsx";
import { useSettings } from "@/admin/SettingsContext.tsx";
import { combineStatus, type SyncStatus } from "@/admin/syncStatus.ts";

const STATUS_LABEL: Record<SyncStatus, string> = {
    loading: "Loading…",
    dirty: "Saving…",
    saving: "Saving…",
    saved: "Saved",
    error: "Offline — retrying…",
};

/**
 * Where the last edit stands. The config and the operational records save
 * independently; this reports the worse of the two so a stuck save is never
 * hidden behind the other one's "Saved".
 */
export default function SyncStatusIndicator() {
    const { syncStatus } = useSettings();
    const status = combineStatus(syncStatus, useRecordsStatus());

    return (
        <div
            aria-live="polite"
            className={
                status === "error"
                    ? "text-sm text-red-600 dark:text-red-400"
                    : "text-sm text-zinc-500 dark:text-zinc-400"
            }
        >
            {STATUS_LABEL[status]}
        </div>
    );
}
