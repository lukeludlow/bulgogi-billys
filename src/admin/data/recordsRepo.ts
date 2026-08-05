// Supabase reads/writes for the operational records — the keyed logs the
// dashboard appends to as the season goes on. They share no table with the
// config document, so the two sync engines can never interleave destructively.
//
// Not transactional over PostgREST, like the config save: a mid-save failure
// leaves some rows written until the caller's retry succeeds. Each statement
// here touches one table, so a partial save is always a subset of the edit,
// never a corrupted row.

import { supabase } from "@/admin/data/supabase.ts";
import { fetchAllRows, unwrap } from "@/admin/data/postgrest.ts";
import {
    rowsToRecords,
    type ProcessorFeeRow,
    type PurchaseRow,
} from "./recordsRows.ts";
import type { RecordsChangeSet } from "./recordsDiff.ts";
import type { OperatingRecords } from "@/admin/domain/types.ts";

/**
 * Load every record. Empty tables are legitimate — a season that hasn't
 * started yet has no purchases — so this never returns null.
 */
export async function fetchRecords(): Promise<OperatingRecords> {
    const [purchases, processorFees] = await Promise.all([
        fetchAllRows<PurchaseRow>("purchases", "date", "id"),
        // One row per month — genuinely small, so no paging needed.
        supabase
            .from("processor_fees")
            .select("*")
            .then(unwrap<ProcessorFeeRow[]>),
    ]);
    return rowsToRecords({ purchases, processorFees });
}

export async function applyRecordsChangeSet(
    changeSet: RecordsChangeSet,
): Promise<void> {
    if (changeSet.purchases) {
        if (changeSet.purchases.upserts.length > 0) {
            unwrap(
                await supabase
                    .from("purchases")
                    .upsert(changeSet.purchases.upserts, {
                        onConflict: "id",
                    }),
            );
        }
        if (changeSet.purchases.deletes.length > 0) {
            unwrap(
                await supabase
                    .from("purchases")
                    .delete()
                    .in("id", changeSet.purchases.deletes),
            );
        }
    }

    if (changeSet.processorFees) {
        if (changeSet.processorFees.upserts.length > 0) {
            unwrap(
                await supabase
                    .from("processor_fees")
                    .upsert(changeSet.processorFees.upserts, {
                        onConflict: "month",
                    }),
            );
        }
        if (changeSet.processorFees.deletes.length > 0) {
            unwrap(
                await supabase
                    .from("processor_fees")
                    .delete()
                    .in("month", changeSet.processorFees.deletes),
            );
        }
    }
}
