// Turns imported transactions + recorded per-event expenses into the Event
// Contribution report: which market each sale belongs to, pre-tax sales, and
// cash contribution per event and per market. Everything here is pure.
//
// The market a sale belongs to is derived from its timestamp — the three
// market schedules never overlap:
//   Saturday          → Grogan's Mill
//   1st / 3rd Sunday  → New Caney
//   other Sundays     → Farmers Market at 1488
//   any other day     → Other (catering, one-offs)
//
// All date math uses LOCAL getters, matching bucketByPeriod and the CSV
// importer's local-time parse — the whole dashboard assumes it is imported
// and viewed in the business's own timezone.

import { buildProfitIndex, isCountable, resolveWithIndex } from "./salesAnalytics.ts";
import {
    MARKETS,
    type Market,
    type MarketClassification,
    type MarketEvent,
    type Settings,
    type Transaction,
} from "./types.ts";

export const MARKET_LABELS: Record<Market, string> = {
    "grogans-mill": "Grogan's Mill",
    "new-caney": "New Caney",
    "fm-1488": "Farmers Market at 1488",
    other: "Other",
};

/** Local "YYYY-MM-DD" key for an ISO timestamp. */
export function localDateKey(isoDate: string): string {
    const date = new Date(isoDate);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

/** The market whose schedule covers this local calendar day. */
export function marketForDate(date: Date): Market {
    const weekday = date.getDay();
    if (weekday === 6) return "grogans-mill";
    if (weekday === 0) {
        // 0-based occurrence of this Sunday within the month; 1st and 3rd
        // are New Caney, every other Sunday (2nd/4th/5th) is 1488.
        const occurrence = Math.floor((date.getDate() - 1) / 7);
        return occurrence === 0 || occurrence === 2 ? "new-caney" : "fm-1488";
    }
    return "other";
}

export function marketForTransaction(txn: Transaction): Market {
    return marketForDate(new Date(txn.date));
}

/** Menu prices are tax-inclusive; back the tax out of a gross amount. */
export function preTaxAmount(gross: number, taxRatePercent: number): number {
    return gross / (1 + taxRatePercent / 100);
}

export interface EventReportRow {
    /** Local calendar day, "YYYY-MM-DD". */
    date: string;
    market: Market;
    orders: number;
    /** Tax-inclusive revenue from countable sales. */
    grossSales: number;
    preTaxSales: number;
    /** Matched/blended food-cost estimate for the event's sales. */
    estFoodCost: number;
    /** The recorded expense row, or null if none exists yet. */
    expenses: MarketEvent | null;
    /** employeeHours × employeeHourlyRate (0 without an expense row). */
    laborCost: number;
    /** marketFee + fuel + propane + waste + laborCost. */
    directCosts: number;
    /** preTaxSales − estFoodCost − directCosts (§17.1 cash contribution). */
    contribution: number;
}

/**
 * One row per event: the union of events derived from sales and events with
 * a recorded expense row (so an expense-only event — a rained-out day, a
 * future booking — still shows up, with a negative contribution).
 * Sorted newest-first.
 */
export function buildEventReport(settings: Settings): EventReportRow[] {
    const index = buildProfitIndex(settings);

    interface SalesAccumulator {
        orders: number;
        grossSales: number;
        estFoodCost: number;
    }
    const sales = new Map<string, SalesAccumulator>();
    for (const txn of settings.transactions) {
        if (!isCountable(txn)) continue;
        const key = `${localDateKey(txn.date)} ${marketForTransaction(txn)}`;
        const bucket = sales.get(key) ?? {
            orders: 0,
            grossSales: 0,
            estFoodCost: 0,
        };
        const resolved = resolveWithIndex(txn, index);
        bucket.orders += 1;
        bucket.grossSales += resolved.revenue;
        bucket.estFoodCost += resolved.cost;
        sales.set(key, bucket);
    }

    const expenseRows = new Map(
        settings.events.map((event) => [`${event.date} ${event.market}`, event]),
    );

    const keys = new Set([...sales.keys(), ...expenseRows.keys()]);
    const rows: EventReportRow[] = [];
    for (const key of keys) {
        const [date, market] = key.split(" ") as [string, Market];
        const sold = sales.get(key) ?? {
            orders: 0,
            grossSales: 0,
            estFoodCost: 0,
        };
        const expenses = expenseRows.get(key) ?? null;
        const laborCost = expenses
            ? expenses.employeeHours * settings.employeeHourlyRate
            : 0;
        const directCosts = expenses
            ? expenses.marketFee +
              expenses.fuel +
              expenses.propane +
              expenses.waste +
              laborCost
            : 0;
        const preTaxSales = preTaxAmount(
            sold.grossSales,
            settings.salesTaxRatePercent,
        );
        rows.push({
            date,
            market,
            orders: sold.orders,
            grossSales: sold.grossSales,
            preTaxSales,
            estFoodCost: sold.estFoodCost,
            expenses,
            laborCost,
            directCosts,
            contribution: preTaxSales - sold.estFoodCost - directCosts,
        });
    }

    return rows.sort((a, b) =>
        `${b.date} ${b.market}`.localeCompare(`${a.date} ${a.market}`),
    );
}

export interface MarketRollup {
    market: Market;
    classification: MarketClassification | null;
    events: number;
    grossSales: number;
    preTaxSales: number;
    estFoodCost: number;
    directCosts: number;
    contribution: number;
    avgContributionPerEvent: number;
}

/** Totals per market, in fixed MARKETS order (zeros when a market is empty). */
export function rollupByMarket(
    rows: EventReportRow[],
    settings: Settings,
): MarketRollup[] {
    return MARKETS.map((market) => {
        const own = rows.filter((row) => row.market === market);
        const total = (pick: (row: EventReportRow) => number) =>
            own.reduce((sum, row) => sum + pick(row), 0);
        const contribution = total((row) => row.contribution);
        return {
            market,
            classification: settings.marketClassifications[market],
            events: own.length,
            grossSales: total((row) => row.grossSales),
            preTaxSales: total((row) => row.preTaxSales),
            estFoodCost: total((row) => row.estFoodCost),
            directCosts: total((row) => row.directCosts),
            contribution,
            avgContributionPerEvent:
                own.length > 0 ? contribution / own.length : 0,
        };
    });
}
