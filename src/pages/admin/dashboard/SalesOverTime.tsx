import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { formatCurrency } from "./calculations.ts";
import { StatCard } from "./SummaryCards.tsx";
import {
    AXIS_TICK_STYLE,
    ChartCard,
    ChartTooltip,
    chartTheme,
} from "./MarginCharts.tsx";
import {
    bucketByPeriod,
    filterByRange,
    salesSummary,
    type TimeRange,
} from "./salesAnalytics.ts";
import { useIsDarkMode } from "./useIsDarkMode.ts";
import type { Settings } from "./types.ts";

const round2 = (value: number) => Math.round(value * 100) / 100;

interface Props {
    settings: Settings;
    range: TimeRange;
}

export default function SalesOverTime({ settings, range }: Props) {
    const isDark = useIsDarkMode();
    const theme = chartTheme(isDark);

    const inRange = filterByRange(settings.transactions, range);
    const summary = salesSummary(inRange, settings);
    const buckets = bucketByPeriod(inRange, range.granularity, settings);

    const chartData = buckets.map((bucket) => ({
        name: bucket.label,
        revenue: round2(bucket.revenue),
        profit: round2(bucket.profit),
    }));

    const minWidth = Math.max(560, chartData.length * 56);

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                    label="Orders"
                    value={summary.orders.toLocaleString()}
                    sub="approved sales"
                />
                <StatCard
                    label="Revenue"
                    value={formatCurrency(summary.revenue)}
                    sub="in range"
                />
                <StatCard
                    label="Est. profit"
                    value={formatCurrency(summary.profit)}
                    sub="from menu match or blended %"
                    tone={summary.profit >= 0 ? "profit" : "loss"}
                />
                <StatCard
                    label="Avg order"
                    value={formatCurrency(summary.avgOrderValue)}
                    sub="revenue ÷ orders"
                />
            </div>

            {chartData.length > 0 ? (
                <ChartCard
                    title="Revenue & profit over time"
                    description="Each point is one period. Revenue is what you took in; profit is after estimated food cost."
                    minWidth={minWidth}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 16, right: 12, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid vertical={false} stroke={theme.grid} />
                            <XAxis
                                dataKey="name"
                                angle={-35}
                                textAnchor="end"
                                height={64}
                                interval="preserveStartEnd"
                                tick={AXIS_TICK_STYLE(theme)}
                                tickLine={false}
                                stroke={theme.baseline}
                            />
                            <YAxis
                                tick={AXIS_TICK_STYLE(theme)}
                                tickLine={false}
                                stroke={theme.baseline}
                                tickFormatter={(value) => `$${value}`}
                                width={52}
                            />
                            <Tooltip
                                cursor={{ stroke: theme.muted, strokeOpacity: 0.3 }}
                                content={
                                    <ChartTooltip theme={theme} kind="currency" />
                                }
                            />
                            <Legend
                                wrapperStyle={{
                                    fontSize: 12,
                                    color: theme.secondary,
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                name="Revenue"
                                stroke={theme.blue}
                                strokeWidth={2}
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="profit"
                                name="Est. profit"
                                stroke={theme.orange}
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            ) : (
                <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-white/15 dark:text-zinc-400">
                    No sales in this range yet. Import a transactions CSV to get
                    started.
                </div>
            )}
        </div>
    );
}
