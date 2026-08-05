import { Badge } from "@/shared/catalyst-ui-kit/badge.tsx";
import { Select } from "@/shared/catalyst-ui-kit/select.tsx";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/catalyst-ui-kit/table.tsx";
import { formatCurrency } from "@/admin/domain/calculations.ts";
import {
    MARKET_LABELS,
    rollupByMarket,
    type EventReportRow,
} from "@/admin/domain/eventAnalytics.ts";
import { useRecords } from "@/admin/RecordsContext.tsx";
import type { MarketClassification } from "@/admin/domain/types.ts";

const CLASSIFICATION_LABELS: Record<MarketClassification, string> = {
    growth: "Growth",
    core: "Core",
    development: "Development",
    probation: "Probation",
    exit: "Exit",
};

const CLASSIFICATION_COLORS: Record<
    MarketClassification,
    "green" | "blue" | "zinc" | "amber" | "red"
> = {
    growth: "green",
    core: "blue",
    development: "zinc",
    probation: "amber",
    exit: "red",
};

interface Props {
    report: EventReportRow[];
}

/** Per-market totals with the manually chosen five-way classification. */
export default function MarketRollups({ report }: Props) {
    const { records, setRecords } = useRecords();
    const rollups = rollupByMarket(report, records);

    return (
        <div className="overflow-hidden rounded-lg bg-white p-4 shadow-sm sm:p-5 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
            <div className="overflow-x-auto">
                <Table dense className="[--gutter:--spacing(4)]">
                    <TableHead>
                        <TableRow>
                            <TableHeader>Market</TableHeader>
                            <TableHeader>Classification</TableHeader>
                            <TableHeader className="text-right">
                                Events
                            </TableHeader>
                            <TableHeader className="text-right">
                                Pre-tax sales
                            </TableHeader>
                            <TableHeader className="text-right">
                                Est. food cost
                            </TableHeader>
                            <TableHeader className="text-right">
                                Direct costs
                            </TableHeader>
                            <TableHeader className="text-right">
                                Contribution
                            </TableHeader>
                            <TableHeader className="text-right">
                                Avg / event
                            </TableHeader>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rollups.map((rollup) => (
                            <TableRow key={rollup.market}>
                                <TableCell className="font-medium whitespace-nowrap">
                                    {MARKET_LABELS[rollup.market]}
                                </TableCell>
                                <TableCell>
                                    {rollup.market === "other" ? (
                                        <span className="text-zinc-400">—</span>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Select
                                                aria-label={`Classification for ${MARKET_LABELS[rollup.market]}`}
                                                className="max-w-36"
                                                value={
                                                    rollup.classification ?? ""
                                                }
                                                onChange={(event) => {
                                                    const raw =
                                                        event.target.value;
                                                    setRecords((prev) => ({
                                                        ...prev,
                                                        marketClassifications: {
                                                            ...prev.marketClassifications,
                                                            [rollup.market]:
                                                                raw === ""
                                                                    ? null
                                                                    : (raw as MarketClassification),
                                                        },
                                                    }));
                                                }}
                                            >
                                                <option value="">
                                                    Unclassified
                                                </option>
                                                {Object.entries(
                                                    CLASSIFICATION_LABELS,
                                                ).map(([value, label]) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </option>
                                                ))}
                                            </Select>
                                            {rollup.classification && (
                                                <Badge
                                                    color={
                                                        CLASSIFICATION_COLORS[
                                                            rollup
                                                                .classification
                                                        ]
                                                    }
                                                >
                                                    {
                                                        CLASSIFICATION_LABELS[
                                                            rollup
                                                                .classification
                                                        ]
                                                    }
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {rollup.events}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatCurrency(rollup.preTaxSales)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatCurrency(rollup.estFoodCost)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatCurrency(rollup.directCosts)}
                                </TableCell>
                                <TableCell
                                    className={`text-right font-medium tabular-nums ${
                                        rollup.contribution < 0
                                            ? "text-red-600 dark:text-red-400"
                                            : "text-green-700 dark:text-green-400"
                                    }`}
                                >
                                    {formatCurrency(rollup.contribution)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatCurrency(
                                        rollup.avgContributionPerEvent,
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
