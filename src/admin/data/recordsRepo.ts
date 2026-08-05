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
    type EventRow,
    type MarketOverrideRow,
    type MarketSettingsRow,
    type ProcessorFeeRow,
    type PurchaseRow,
    type ReserveTransferRow,
} from "./recordsRows.ts";
import type { RecordsChangeSet } from "./recordsDiff.ts";
import type { OperatingRecords } from "@/admin/domain/types.ts";

/**
 * Load every record. Empty tables are legitimate — a season that hasn't
 * started yet has no purchases — so this never returns null.
 */
export async function fetchRecords(): Promise<OperatingRecords> {
    const [
        events,
        purchases,
        marketOverrides,
        processorFees,
        marketSettings,
        reserveTransfers,
    ] = await Promise.all([
        fetchAllRows<EventRow>("events", "date", "market"),
        fetchAllRows<PurchaseRow>("purchases", "date", "id"),
        // One row per corrected day, growing without bound — paged like
        // the tables above. `date` is the primary key, so no tiebreaker.
        fetchAllRows<MarketOverrideRow>("market_overrides", "date"),
        // Genuinely small tables (a handful of rows) — no paging needed.
        supabase
            .from("processor_fees")
            .select("*")
            .then(unwrap<ProcessorFeeRow[]>),
        supabase
            .from("market_settings")
            .select("*")
            .then(unwrap<MarketSettingsRow[]>),
        // A few rows a week, but unbounded across seasons — paged.
        fetchAllRows<ReserveTransferRow>("reserve_transfers", "date", "id"),
    ]);
    return rowsToRecords({
        events,
        purchases,
        marketOverrides,
        processorFees,
        marketSettings,
        reserveTransfers,
    });
}

export async function applyRecordsChangeSet(
    changeSet: RecordsChangeSet,
): Promise<void> {
    if (changeSet.events) {
        if (changeSet.events.upserts.length > 0) {
            unwrap(
                await supabase.from("events").upsert(changeSet.events.upserts, {
                    onConflict: "date,market",
                }),
            );
        }
        // Upserts run first, so a row being moved to another market exists at
        // its new key before the old one goes.
        for (const key of changeSet.events.deletes) {
            unwrap(
                await supabase
                    .from("events")
                    .delete()
                    .eq("date", key.date)
                    .eq("market", key.market),
            );
        }
    }

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

    if (changeSet.marketOverrides) {
        if (changeSet.marketOverrides.upserts.length > 0) {
            unwrap(
                await supabase
                    .from("market_overrides")
                    .upsert(changeSet.marketOverrides.upserts, {
                        onConflict: "date",
                    }),
            );
        }
        if (changeSet.marketOverrides.deletes.length > 0) {
            unwrap(
                await supabase
                    .from("market_overrides")
                    .delete()
                    .in("date", changeSet.marketOverrides.deletes),
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

    // Always all four rows, so there is nothing to delete — a strategy that
    // quietly depends on MARKETS only ever being appended to.
    if (changeSet.marketSettings) {
        unwrap(
            await supabase
                .from("market_settings")
                .upsert(changeSet.marketSettings, { onConflict: "market" }),
        );
    }

    if (changeSet.reserveTransfers) {
        if (changeSet.reserveTransfers.upserts.length > 0) {
            unwrap(
                await supabase
                    .from("reserve_transfers")
                    .upsert(changeSet.reserveTransfers.upserts, {
                        onConflict: "id",
                    }),
            );
        }
        if (changeSet.reserveTransfers.deletes.length > 0) {
            unwrap(
                await supabase
                    .from("reserve_transfers")
                    .delete()
                    .in("id", changeSet.reserveTransfers.deletes),
            );
        }
    }
}
