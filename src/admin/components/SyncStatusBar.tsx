import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import { Select } from "@/shared/catalyst-ui-kit/select.tsx";
import { useRecordsStatus } from "@/admin/RecordsContext.tsx";
import { useSettings } from "@/admin/SettingsContext.tsx";
import { combineStatus, type SyncStatus } from "@/admin/syncStatus.ts";
import type { Protein } from "@/admin/domain/types.ts";
import { supabase } from "@/admin/data/supabase.ts";

const STATUS_LABEL: Record<SyncStatus, string> = {
    loading: "Loading…",
    dirty: "Saving…",
    saving: "Saving…",
    saved: "Saved",
    error: "Offline — retrying…",
};

/**
 * The strip above every admin page: protein what-if selector, live autosave
 * status, and logout.
 */
export default function SyncStatusBar() {
    const { settings, setSettings, syncStatus } = useSettings();
    // The config and the operational records save independently; the bar
    // reports the worse of the two so a stuck save is never hidden.
    const status = combineStatus(syncStatus, useRecordsStatus());

    async function handleLogout() {
        await supabase.auth.signOut();
        // Hard navigation also clears in-memory dashboard state.
        window.location.href = "/admin-login";
    }

    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
                <label
                    htmlFor="protein-select"
                    className="text-sm text-zinc-500 dark:text-zinc-400"
                >
                    Protein
                </label>
                <Select
                    id="protein-select"
                    aria-label="Protein"
                    className="w-32"
                    value={settings.selectedProtein}
                    onChange={(event) =>
                        setSettings((prev) => ({
                            ...prev,
                            selectedProtein: event.target.value as Protein,
                        }))
                    }
                >
                    <option value="beef">Beef</option>
                    <option value="pork">Pork</option>
                </Select>
            </div>

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

            <div className="ml-auto">
                <Button plain onClick={handleLogout}>
                    Log out
                </Button>
            </div>
        </div>
    );
}
