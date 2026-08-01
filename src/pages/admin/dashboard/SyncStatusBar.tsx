import { Button } from "@/components/catalyst-ui-kit/button.tsx";
import { Select } from "@/components/catalyst-ui-kit/select.tsx";
import {
    useSettings,
    type SyncStatus,
} from "@/pages/admin/SettingsContext.tsx";
import type { Protein } from "./types.ts";
import { supabase } from "@/lib/supabase.ts";

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
                    syncStatus === "error"
                        ? "text-sm text-red-600 dark:text-red-400"
                        : "text-sm text-zinc-500 dark:text-zinc-400"
                }
            >
                {STATUS_LABEL[syncStatus]}
            </div>

            <div className="ml-auto">
                <Button plain onClick={handleLogout}>
                    Log out
                </Button>
            </div>
        </div>
    );
}
