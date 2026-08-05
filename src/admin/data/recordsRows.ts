// Pure mapping between the operational records the dashboard edits and the
// flat, snake_case rows stored in Supabase. These tables grow one keyed row
// at a time, so unlike the config document they carry no `position` columns —
// rows are emitted in a stable sort order purely so both sides of a diff
// serialize identically.

import {
    MARKET_CLASSIFICATIONS,
    MARKETS,
    PURCHASE_CATEGORIES,
    type Market,
    type MarketClassification,
    type MarketEvent,
    type OperatingRecords,
    type ProcessorFee,
    type Purchase,
} from "@/admin/domain/types.ts";
import { oneOf, type Row } from "./schema.ts";

export type EventRow = Row<"events">;
export type PurchaseRow = Row<"purchases">;
export type MarketOverrideRow = Row<"market_overrides">;
export type ProcessorFeeRow = Row<"processor_fees">;
export type MarketSettingsRow = Row<"market_settings">;

export interface RecordsSnapshot {
    events: EventRow[];
    purchases: PurchaseRow[];
    marketOverrides: MarketOverrideRow[];
    processorFees: ProcessorFeeRow[];
    marketSettings: MarketSettingsRow[];
}

export function recordsToRows(records: OperatingRecords): RecordsSnapshot {
    return {
        events: [...records.events]
            .sort((a, b) =>
                `${a.date} ${a.market}`.localeCompare(`${b.date} ${b.market}`),
            )
            .map(eventToRow),
        marketOverrides: Object.entries(records.marketOverrides)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, market]) => ({ date, market })),
        // One row per market, always all four: the set is fixed, so this
        // slice is rewritten wholesale rather than diffed per row.
        marketSettings: MARKETS.map((market) => ({
            market,
            classification: records.marketClassifications[market],
            employee_hourly_rate: records.marketHourlyRates[market],
        })),
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
    const events: MarketEvent[] = [...snapshot.events]
        .sort((a, b) =>
            `${b.date} ${b.market}`.localeCompare(`${a.date} ${a.market}`),
        )
        .map((row) => ({
            date: row.date,
            market: oneOf(row.market, MARKETS, "event market"),
            marketFee: row.market_fee,
            waste: row.waste,
            employeeHours: row.employee_hours,
            billysHours: row.billys_hours,
        }));

    const marketOverrides: Record<string, Market> = {};
    for (const row of snapshot.marketOverrides) {
        marketOverrides[row.date] = oneOf(
            row.market,
            MARKETS,
            "market override market",
        );
    }

    // Start from all-null so markets with no stored row (e.g. a database
    // migrated before any classification was chosen) are still present.
    const marketClassifications = Object.fromEntries(
        MARKETS.map((market) => [market, null]),
    ) as Record<Market, MarketClassification | null>;
    const marketHourlyRates = Object.fromEntries(
        MARKETS.map((market) => [market, null]),
    ) as Record<Market, number | null>;
    // Unknown markets are skipped, not rejected — a row left behind by an old
    // market must not brick the whole load.
    for (const row of snapshot.marketSettings) {
        if (!(MARKETS as readonly string[]).includes(row.market)) continue;
        const market = oneOf(row.market, MARKETS, "market settings market");
        marketClassifications[market] =
            row.classification === null
                ? null
                : oneOf(
                      row.classification,
                      MARKET_CLASSIFICATIONS,
                      "market classification",
                  );
        marketHourlyRates[market] = row.employee_hourly_rate;
    }

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

    return {
        events,
        purchases,
        marketOverrides,
        processorFees,
        marketClassifications,
        marketHourlyRates,
    };
}

function eventToRow(event: MarketEvent): EventRow {
    return {
        date: event.date,
        market: event.market,
        market_fee: event.marketFee,
        waste: event.waste,
        employee_hours: event.employeeHours,
        billys_hours: event.billysHours,
    };
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
