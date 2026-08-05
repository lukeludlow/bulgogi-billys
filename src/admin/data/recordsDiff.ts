// Change computation between the last-persisted operational records and the
// current ones. Every table here is keyed and unbounded, so each one is
// diffed per row: editing one purchase writes one row, not the log.

import { keyedChange, type KeyedChange } from "./keyedDiff.ts";
import {
    recordsToRows,
    type EventRow,
    type MarketOverrideRow,
    type MarketSettingsRow,
    type ProcessorFeeRow,
    type PurchaseRow,
    type ReserveTransferRow,
} from "./recordsRows.ts";
import type { OperatingRecords } from "@/admin/domain/types.ts";

export interface EventChange {
    /** New or modified rows only. */
    upserts: EventRow[];
    /** Keys present before but absent now. */
    deletes: { date: string; market: string }[];
}

export interface RecordsChangeSet {
    events?: EventChange;
    purchases?: KeyedChange<PurchaseRow>;
    marketOverrides?: KeyedChange<MarketOverrideRow>;
    processorFees?: KeyedChange<ProcessorFeeRow>;
    /** Wholesale on any change — the row set is fixed at four markets. */
    marketSettings?: MarketSettingsRow[];
    reserveTransfers?: KeyedChange<ReserveTransferRow>;
}

export function isEmptyRecordsChangeSet(changeSet: RecordsChangeSet): boolean {
    return (
        !changeSet.events &&
        !changeSet.purchases &&
        !changeSet.marketOverrides &&
        !changeSet.processorFees &&
        !changeSet.marketSettings &&
        !changeSet.reserveTransfers
    );
}

export function computeRecordsChangeSet(
    prev: OperatingRecords,
    next: OperatingRecords,
): RecordsChangeSet {
    const prevRows = recordsToRows(prev);
    const nextRows = recordsToRows(next);
    const changeSet: RecordsChangeSet = {};

    // Events are keyed on (date, market), so they get their own pass rather
    // than the single-column helper the other slices share.
    const prevEvents = new Map(
        prevRows.events.map((row) => [
            `${row.date} ${row.market}`,
            JSON.stringify(row),
        ]),
    );
    const nextEventKeys = new Set(
        nextRows.events.map((row) => `${row.date} ${row.market}`),
    );
    const eventUpserts = nextRows.events.filter(
        (row) =>
            prevEvents.get(`${row.date} ${row.market}`) !== JSON.stringify(row),
    );
    const eventDeletes = prevRows.events
        .filter((row) => !nextEventKeys.has(`${row.date} ${row.market}`))
        .map((row) => ({ date: row.date, market: row.market }));
    if (eventUpserts.length > 0 || eventDeletes.length > 0) {
        changeSet.events = { upserts: eventUpserts, deletes: eventDeletes };
    }

    const purchases = keyedChange(
        prevRows.purchases,
        nextRows.purchases,
        (row) => row.id,
    );
    if (purchases) changeSet.purchases = purchases;

    const marketOverrides = keyedChange(
        prevRows.marketOverrides,
        nextRows.marketOverrides,
        (row) => row.date,
    );
    if (marketOverrides) changeSet.marketOverrides = marketOverrides;

    const processorFees = keyedChange(
        prevRows.processorFees,
        nextRows.processorFees,
        (row) => row.month,
    );
    if (processorFees) changeSet.processorFees = processorFees;

    if (
        JSON.stringify(prevRows.marketSettings) !==
        JSON.stringify(nextRows.marketSettings)
    ) {
        changeSet.marketSettings = nextRows.marketSettings;
    }

    const reserveTransfers = keyedChange(
        prevRows.reserveTransfers,
        nextRows.reserveTransfers,
        (row) => row.id,
    );
    if (reserveTransfers) changeSet.reserveTransfers = reserveTransfers;

    return changeSet;
}
