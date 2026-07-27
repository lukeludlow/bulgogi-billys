import { useState } from "react";
import { Button } from "@/components/catalyst-ui-kit/button.tsx";
import { Select } from "@/components/catalyst-ui-kit/select.tsx";
import {
    loadFromCloud,
    resetSettings,
    saveToCloud,
} from "./storage.ts";
import type { Protein, Settings } from "./types.ts";
import { supabase } from "@/lib/supabase.ts";

type Status =
    | { kind: "idle" }
    | { kind: "busy"; message: string }
    | { kind: "ok"; message: string }
    | { kind: "error"; message: string };

interface Props {
    settings: Settings;
    onApplySettings: (settings: Settings) => void;
    selectedProtein: Protein;
    onChangeProtein: (protein: Protein) => void;
}

export default function CloudSyncBar({
    settings,
    onApplySettings,
    selectedProtein,
    onChangeProtein,
}: Props) {
    const [status, setStatus] = useState<Status>({ kind: "idle" });

    async function handleSave() {
        setStatus({ kind: "busy", message: "Saving…" });
        try {
            await saveToCloud(settings);
            setStatus({ kind: "ok", message: "Saved to cloud" });
        } catch (error) {
            setStatus({ kind: "error", message: cloudError(error) });
        }
    }

    async function handleLoad() {
        setStatus({ kind: "busy", message: "Loading…" });
        try {
            const loaded = await loadFromCloud();
            if (!loaded) {
                setStatus({ kind: "ok", message: "No cloud settings saved yet" });
                return;
            }
            onApplySettings(loaded);
            setStatus({ kind: "ok", message: "Loaded from cloud" });
        } catch (error) {
            setStatus({ kind: "error", message: cloudError(error) });
        }
    }

    function handleReset() {
        if (!window.confirm("Reset all values to the starting defaults?")) return;
        onApplySettings(resetSettings());
        setStatus({ kind: "ok", message: "Reset to defaults" });
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
                    value={selectedProtein}
                    onChange={(event) =>
                        onChangeProtein(event.target.value as Protein)
                    }
                >
                    <option value="beef">Beef</option>
                    <option value="pork">Pork</option>
                </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    color="orange"
                    onClick={handleSave}
                    disabled={status.kind === "busy"}
                >
                    Save to cloud
                </Button>
                <Button
                    outline
                    onClick={handleLoad}
                    disabled={status.kind === "busy"}
                >
                    Load from cloud
                </Button>
                <Button outline onClick={handleReset}>
                    Reset
                </Button>
            </div>

            <div
                aria-live="polite"
                className={
                    status.kind === "error"
                        ? "text-sm text-red-600 dark:text-red-400"
                        : status.kind === "ok"
                          ? "text-sm text-green-700 dark:text-green-400"
                          : "text-sm text-zinc-500 dark:text-zinc-400"
                }
            >
                {status.kind !== "idle" ? status.message : ""}
            </div>

            <div className="ml-auto">
                <Button plain onClick={handleLogout}>
                    Log out
                </Button>
            </div>
        </div>
    );
}

function cloudError(error: unknown): string {
    const message = error instanceof Error ? error.message : "Unknown error";
    // The most common cause on a fresh deploy is a missing Blob token.
    return `${message}. Is the Vercel Blob store connected?`;
}
