import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/catalyst-ui-kit/button.tsx";
import { Select } from "@/components/catalyst-ui-kit/select.tsx";
import { useSettings, type SyncStatus } from "../SettingsContext.tsx";
import type { Protein } from "./types.ts";
import { supabase } from "@/lib/supabase.ts";

type Notice = { kind: "ok" | "error" | "busy"; message: string } | null;

const STATUS_LABEL: Record<SyncStatus, string> = {
    loading: "Loading…",
    dirty: "Saving…",
    saving: "Saving…",
    saved: "Saved",
    error: "Offline — retrying…",
};

/**
 * The strip above every admin page: protein what-if selector, live autosave
 * status, reset, and logout.
 */
export default function SyncStatusBar() {
    const { settings, setSettings, syncStatus, resetToDefaults } =
        useSettings();
    const [notice, setNotice] = useState<Notice>(null);
    const busy = notice?.kind === "busy";
    const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    useEffect(() => () => clearTimeout(noticeTimer.current), []);

    /** Show an action's outcome briefly, then fall back to the live status. */
    function showTransient(kind: "ok" | "error", message: string) {
        setNotice({ kind, message });
        clearTimeout(noticeTimer.current);
        noticeTimer.current = setTimeout(() => setNotice(null), 4_000);
    }

    async function handleReset() {
        const confirmed = window.confirm(
            "Reset all values to the starting defaults? This also deletes " +
                "every imported transaction.",
        );
        if (!confirmed) return;
        setNotice({ kind: "busy", message: "Resetting…" });
        try {
            await resetToDefaults();
            showTransient("ok", "Reset to defaults");
        } catch {
            showTransient("error", "Reset failed — try again");
        }
    }

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

            <div className="flex flex-wrap items-center gap-2">
                <Button outline onClick={handleReset} disabled={busy}>
                    Reset
                </Button>
            </div>

            <div
                aria-live="polite"
                className={
                    notice?.kind === "error" || syncStatus === "error"
                        ? "text-sm text-red-600 dark:text-red-400"
                        : notice?.kind === "ok"
                          ? "text-sm text-green-700 dark:text-green-400"
                          : "text-sm text-zinc-500 dark:text-zinc-400"
                }
            >
                {notice ? notice.message : STATUS_LABEL[syncStatus]}
            </div>

            <div className="ml-auto">
                <Button plain onClick={handleLogout}>
                    Log out
                </Button>
            </div>
        </div>
    );
}
