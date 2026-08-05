// Change computation between the last-persisted operational records and the
// current ones. Every table here is keyed and unbounded, so each one is
// diffed per row: editing one purchase writes one row, not the log.

import { keyedChange, type KeyedChange } from "./keyedDiff.ts";
import {
    recordsToRows,
    type ProcessorFeeRow,
    type PurchaseRow,
} from "./recordsRows.ts";
import type { OperatingRecords } from "@/admin/domain/types.ts";

export interface RecordsChangeSet {
    purchases?: KeyedChange<PurchaseRow>;
    processorFees?: KeyedChange<ProcessorFeeRow>;
}

export function isEmptyRecordsChangeSet(changeSet: RecordsChangeSet): boolean {
    return !changeSet.purchases && !changeSet.processorFees;
}

export function computeRecordsChangeSet(
    prev: OperatingRecords,
    next: OperatingRecords,
): RecordsChangeSet {
    const prevRows = recordsToRows(prev);
    const nextRows = recordsToRows(next);
    const changeSet: RecordsChangeSet = {};

    const purchases = keyedChange(
        prevRows.purchases,
        nextRows.purchases,
        (row) => row.id,
    );
    if (purchases) changeSet.purchases = purchases;

    const processorFees = keyedChange(
        prevRows.processorFees,
        nextRows.processorFees,
        (row) => row.month,
    );
    if (processorFees) changeSet.processorFees = processorFees;

    return changeSet;
}
