import type { ReactNode } from "react";

/**
 * The dashed placeholder a chart or table shows instead of rendering nothing
 * when it has no data yet — always with a sentence saying what would fill it.
 */
export default function EmptyState({ children }: { children: ReactNode }) {
    return (
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-white/15 dark:text-zinc-400">
            {children}
        </div>
    );
}
