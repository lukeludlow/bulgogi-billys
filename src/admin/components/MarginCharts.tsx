import type { ReactNode } from "react";
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
import { Subheading } from "@/shared/catalyst-ui-kit/heading.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import {
    allCombinations,
    formatCurrency,
    formatPercent,
} from "@/admin/domain/calculations.ts";
import type { Settings } from "@/admin/domain/types.ts";
import { useIsDarkMode } from "@/admin/components/useIsDarkMode.ts";

// Chart chrome + series colors from the validated dataviz palette. The two-hue
// pair (blue revenue / orange cost) passes CVD in both modes with a legend and
// direct labels as secondary encoding; single-series charts use brand orange.
export function chartTheme(isDark: boolean) {
    return isDark
        ? {
              primary: "#ffffff",
              secondary: "#c3c2b7",
              muted: "#898781",
              grid: "#2c2c2a",
              baseline: "#383835",
              surface: "#1a1a19",
              orange: "#d95926",
              blue: "#3987e5",
          }
        : {
              primary: "#0b0b0b",
              secondary: "#52514e",
              muted: "#898781",
              grid: "#e1e0d9",
              baseline: "#c3c2b7",
              surface: "#fcfcfb",
              orange: "#eb6834",
              blue: "#2a78d6",
          };
}

export type Theme = ReturnType<typeof chartTheme>;

const round2 = (value: number) => Math.round(value * 100) / 100;
const round1 = (value: number) => Math.round(value * 10) / 10;

interface TooltipProps {
    active?: boolean;
    label?: string;
    payload?: Array<{
        name: string;
        value: number;
        color: string;
        dataKey: string;
    }>;
    theme: Theme;
    kind: "percent" | "currency" | "count";
}

export function ChartTooltip({
    active,
    label,
    payload,
    theme,
    kind,
}: TooltipProps) {
    if (!active || !payload || payload.length === 0) return null;
    const format = (value: number) =>
        kind === "percent"
            ? formatPercent(value)
            : kind === "count"
              ? value.toLocaleString()
              : formatCurrency(value);
    return (
        <div
            style={{
                background: theme.surface,
                border: `1px solid ${theme.baseline}`,
                borderRadius: 8,
                padding: "8px 10px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.14)",
            }}
        >
            <div
                style={{
                    color: theme.primary,
                    fontWeight: 600,
                    fontSize: 12,
                    marginBottom: 4,
                }}
            >
                {label}
            </div>
            {payload.map((entry) => (
                <div
                    key={entry.dataKey}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: theme.secondary,
                        fontSize: 12,
                    }}
                >
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: entry.color,
                            display: "inline-block",
                        }}
                    />
                    <span>{entry.name}</span>
                    <span
                        style={{
                            marginLeft: "auto",
                            paddingLeft: 12,
                            color: theme.primary,
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {format(entry.value)}
                    </span>
                </div>
            ))}
        </div>
    );
}

/**
 * A titled chart panel that fills the row width. The plot area keeps a minimum
 * width (derived from the number of bars) so it uses the full width on a laptop
 * but scrolls horizontally when the screen is too narrow to fit every bar. A
 * right-edge fade and a small hint make that scroll obvious.
 */
export function ChartCard({
    title,
    description,
    minWidth,
    children,
}: {
    title: string;
    description: string;
    minWidth: number;
    children: ReactNode;
}) {
    return (
        <div className="rounded-lg bg-white p-4 shadow-sm sm:p-5 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
            <div className="flex items-baseline justify-between gap-3">
                <div>
                    <Subheading>{title}</Subheading>
                    <Text className="mt-1 text-sm">{description}</Text>
                </div>
                <span className="shrink-0 text-xs text-zinc-400 sm:hidden dark:text-zinc-500">
                    Scroll to see all →
                </span>
            </div>
            <div className="relative mt-4">
                <div className="overflow-x-auto pb-1">
                    <div style={{ minWidth, height: 340 }}>{children}</div>
                </div>
                {/* Fade the right edge to signal more content off-screen. */}
                <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent sm:hidden dark:from-zinc-800/50" />
            </div>
        </div>
    );
}

export const AXIS_TICK_STYLE = (theme: Theme) => ({
    fill: theme.muted,
    fontSize: 11,
    fontVariantNumeric: "tabular-nums" as const,
});

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
