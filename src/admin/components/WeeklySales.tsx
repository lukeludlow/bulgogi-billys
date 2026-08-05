import { useMemo } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/catalyst-ui-kit/table.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import NumberField from "@/admin/components/NumberField.tsx";
import StatCard from "@/admin/components/ui/StatCard.tsx";
import {
    AXIS_TICK_STYLE,
    ChartCard,
    ChartTooltip,
    chartTheme,
} from "@/admin/components/ui/charts.tsx";
import { weeklyStats } from "@/admin/domain/calculations.ts";
import * as mutations from "@/admin/domain/settingsMutations.ts";
import { formatCurrency } from "@/admin/components/ui/format.ts";
import { useIsDarkMode } from "@/admin/components/useIsDarkMode.ts";
import { useSettings } from "@/admin/SettingsContext.tsx";
import Card from "@/admin/components/ui/Card.tsx";
import EmptyState from "@/admin/components/ui/EmptyState.tsx";

const round2 = (value: number) => Math.round(value * 100) / 100;

/** This week's units sold, and the revenue and profit they add up to. */
export default function WeeklySales() {
    const { settings, setSettings } = useSettings();
    const isDark = useIsDarkMode();
    const theme = chartTheme(isDark);
    const stats = useMemo(() => weeklyStats(settings), [settings]);

    function onChangeUnitsSold(
        itemId: string,
        variantId: string,
        value: number,
    ) {
        setSettings((prev) =>
            mutations.updateVariant(prev, itemId, variantId, {
                unitsSoldThisWeek: value,
            }),
        );
    }

    const chartData = stats.lines
        .filter((line) => line.unitsSold > 0)
        .map((line) => ({
            name: line.combination.shortLabel,
            grossProfit: round2(line.grossProfit),
        }));

    const minWidth = Math.max(560, chartData.length * 72);

    return (
        <div className="flex flex-col gap-4">
            {/* Weekly totals */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                <StatCard
                    label="Units sold"
                    value={stats.unitsSold.toString()}
                    sub="this week"
                />
                <StatCard
                    label="Pre-tax revenue"
                    value={formatCurrency(stats.revenue)}
                    sub="this week, tax backed out"
                />
                <StatCard
                    label="Sales tax"
                    value={formatCurrency(stats.salesTax)}
                    sub="set aside — not income"
                />
                <StatCard
                    label="Cost of goods"
                    value={formatCurrency(stats.ingredientCost)}
                    sub="ingredients + packaging"
                />
                <StatCard
                    label="Gross profit"
                    value={formatCurrency(stats.grossProfit)}
                    sub="revenue − cost of goods"
                />
                <StatCard
                    label="Net vs. groceries"
                    value={formatCurrency(stats.net)}
                    sub={`less ${formatCurrency(settings.groceryWeeklySpend)} spend`}
                    tone={stats.net >= 0 ? "profit" : "loss"}
                />
            </div>

            {/* Units-sold entry */}
            <Card className="overflow-hidden">
                <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Units sold this week
                </Text>
                <Table dense className="mt-1 [--gutter:--spacing(4)]">
                    <TableHead>
                        <TableRow>
                            <TableHeader>Item &amp; size</TableHeader>
                            <TableHeader>Sold</TableHeader>
                            <TableHeader className="text-right">
                                Pre-tax revenue
                            </TableHeader>
                            <TableHeader className="text-right">
                                Profit
                            </TableHeader>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {stats.lines.map((line) => (
                            <TableRow
                                key={
                                    line.combination.variantId +
                                    line.combination.itemId
                                }
                            >
                                <TableCell className="font-medium">
                                    {line.combination.label}
                                </TableCell>
                                <TableCell className="w-32">
                                    <NumberField
                                        aria-label={`${line.combination.label} units sold`}
                                        value={line.unitsSold}
                                        step={1}
                                        onChange={(value) =>
                                            onChangeUnitsSold(
                                                line.combination.itemId,
                                                line.combination.variantId,
                                                value,
                                            )
                                        }
                                    />
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                                    {formatCurrency(line.revenue)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatCurrency(line.grossProfit)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            {/* Weekly profit chart */}
            {chartData.length > 0 ? (
                <ChartCard
                    title="Gross profit this week by item & size"
                    description="Per-order profit scaled by how many you sold."
                    minWidth={minWidth}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 24, right: 8, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid
                                vertical={false}
                                stroke={theme.grid}
                            />
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
                            <YAxis
                                tick={AXIS_TICK_STYLE(theme)}
                                tickLine={false}
                                stroke={theme.baseline}
                                tickFormatter={(value) => `$${value}`}
                                width={44}
                            />
                            <Tooltip
                                cursor={{
                                    fill: theme.muted,
                                    fillOpacity: 0.08,
                                }}
                                content={
                                    <ChartTooltip
                                        theme={theme}
                                        kind="currency"
                                    />
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
                                        `$${Number(value).toFixed(0)}`
                                    }
                                    style={{
                                        fill: theme.secondary,
                                        fontSize: 11,
                                    }}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            ) : (
                <EmptyState>
                    Enter how many of each item you sold to see this week's
                    profit chart.
                </EmptyState>
            )}
        </div>
    );
}
