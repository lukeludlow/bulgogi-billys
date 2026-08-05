import { summaryStats } from "@/admin/domain/calculations.ts";
import StatCard from "@/admin/components/ui/StatCard.tsx";
import { formatCurrency, formatPercent } from "@/admin/components/ui/format.ts";
import type { Settings } from "@/admin/domain/types.ts";

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
                value={
                    stats.best ? formatPercent(stats.best.marginPercent) : "—"
                }
                sub={stats.best?.label}
            />
            <StatCard
                label="Lowest margin"
                value={
                    stats.worst ? formatPercent(stats.worst.marginPercent) : "—"
                }
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
