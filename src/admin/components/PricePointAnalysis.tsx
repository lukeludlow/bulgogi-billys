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
import { formatCurrency } from "@/admin/components/ui/format.ts";
import BasisBadge from "@/admin/components/BasisBadge.tsx";
import {
    AXIS_TICK_STYLE,
    ChartCard,
    ChartTooltip,
    chartTheme,
} from "@/admin/components/ui/charts.tsx";
import {
    pricePointBreakdown,
    type PricePoint,
} from "@/admin/domain/salesAnalytics.ts";
import { useIsDarkMode } from "@/admin/components/useIsDarkMode.ts";
import type { Settings, Transaction } from "@/admin/domain/types.ts";
import Card from "@/admin/components/ui/Card.tsx";
import EmptyState from "@/admin/components/ui/EmptyState.tsx";

const round2 = (value: number) => Math.round(value * 100) / 100;

interface Props {
    settings: Settings;
    /** Already filtered to the range by the page. */
    inRange: Transaction[];
}

export default function PricePointAnalysis({ settings, inRange }: Props) {
    const isDark = useIsDarkMode();
    const theme = chartTheme(isDark);

    const points = pricePointBreakdown(inRange, settings);

    const chartData = points.map((point) => ({
        name: formatCurrency(point.price),
        orders: point.orders,
        profit: round2(point.profit),
    }));
    const minWidth = Math.max(560, chartData.length * 56);

    if (points.length === 0) {
        return (
            <EmptyState>
                No sales in this range yet. Import a transactions CSV to see how
                volume and profit break down by price.
            </EmptyState>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <ChartCard
                title="Orders at each price"
                description="How many sales landed at each order total — your volume at every price point."
                minWidth={minWidth}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 24, right: 8, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid vertical={false} stroke={theme.grid} />
                        <XAxis
                            dataKey="name"
                            angle={-35}
                            textAnchor="end"
                            height={56}
                            interval={0}
                            tick={AXIS_TICK_STYLE(theme)}
                            tickLine={false}
                            stroke={theme.baseline}
                        />
                        <YAxis
                            tick={AXIS_TICK_STYLE(theme)}
                            tickLine={false}
                            stroke={theme.baseline}
                            allowDecimals={false}
                            width={36}
                        />
                        <Tooltip
                            cursor={{ fill: theme.muted, fillOpacity: 0.08 }}
                            content={
                                <ChartTooltip theme={theme} kind="count" />
                            }
                        />
                        <Bar
                            dataKey="orders"
                            name="Orders"
                            fill={theme.blue}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={48}
                        >
                            <LabelList
                                dataKey="orders"
                                position="top"
                                style={{ fill: theme.secondary, fontSize: 11 }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>

            <Card className="overflow-hidden">
                <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Volume &amp; profit by price point
                </Text>
                <div className="overflow-x-auto">
                    <Table dense className="mt-1 [--gutter:--spacing(4)]">
                        <TableHead>
                            <TableRow>
                                <TableHeader>Price</TableHeader>
                                <TableHeader className="text-right">
                                    Orders
                                </TableHeader>
                                <TableHeader className="text-right">
                                    Pre-tax revenue
                                </TableHeader>
                                <TableHeader className="text-right">
                                    Est. profit
                                </TableHeader>
                                <TableHeader>Basis</TableHeader>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {points.map((point) => (
                                <PricePointRow
                                    key={point.price}
                                    point={point}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}

function PricePointRow({ point }: { point: PricePoint }) {
    return (
        <TableRow>
            <TableCell className="font-medium tabular-nums">
                {formatCurrency(point.price)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
                {point.orders}
            </TableCell>
            <TableCell className="text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                {formatCurrency(point.revenue)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
                {formatCurrency(point.profit)}
            </TableCell>
            <TableCell>
                <BasisBadge basis={point.basis} />
            </TableCell>
        </TableRow>
    );
}
