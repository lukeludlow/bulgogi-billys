import { useState } from "react";
import { Badge } from "@/components/catalyst-ui-kit/badge.tsx";
import { Button } from "@/components/catalyst-ui-kit/button.tsx";
import {
    Dialog,
    DialogActions,
    DialogBody,
    DialogTitle,
} from "@/components/catalyst-ui-kit/dialog.tsx";
import {
    Field,
    FieldGroup,
    Label,
} from "@/components/catalyst-ui-kit/fieldset.tsx";
import { Input } from "@/components/catalyst-ui-kit/input.tsx";
import { Select } from "@/components/catalyst-ui-kit/select.tsx";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/catalyst-ui-kit/table.tsx";
import { Text } from "@/components/catalyst-ui-kit/text.tsx";
import { formatCurrency } from "./calculations.ts";
import {
    MARKET_LABELS,
    localDateKey,
    marketForDate,
    type EventReportRow,
} from "./eventAnalytics.ts";
import NumberField from "./NumberField.tsx";
import {
    MARKETS,
    type Market,
    type MarketEvent,
    type Settings,
} from "./types.ts";

interface Props {
    settings: Settings;
    setSettings: (update: (prev: Settings) => Settings) => void;
    report: EventReportRow[];
}

function emptyEvent(date: string, market: Market): MarketEvent {
    return {
        date,
        market,
        marketFee: 0,
        fuel: 0,
        propane: 0,
        waste: 0,
        employeeHours: 0,
        billysHours: 0,
    };
}

/** "Sat, Jul 25, 2026" from a "YYYY-MM-DD" key, without UTC-parse day shift. */
function formatEventDate(date: string): string {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

/**
 * One row per event (sales-derived and/or recorded expenses), with the
 * expense fields editable inline. The wide table scrolls horizontally on
 * mobile; the identifying and headline columns come first so they're visible
 * without scrolling.
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
        setSettings((prev) => ({
            ...prev,
            events: prev.events.map((event) =>
                event.date === date && event.market === market
                    ? { ...event, ...patch }
                    : event,
            ),
        }));
    }

    function addExpenses(date: string, market: Market) {
        setSettings((prev) => ({
            ...prev,
            events: [...prev.events, emptyEvent(date, market)],
        }));
    }

    function removeExpenses(date: string, market: Market) {
        setSettings((prev) => ({
            ...prev,
            events: prev.events.filter(
                (event) => !(event.date === date && event.market === market),
            ),
        }));
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
                            <TableHeader>Market fee</TableHeader>
                            <TableHeader>Fuel</TableHeader>
                            <TableHeader>Propane</TableHeader>
                            <TableHeader>Waste</TableHeader>
                            <TableHeader>Emp. hours</TableHeader>
                            <TableHeader className="text-right">
                                Labor
                            </TableHeader>
                            <TableHeader>Billy&apos;s hours</TableHeader>
                            <TableHeader>
                                <span className="sr-only">Actions</span>
                            </TableHeader>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {report.map((row) => (
                            <EventRow
                                key={`${row.date} ${row.market}`}
                                row={row}
                                onUpdate={updateEvent}
                                onAddExpenses={addExpenses}
                                onRemoveExpenses={removeExpenses}
                            />
                        ))}
                        {report.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={13}
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
                                    setNewMarket(
                                        event.target.value as Market,
                                    )
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
    onUpdate,
    onAddExpenses,
    onRemoveExpenses,
}: {
    row: EventReportRow;
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

    function expenseField(
        label: string,
        key: keyof Pick<
            MarketEvent,
            "marketFee" | "fuel" | "propane" | "waste"
        >,
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

    return (
        <TableRow>
            <TableCell className="whitespace-nowrap">
                {formatEventDate(date)}
            </TableCell>
            <TableCell>
                <Badge color={market === "other" ? "zinc" : "sky"}>
                    {MARKET_LABELS[market]}
                </Badge>
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
            {expenses ? (
                <>
                    <TableCell>{expenseField("Market fee", "marketFee")}</TableCell>
                    <TableCell>{expenseField("Fuel", "fuel")}</TableCell>
                    <TableCell>{expenseField("Propane", "propane")}</TableCell>
                    <TableCell>{expenseField("Waste", "waste")}</TableCell>
                    <TableCell>
                        <NumberField
                            aria-label={`Employee hours for ${eventLabel}`}
                            suffix="hrs"
                            step={0.25}
                            className="w-28"
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
                        <NumberField
                            aria-label={`Billy's hours for ${eventLabel}`}
                            suffix="hrs"
                            step={0.25}
                            className="w-28"
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
                <TableCell colSpan={8}>
                    <Button
                        outline
                        onClick={() => onAddExpenses(date, market)}
                    >
                        Add expenses
                    </Button>
                </TableCell>
            )}
        </TableRow>
    );
}
