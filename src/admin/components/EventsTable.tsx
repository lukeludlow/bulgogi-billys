import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/catalyst-ui-kit/table.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import AddEventDialog from "@/admin/components/AddEventDialog.tsx";
import EventRow from "@/admin/components/EventRow.tsx";
import * as mutations from "@/admin/domain/eventMutations.ts";
import { useRecords } from "@/admin/RecordsContext.tsx";
import type { EventReportRow } from "@/admin/domain/eventAnalytics.ts";
import type { Market, MarketEvent } from "@/admin/domain/types.ts";

interface Props {
    report: EventReportRow[];
}

/**
 * One row per event (sales-derived and/or recorded expenses). The wide table
 * scrolls horizontally on mobile; the identifying and headline columns come
 * first so they're visible without scrolling. All editing goes through the
 * pure mutators in eventMutations.ts.
 */
export default function EventsTable({ report }: Props) {
    const { records, setRecords } = useRecords();

    function updateEvent(
        date: string,
        market: Market,
        patch: Partial<MarketEvent>,
    ) {
        setRecords((prev) => mutations.updateEvent(prev, date, market, patch));
    }

    function addExpenses(date: string, market: Market) {
        setRecords((prev) => mutations.addExpenses(prev, date, market));
    }

    function removeExpenses(date: string, market: Market) {
        setRecords((prev) => mutations.removeExpenses(prev, date, market));
    }

    function overrideMarket(
        date: string,
        currentMarket: Market,
        selection: string,
    ) {
        setRecords((prev) =>
            mutations.overrideMarket(prev, date, currentMarket, selection),
        );
    }

    return (
        <div className="overflow-hidden rounded-lg bg-white p-4 shadow-sm sm:p-5 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
            <div className="flex items-center justify-between gap-3">
                <Text className="text-sm">
                    {report.length} event{report.length === 1 ? "" : "s"}
                </Text>
                <AddEventDialog events={records.events} onAdd={addExpenses} />
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
                                    records.marketOverrides[row.date] !==
                                    undefined
                                }
                                onOverride={(selection) =>
                                    overrideMarket(
                                        row.date,
                                        row.market,
                                        selection,
                                    )
                                }
                                onUpdate={(patch) =>
                                    updateEvent(row.date, row.market, patch)
                                }
                                onAddExpenses={() =>
                                    addExpenses(row.date, row.market)
                                }
                                onRemoveExpenses={() =>
                                    removeExpenses(row.date, row.market)
                                }
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
        </div>
    );
}
