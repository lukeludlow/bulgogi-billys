import {
    formatCurrency,
    formatPercent,
    summaryStats,
} from "./calculations.ts";
import type { Settings } from "./types.ts";

function StatCard({
    label,
    value,
    sub,
}: {
    label: string;
    value: string;
    sub?: string;
}) {
    return (
        <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
            <div className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                {label}
            </div>
            <div className="mt-1 text-2xl font-semibold text-zinc-950 tabular-nums dark:text-white">
                {value}
            </div>
            {sub && (
                <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                    {sub}
                </div>
            )}
        </div>
    );
}

export default function SummaryCards({ settings }: { settings: Settings }) {
    const stats = summaryStats(settings);

    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
                label="Average margin"
                value={formatPercent(stats.avgMarginPercent)}
                sub={`Avg food cost ${formatPercent(stats.avgFoodCostPercent)}`}
            />
            <StatCard
                label="Best margin"
                value={stats.best ? formatPercent(stats.best.marginPercent) : "—"}
                sub={stats.best?.label}
            />
            <StatCard
                label="Lowest margin"
                value={stats.worst ? formatPercent(stats.worst.marginPercent) : "—"}
                sub={stats.worst?.label}
            />
            <StatCard
                label="Orders to cover groceries"
                value={
                    stats.breakEvenOrdersPerWeek
                        ? `${Math.ceil(stats.breakEvenOrdersPerWeek)}/wk`
                        : "—"
                }
                sub={`${formatCurrency(settings.groceryWeeklySpend)} weekly spend`}
            />
        </div>
    );
}
