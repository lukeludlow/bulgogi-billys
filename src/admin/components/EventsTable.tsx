import { useState } from "react";
import { Badge } from "@/shared/catalyst-ui-kit/badge.tsx";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import {
    Dialog,
    DialogActions,
    DialogBody,
    DialogTitle,
} from "@/shared/catalyst-ui-kit/dialog.tsx";
import {
    Field,
    FieldGroup,
    Label,
} from "@/shared/catalyst-ui-kit/fieldset.tsx";
import { Input } from "@/shared/catalyst-ui-kit/input.tsx";
import { Select } from "@/shared/catalyst-ui-kit/select.tsx";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/catalyst-ui-kit/table.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import { formatCurrency } from "@/admin/domain/calculations.ts";
import DualUnitField from "@/admin/components/DualUnitField.tsx";
import {
    MARKET_LABELS,
    localDateKey,
    marketForDate,
    parseLocalDate,
    type EventReportRow,
} from "@/admin/domain/eventAnalytics.ts";
import NumberField from "@/admin/components/NumberField.tsx";
import * as mutations from "@/admin/domain/eventMutations.ts";
import {
    MARKETS,
    type Market,
    type MarketEvent,
    type Settings,
} from "@/admin/domain/types.ts";

interface Props {
    settings: Settings;
    setSettings: (update: (prev: Settings) => Settings) => void;
    report: EventReportRow[];
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
 * One row per event (sales-derived and/or recorded expenses), with the
 * expense fields editable inline and the market reassignable when the
 * schedule heuristic tagged a day wrong. The wide table scrolls horizontally
 * on mobile; the identifying and headline columns come first so they're
 * visible without scrolling.
 */
export default function EventsTable({ settings, setSettings, report }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newDate, setNewDate] = useState("");
    const [newMarket, setNewMarket] = useState<Market>("other");

    function updateEvent(
        date: string,
        market: Market,
        patch: Partial<MarketEvent>,
    ) {
        setSettings((prev) => mutations.updateEvent(prev, date, market, patch));
    }

    function addExpenses(date: string, market: Market) {
        setSettings((prev) => mutations.addExpenses(prev, date, market));
    }

    function removeExpenses(date: string, market: Market) {
        setSettings((prev) => mutations.removeExpenses(prev, date, market));
    }

    function overrideMarket(
        date: string,
        currentMarket: Market,
        selection: string,
    ) {
        setSettings((prev) =>
            mutations.overrideMarket(prev, date, currentMarket, selection),
        );
    }

    const duplicateNewEvent = settings.events.some(
        (event) => event.date === newDate && event.market === newMarket,
    );

    function handleAddEvent() {
        if (!newDate || duplicateNewEvent) return;
        addExpenses(newDate, newMarket);
        setDialogOpen(false);
        setNewDate("");
    }

    return (
        <div className="overflow-hidden rounded-lg bg-white p-4 shadow-sm sm:p-5 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
            <div className="flex items-center justify-between gap-3">
                <Text className="text-sm">
                    {report.length} event{report.length === 1 ? "" : "s"}
                </Text>
                <Button
                    outline
                    onClick={() => {
                        // Suggest today's market as a starting point.
                        const today = new Date();
                        setNewDate(localDateKey(today.toISOString()));
                        setNewMarket(marketForDate(today));
                        setDialogOpen(true);
                    }}
                >
                    Add event
                </Button>
            </div>

            <div className="mt-3 overflow-x-auto">
                <Table dense className="[--gutter:--spacing(4)]">
                    <TableHead>
                        <TableRow>
                            <TableHeader>Date</TableHeader>
                            <TableHeader>Market</TableHeader>
                            <TableHeader className="text-right">
                                Contribution
                            </TableHeader>
                            <TableHeader className="text-right">
                                Pre-tax sales
                            </TableHeader>
                            <TableHeader className="text-right">
                                Est. food cost
                            </TableHeader>
                            <TableHeader className="text-right">
                                Fuel
                            </TableHeader>
                            <TableHeader className="text-right">
                                Propane
                            </TableHeader>
                            <TableHeader className="text-right">
                                Ice
                            </TableHeader>
                            <TableHeader className="text-right">
                                Card fees
                            </TableHeader>
                            <TableHeader className="text-right">
                                Food purch.
                            </TableHeader>
                            <TableHeader>Market fee</TableHeader>
                            <TableHeader>Waste</TableHeader>
                            <TableHeader>Emp. hours</TableHeader>
                            <TableHeader className="text-right">
                                Labor
                            </TableHeader>
                            <TableHeader>Billy&apos;s hours</TableHeader>
                            {/* relative: anchors the absolutely-positioned
                                sr-only span so it can't stretch the page. */}
                            <TableHeader className="relative">
                                <span className="sr-only">Actions</span>
                            </TableHeader>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {report.map((row) => (
                            <EventRow
                                key={`${row.date} ${row.market}`}
                                row={row}
                                overridden={
                                    settings.marketOverrides[row.date] !==
                                    undefined
                                }
                                onOverrideMarket={overrideMarket}
                                onUpdate={updateEvent}
                                onAddExpenses={addExpenses}
                                onRemoveExpenses={removeExpenses}
                            />
                        ))}
                        {report.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={16}
                                    className="text-center text-zinc-500 dark:text-zinc-400"
                                >
                                    No events yet — import transactions or add
                                    an event.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
                <DialogTitle>Add event</DialogTitle>
                <DialogBody>
                    <FieldGroup>
                        <Field>
                            <Label>Date</Label>
                            <Input
                                type="date"
                                aria-label="Event date"
                                value={newDate}
                                onChange={(event) =>
                                    setNewDate(event.target.value)
                                }
                            />
                        </Field>
                        <Field>
                            <Label>Market</Label>
                            <Select
                                aria-label="Event market"
                                value={newMarket}
                                onChange={(event) =>
                                    setNewMarket(event.target.value as Market)
                                }
                            >
                                {MARKETS.map((market) => (
                                    <option key={market} value={market}>
                                        {MARKET_LABELS[market]}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        {duplicateNewEvent && (
                            <Text className="text-sm text-red-600 dark:text-red-400">
                                That event already has an expense record.
                            </Text>
                        )}
                    </FieldGroup>
                </DialogBody>
                <DialogActions>
                    <Button plain onClick={() => setDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAddEvent}
                        disabled={!newDate || duplicateNewEvent}
                    >
                        Add event
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

function EventRow({
    row,
    overridden,
    onOverrideMarket,
    onUpdate,
    onAddExpenses,
    onRemoveExpenses,
}: {
    row: EventReportRow;
    overridden: boolean;
    onOverrideMarket: (
        date: string,
        currentMarket: Market,
        selection: string,
    ) => void;
    onUpdate: (
        date: string,
        market: Market,
        patch: Partial<MarketEvent>,
    ) => void;
    onAddExpenses: (date: string, market: Market) => void;
    onRemoveExpenses: (date: string, market: Market) => void;
}) {
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
                onChange={(value) => onUpdate(date, market, { [key]: value })}
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
                        onChange={(event) =>
                            onOverrideMarket(date, market, event.target.value)
                        }
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
                                onUpdate(date, market, {
                                    employeeHours: value,
                                })
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
                                onUpdate(date, market, { billysHours: value })
                            }
                        />
                    </TableCell>
                    <TableCell>
                        <Button
                            plain
                            onClick={() => onRemoveExpenses(date, market)}
                        >
                            Remove expenses
                        </Button>
                    </TableCell>
                </>
            ) : (
                <TableCell colSpan={6}>
                    <Button outline onClick={() => onAddExpenses(date, market)}>
                        Add expenses
                    </Button>
                </TableCell>
            )}
        </TableRow>
    );
}
