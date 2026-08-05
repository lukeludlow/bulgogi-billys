import { Badge } from "@/shared/catalyst-ui-kit/badge.tsx";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import { Select } from "@/shared/catalyst-ui-kit/select.tsx";
import { TableCell, TableRow } from "@/shared/catalyst-ui-kit/table.tsx";
import { formatCurrency } from "@/admin/components/ui/format.ts";
import DualUnitField from "@/admin/components/DualUnitField.tsx";
import NumberField from "@/admin/components/NumberField.tsx";
import {
    marketForDate,
    parseLocalDate,
    type EventReportRow,
} from "@/admin/domain/eventAnalytics.ts";
import { MARKET_LABELS } from "@/admin/components/ui/labels.ts";
import { MARKETS, type MarketEvent } from "@/admin/domain/types.ts";

interface Props {
    row: EventReportRow;
    /** Whether this day's market was set by hand rather than the schedule. */
    overridden: boolean;
    /** A market id, or "" for "trust the schedule". */
    onOverride: (selection: string) => void;
    onUpdate: (patch: Partial<MarketEvent>) => void;
    onAddExpenses: () => void;
    onRemoveExpenses: () => void;
}

/** "Sat, Jul 25, 2026" from a "YYYY-MM-DD" key, without UTC-parse day shift. */
function formatEventDate(date: string): string {
    return parseLocalDate(date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

/**
 * One event: its allocated costs read-only, its recorded expenses editable
 * inline, and its market reassignable when the schedule heuristic tagged the
 * day wrong. Days with sales but no expense record yet collapse the expense
 * columns into a single "Add expenses" button.
 */
export default function EventRow({
    row,
    overridden,
    onOverride,
    onUpdate,
    onAddExpenses,
    onRemoveExpenses,
}: Props) {
    const { date, market, expenses } = row;
    const eventLabel = `${date} ${MARKET_LABELS[market]}`;
    const autoMarket = marketForDate(parseLocalDate(date));

    function expenseField(
        label: string,
        key: keyof Pick<MarketEvent, "marketFee" | "waste">,
    ) {
        return (
            <NumberField
                aria-label={`${label} for ${eventLabel}`}
                prefix="$"
                step={1}
                className="w-28"
                value={expenses![key]}
                onChange={(value) => onUpdate({ [key]: value })}
            />
        );
    }

    function allocatedCell(value: number, deEmphasized = false) {
        return (
            <TableCell
                className={`text-right tabular-nums ${
                    deEmphasized ? "text-zinc-400 dark:text-zinc-500" : ""
                }`}
            >
                {formatCurrency(value)}
            </TableCell>
        );
    }

    return (
        <TableRow>
            <TableCell className="whitespace-nowrap">
                {formatEventDate(date)}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Select
                        aria-label={`Market for ${date}`}
                        // min-w, not w/max-w: the control is w-full internally
                        // and collapses inside an auto-sized table cell.
                        className="min-w-40"
                        value={overridden ? market : ""}
                        onChange={(event) => onOverride(event.target.value)}
                    >
                        <option value="">
                            Auto — {MARKET_LABELS[autoMarket]}
                        </option>
                        {MARKETS.map((option) => (
                            <option key={option} value={option}>
                                {MARKET_LABELS[option]}
                            </option>
                        ))}
                    </Select>
                    <Badge
                        color={
                            overridden
                                ? "amber"
                                : market === "other"
                                  ? "zinc"
                                  : "sky"
                        }
                    >
                        {MARKET_LABELS[market]}
                    </Badge>
                </div>
            </TableCell>
            <TableCell
                className={`text-right font-medium tabular-nums ${
                    row.contribution < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-700 dark:text-green-400"
                }`}
            >
                {formatCurrency(row.contribution)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
                {formatCurrency(row.preTaxSales)}
                <span className="ml-1 text-xs text-zinc-400">
                    {row.orders} order{row.orders === 1 ? "" : "s"}
                </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">
                {formatCurrency(row.estFoodCost)}
            </TableCell>
            {allocatedCell(row.fuelCost)}
            {allocatedCell(row.propaneCost)}
            {allocatedCell(row.iceCost)}
            {allocatedCell(row.processorFee)}
            {/* Reference only — never part of contribution. */}
            {allocatedCell(row.allocatedFoodCost, true)}
            {expenses ? (
                <>
                    <TableCell>
                        {expenseField("Market fee", "marketFee")}
                    </TableCell>
                    <TableCell>{expenseField("Waste", "waste")}</TableCell>
                    <TableCell>
                        <DualUnitField
                            aria-label={`Employee hours for ${eventLabel}`}
                            majorSuffix="hr"
                            minorSuffix="min"
                            minorPerMajor={60}
                            minorStep={5}
                            className="w-44"
                            value={expenses.employeeHours}
                            onChange={(value) =>
                                onUpdate({ employeeHours: value })
                            }
                        />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                        {formatCurrency(row.laborCost)}
                    </TableCell>
                    <TableCell>
                        <DualUnitField
                            aria-label={`Billy's hours for ${eventLabel}`}
                            majorSuffix="hr"
                            minorSuffix="min"
                            minorPerMajor={60}
                            minorStep={5}
                            className="w-44"
                            value={expenses.billysHours}
                            onChange={(value) =>
                                onUpdate({ billysHours: value })
                            }
                        />
                    </TableCell>
                    <TableCell>
                        <Button plain onClick={onRemoveExpenses}>
                            Remove expenses
                        </Button>
                    </TableCell>
                </>
            ) : (
                <TableCell colSpan={6}>
                    <Button outline onClick={onAddExpenses}>
                        Add expenses
                    </Button>
                </TableCell>
            )}
        </TableRow>
    );
}
