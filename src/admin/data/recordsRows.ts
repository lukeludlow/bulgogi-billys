// Pure mapping between the operational records the dashboard edits and the
// flat, snake_case rows stored in Supabase. These tables grow one keyed row
// at a time, so unlike the config document they carry no `position` columns —
// rows are emitted in a stable sort order purely so both sides of a diff
// serialize identically.

import { PURCHASE_CATEGORIES, type Purchase } from "@/admin/domain/types.ts";
import type { OperatingRecords, ProcessorFee } from "@/admin/domain/types.ts";
import { oneOf, type Row } from "./schema.ts";

export type PurchaseRow = Row<"purchases">;
export type ProcessorFeeRow = Row<"processor_fees">;

export interface RecordsSnapshot {
    purchases: PurchaseRow[];
    processorFees: ProcessorFeeRow[];
}

export function recordsToRows(records: OperatingRecords): RecordsSnapshot {
    return {
        purchases: [...records.purchases]
            .sort((a, b) =>
                `${a.date} ${a.id}`.localeCompare(`${b.date} ${b.id}`),
            )
            .map(purchaseToRow),
        processorFees: [...records.processorFees]
            .sort((a, b) => a.month.localeCompare(b.month))
            .map((fee) => ({ month: fee.month, amount: fee.amount })),
    };
}

export function rowsToRecords(snapshot: RecordsSnapshot): OperatingRecords {
    const purchases: Purchase[] = [...snapshot.purchases]
        .sort((a, b) => `${a.date} ${a.id}`.localeCompare(`${b.date} ${b.id}`))
        .map((row) => {
            const purchase: Purchase = {
                id: row.id,
                date: row.date,
                category: oneOf(
                    row.category,
                    PURCHASE_CATEGORIES,
                    "purchase category",
                ),
                amount: row.amount,
            };
            if (row.note !== null) purchase.note = row.note;
            return purchase;
        });

    const processorFees: ProcessorFee[] = [...snapshot.processorFees]
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((row) => ({ month: row.month, amount: row.amount }));

    return { purchases, processorFees };
}

function purchaseToRow(purchase: Purchase): PurchaseRow {
    return {
        id: purchase.id,
        date: purchase.date,
        category: purchase.category,
        amount: purchase.amount,
        note: purchase.note ?? null,
    };
}
