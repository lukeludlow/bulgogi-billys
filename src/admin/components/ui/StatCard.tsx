import Card from "@/admin/components/ui/Card.tsx";

/**
 * A single headline metric. Used by the calculator's sticky summary row, the
 * weekly totals, and the sales-over-time summary — so it lives here rather than
 * inside whichever of those happened to define it first.
 */
export default function StatCard({
    label,
    value,
    sub,
    tone = "default",
}: {
    label: string;
    value: string;
    sub?: string;
    /** "profit"/"loss" tint the value for the weekly net figure. */
    tone?: "default" | "profit" | "loss";
}) {
    const valueTone =
        tone === "profit"
            ? "text-green-700 dark:text-green-400"
            : tone === "loss"
              ? "text-red-600 dark:text-red-400"
              : "text-zinc-950 dark:text-white";
    return (
        <Card padding="tight">
            <div className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                {label}
            </div>
            <div
                className={`mt-1 text-2xl font-semibold tabular-nums ${valueTone}`}
            >
                {value}
            </div>
            {sub && (
                <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                    {sub}
                </div>
            )}
        </Card>
    );
}
