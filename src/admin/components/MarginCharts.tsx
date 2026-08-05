import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { allCombinations } from "@/admin/domain/calculations.ts";
import type { Settings } from "@/admin/domain/types.ts";
import {
    AXIS_TICK_STYLE,
    ChartCard,
    ChartTooltip,
    chartTheme,
} from "@/admin/components/ui/charts.tsx";
import { useIsDarkMode } from "@/admin/components/useIsDarkMode.ts";

const round2 = (value: number) => Math.round(value * 100) / 100;
const round1 = (value: number) => Math.round(value * 10) / 10;

export default function MarginCharts({ settings }: { settings: Settings }) {
    const isDark = useIsDarkMode();
    const theme = chartTheme(isDark);

    const data = allCombinations(settings).map((combination) => ({
        name: combination.shortLabel,
        marginPercent: round1(combination.marginPercent),
        revenue: round2(combination.revenue),
        cost: round2(combination.cost),
        grossProfit: round2(combination.grossProfit),
    }));

    // Enough width to keep every labelled bar legible. On a laptop the row is
    // wider than this so the chart fills it; on a phone it scrolls.
    const singleMinWidth = Math.max(560, data.length * 64);
    const groupedMinWidth = Math.max(560, data.length * 84);

    const xAxis = (
        <XAxis
            dataKey="name"
            angle={-35}
            textAnchor="end"
            height={72}
            interval={0}
            tick={AXIS_TICK_STYLE(theme)}
            tickLine={false}
            stroke={theme.baseline}
        />
    );

    return (
        <div className="flex flex-col gap-4">
            <ChartCard
                title="Profit margin by item & size"
                description="Gross margin as a percent of the menu price. Higher is healthier."
                minWidth={singleMinWidth}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 24, right: 8, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid
                            vertical={false}
                            stroke={theme.grid}
                            strokeDasharray="0"
                        />
                        {xAxis}
                        <YAxis
                            tick={AXIS_TICK_STYLE(theme)}
                            tickLine={false}
                            stroke={theme.baseline}
                            tickFormatter={(value) => `${value}%`}
                            width={44}
                        />
                        <Tooltip
                            cursor={{ fill: theme.muted, fillOpacity: 0.08 }}
                            content={
                                <ChartTooltip theme={theme} kind="percent" />
                            }
                        />
                        <Bar
                            dataKey="marginPercent"
                            name="Margin"
                            fill={theme.orange}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={48}
                        >
                            <LabelList
                                dataKey="marginPercent"
                                position="top"
                                formatter={(value) => `${value}%`}
                                style={{ fill: theme.secondary, fontSize: 11 }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>

            <ChartCard
                title="Menu price vs. ingredient cost"
                description="What you charge (blue) against what each order costs to make (orange)."
                minWidth={groupedMinWidth}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        barCategoryGap="22%"
                        barGap={2}
                    >
                        <CartesianGrid vertical={false} stroke={theme.grid} />
                        {xAxis}
                        <YAxis
                            tick={AXIS_TICK_STYLE(theme)}
                            tickLine={false}
                            stroke={theme.baseline}
                            tickFormatter={(value) => `$${value}`}
                            width={44}
                        />
                        <Tooltip
                            cursor={{ fill: theme.muted, fillOpacity: 0.08 }}
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
                        <Bar
                            dataKey="revenue"
                            name="Menu price"
                            fill={theme.blue}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={28}
                        />
                        <Bar
                            dataKey="cost"
                            name="Ingredient cost"
                            fill={theme.orange}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={28}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>

            <ChartCard
                title="Gross profit per order"
                description="Dollars left after ingredients and packaging, for every item & size."
                minWidth={singleMinWidth}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 24, right: 8, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid vertical={false} stroke={theme.grid} />
                        {xAxis}
                        <YAxis
                            tick={AXIS_TICK_STYLE(theme)}
                            tickLine={false}
                            stroke={theme.baseline}
                            tickFormatter={(value) => `$${value}`}
                            width={44}
                        />
                        <Tooltip
                            cursor={{ fill: theme.muted, fillOpacity: 0.08 }}
                            content={
                                <ChartTooltip theme={theme} kind="currency" />
                            }
                        />
                        <Bar
                            dataKey="grossProfit"
                            name="Gross profit"
                            fill={theme.orange}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={48}
                        >
                            <LabelList
                                dataKey="grossProfit"
                                position="top"
                                formatter={(value) =>
                                    `$${Number(value).toFixed(2)}`
                                }
                                style={{ fill: theme.secondary, fontSize: 11 }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
        </div>
    );
}
