// Turns imported `Transaction[]` into the time-series and price-point numbers the
// dashboard visualizes. Everything here is pure so it can be unit-tested without
// a browser.
//
// The processor only records an order total, so profit per sale is resolved
// best-effort, in priority order:
//   1. matched  — the amount equals one or more menu prices; use their avg cost,
//   2. blended  — fall back to the adjustable food-cost % of the amount.
//
// Order totals are tax-inclusive (menu prices bake the sales tax in), so
// `revenue` and `profit` are pre-tax throughout — the tax portion is reported
// separately as `salesTax`, money set aside for the state, not income. Price
// matching still happens on the gross amount, because that is what both the
// processor and the menu record.

import { allCombinations, preTaxAmount } from "@/admin/domain/calculations.ts";
import type { Settings, Transaction } from "@/admin/domain/types.ts";

export type Granularity = "day" | "week" | "month";
export type RangeWindow = "7d" | "30d" | "90d" | "all";
export type ProfitBasis = "matched" | "blended";

export interface TimeRange {
    granularity: Granularity;
    window: RangeWindow;
}

export interface TransactionProfit {
    /** The order total as charged — tax-inclusive. */
    grossRevenue: number;
    /** Pre-tax revenue: `grossRevenue` with the sales tax backed out. */
    revenue: number;
    /** The tax portion of the order — set aside, not income. */
    salesTax: number;
    cost: number;
    /** Pre-tax revenue less cost. */
    profit: number;
    basis: ProfitBasis;
}

export interface PeriodBucket {
    /** ISO start of the period, for sorting and as a stable key. */
    periodStart: string;
    label: string;
    orders: number;
    /** Pre-tax revenue. */
    revenue: number;
    salesTax: number;
    profit: number;
}

export interface PricePoint {
    /** The order amount as charged — the tax-inclusive menu price. */
    price: number;
    orders: number;
    /** Pre-tax revenue. */
    revenue: number;
    salesTax: number;
    profit: number;
    /** How the profit was derived for sales at this price. */
    basis: ProfitBasis;
}

export interface SalesSummary {
    orders: number;
    /** Pre-tax revenue. */
    revenue: number;
    /** Sales tax collected — "set aside $X". */
    salesTax: number;
    profit: number;
    /** Pre-tax revenue ÷ orders. */
    avgOrderValue: number;
}

const WINDOW_DAYS: Record<RangeWindow, number | null> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    all: null,
};

/** A sale that counts toward revenue: an approved Sale (not a refund/decline). */
export function isCountable(txn: Transaction): boolean {
    return txn.result === "Approved" && txn.type === "Sale";
}

/** Precomputed cost lookups so per-transaction resolution stays O(1). */
export interface ProfitIndex {
    /** Keyed by the tax-inclusive menu price — what `txn.amount` records. */
    costByPrice: Map<number, number>;
    blendedFoodCostPercent: number;
    salesTaxRatePercent: number;
}

export function buildProfitIndex(settings: Settings): ProfitIndex {
    const priceGroups = new Map<number, number[]>();
    for (const combination of allCombinations(settings)) {
        const group = priceGroups.get(combination.sellPrice) ?? [];
        group.push(combination.cost);
        priceGroups.set(combination.sellPrice, group);
    }
    const costByPrice = new Map<number, number>();
    for (const [price, costs] of priceGroups) {
        costByPrice.set(price, costs.reduce((a, b) => a + b, 0) / costs.length);
    }
    return {
        costByPrice,
        blendedFoodCostPercent: settings.blendedFoodCostPercent,
        salesTaxRatePercent: settings.salesTaxRatePercent,
    };
}

export function resolveWithIndex(
    txn: Transaction,
    index: ProfitIndex,
): TransactionProfit {
    const grossRevenue = txn.amount;
    const revenue = preTaxAmount(grossRevenue, index.salesTaxRatePercent);
    const salesTax = grossRevenue - revenue;

    const matched = index.costByPrice.get(txn.amount);
    // The blended fallback stays a percent of the GROSS amount — that is how
    // the "blended food cost %" setting has always been calibrated, and it
    // keeps cost estimates identical to the pre-tax-separation dashboard.
    const cost =
        matched !== undefined
            ? matched
            : grossRevenue * (index.blendedFoodCostPercent / 100);
    return {
        grossRevenue,
        revenue,
        salesTax,
        cost,
        profit: revenue - cost,
        basis: matched !== undefined ? "matched" : "blended",
    };
}

/** Public single-transaction resolver (builds the index on demand). */
export function resolveTransactionProfit(
    txn: Transaction,
    settings: Settings,
): TransactionProfit {
    return resolveWithIndex(txn, buildProfitIndex(settings));
}

/** The most recent transaction date, used to anchor relative windows. */
function latestDate(txns: Transaction[]): number {
    let max = 0;
    for (const txn of txns) {
        const time = new Date(txn.date).getTime();
        if (Number.isFinite(time) && time > max) max = time;
    }
    return max || Date.now();
}

/**
 * Keep transactions inside the window, measured back from the latest transaction
 * (so a stale export still shows its own most-recent N days). "all" keeps every
 * row. Does not filter by result — aggregation applies `isCountable`.
 */
export function filterByRange(
    txns: Transaction[],
    range: TimeRange,
): Transaction[] {
    const days = WINDOW_DAYS[range.window];
    if (days === null) return txns;
    const anchor = latestDate(txns);
    const start = anchor - days * 24 * 60 * 60 * 1000;
    return txns.filter((txn) => {
        const time = new Date(txn.date).getTime();
        return Number.isFinite(time) && time >= start;
    });
}

/**
 * Local midnight on the Monday of the week containing `date` — THE definition
 * of a week for the whole dashboard (weekly buckets here, the Weekly Review's
 * boundaries in weeklyReview.ts).
 */
export function startOfWeek(date: Date): Date {
    const result = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
    );
    result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
    return result;
}

function startOf(date: Date, granularity: Granularity): Date {
    if (granularity === "week") return startOfWeek(date);
    const result = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
    );
    if (granularity === "month") result.setDate(1);
    return result;
}

function bucketLabel(date: Date, granularity: Granularity): string {
    if (granularity === "month") {
        return date.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
        });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Group countable sales into day/week/month buckets, sorted oldest-first. */
export function bucketByPeriod(
    txns: Transaction[],
    granularity: Granularity,
    settings: Settings,
): PeriodBucket[] {
    const index = buildProfitIndex(settings);
    const buckets = new Map<string, PeriodBucket>();

    for (const txn of txns) {
        if (!isCountable(txn)) continue;
        const date = new Date(txn.date);
        if (Number.isNaN(date.getTime())) continue;
        const start = startOf(date, granularity);
        const key = start.toISOString();
        const bucket =
            buckets.get(key) ??
            ({
                periodStart: key,
                label: bucketLabel(start, granularity),
                orders: 0,
                revenue: 0,
                salesTax: 0,
                profit: 0,
            } satisfies PeriodBucket);
        const resolved = resolveWithIndex(txn, index);
        bucket.orders += 1;
        bucket.revenue += resolved.revenue;
        bucket.salesTax += resolved.salesTax;
        bucket.profit += resolved.profit;
        buckets.set(key, bucket);
    }

    return Array.from(buckets.values()).sort((a, b) =>
        a.periodStart.localeCompare(b.periodStart),
    );
}

/** Aggregate countable sales by order amount — "units at what price → profit". */
export function pricePointBreakdown(
    txns: Transaction[],
    settings: Settings,
): PricePoint[] {
    const index = buildProfitIndex(settings);
    const points = new Map<
        number,
        {
            orders: number;
            revenue: number;
            salesTax: number;
            profit: number;
            basis: ProfitBasis;
        }
    >();

    for (const txn of txns) {
        if (!isCountable(txn)) continue;
        const resolved = resolveWithIndex(txn, index);
        const point = points.get(txn.amount) ?? {
            orders: 0,
            revenue: 0,
            salesTax: 0,
            profit: 0,
            // Basis depends only on the amount, so it's the same for every sale
            // at this price.
            basis: resolved.basis,
        };
        point.orders += 1;
        point.revenue += resolved.revenue;
        point.salesTax += resolved.salesTax;
        point.profit += resolved.profit;
        points.set(txn.amount, point);
    }

    return Array.from(points.entries())
        .map(([price, point]): PricePoint => ({ price, ...point }))
        .sort((a, b) => a.price - b.price);
}

/** Headline totals for a set of transactions (the stat-card row). */
export function salesSummary(
    txns: Transaction[],
    settings: Settings,
): SalesSummary {
    const index = buildProfitIndex(settings);
    let orders = 0;
    let revenue = 0;
    let salesTax = 0;
    let profit = 0;
    for (const txn of txns) {
        if (!isCountable(txn)) continue;
        const resolved = resolveWithIndex(txn, index);
        orders += 1;
        revenue += resolved.revenue;
        salesTax += resolved.salesTax;
        profit += resolved.profit;
    }
    return {
        orders,
        revenue,
        salesTax,
        profit,
        avgOrderValue: orders > 0 ? revenue / orders : 0,
    };
}
