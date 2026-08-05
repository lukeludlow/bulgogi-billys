import type { ReactNode } from "react";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";

interface Props {
    loadError: boolean;
    /** False until this slice's data is in memory. */
    ready: boolean;
    onRetry: () => void;
    children: ReactNode;
}

/**
 * Holds the dashboard back until a slice has loaded. Every slice uses this
 * one screen, so a page waiting on two of them looks like it's waiting on one.
 */
export default function DataGate({
    loadError,
    ready,
    onRetry,
    children,
}: Props) {
    if (loadError) {
        return (
            <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
                <Text>Couldn’t load the dashboard data.</Text>
                <Button outline onClick={onRetry}>
                    Retry
                </Button>
            </div>
        );
    }

    if (!ready) {
        return (
            <div className="flex min-h-dvh items-center justify-center p-6">
                <Text aria-live="polite">Loading dashboard…</Text>
            </div>
        );
    }

    return children;
}
