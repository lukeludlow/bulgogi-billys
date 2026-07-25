// Turns imported `Transaction[]` into the time-series and price-point numbers the
// dashboard visualizes. Everything here is pure so it can be unit-tested without
// a browser.
//
// The processor only records an order total, so profit per sale is resolved
// best-effort, in priority order:
//   1. itemized  — the sale was labeled by hand; sum each line's recipe cost,
//   2. matched   — the amount equals one or more menu prices; use their avg cost,
//   3. blended   — fall back to the adjustable food-cost % of the amount.

import { allCombinations } from "./calculations.ts";
import type { Settings, Transaction } from "./types.ts";

export type Granularity = "day" | "week" | "month";
export type RangeWindow = "7d" | "30d" | "90d" | "all";
export type ProfitBasis = "itemized" | "matched" | "blended";

export interface TimeRange {
    granularity: Granularity;
    window: RangeWindow;
}

export interface TransactionProfit {
    revenue: number;
    cost: number;
    profit: number;
    basis: ProfitBasis;
    /** Items in the order: summed line quantities when itemized, else 1. */
    units: number;
}

export interface PeriodBucket {
    /** ISO start of the period, for sorting and as a stable key. */
    periodStart: string;
    label: string;
    orders: number;
    revenue: number;
    profit: number;
}

export interface PricePoint {
    price: number;
    orders: number;
    revenue: number;
    profit: number;
    /** How the profit was derived across sales at this price. */
    basis: ProfitBasis | "mixed";
}

export interface SalesSummary {
    orders: number;
    units: number;
    revenue: number;
    profit: number;
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
interface ProfitIndex {
    costByVariant: Map<string, number>;
    costByPrice: Map<number, number>;
    blendedFoodCostPercent: number;
}

function variantKey(itemId: string, variantId: string): string {
    return `${itemId}:${variantId}`;
}

function buildProfitIndex(settings: Settings): ProfitIndex {
    const combinations = allCombinations(settings);
    const costByVariant = new Map<string, number>();
    const priceGroups = new Map<number, number[]>();
    for (const combination of combinations) {
        costByVariant.set(
            variantKey(combination.itemId, combination.variantId),
            combination.cost,
        );
        const group = priceGroups.get(combination.revenue) ?? [];
        group.push(combination.cost);
        priceGroups.set(combination.revenue, group);
    }
    const costByPrice = new Map<number, number>();
    for (const [price, costs] of priceGroups) {
        costByPrice.set(price, costs.reduce((a, b) => a + b, 0) / costs.length);
    }
    return {
        costByVariant,
        costByPrice,
        blendedFoodCostPercent: settings.blendedFoodCostPercent,
    };
}

function resolveWithIndex(
    txn: Transaction,
    index: ProfitIndex,
): TransactionProfit {
    const revenue = txn.amount;

    if (txn.lineItems && txn.lineItems.length > 0) {
        let cost = 0;
        let units = 0;
        for (const line of txn.lineItems) {
            const unitCost =
                index.costByVariant.get(variantKey(line.itemId, line.variantId)) ??
                0;
            cost += unitCost * line.quantity;
            units += line.quantity;
        }
        return { revenue, cost, profit: revenue - cost, basis: "itemized", units };
    }

    const matched = index.costByPrice.get(txn.amount);
    if (matched !== undefined) {
        return {
            revenue,
            cost: matched,
            profit: revenue - matched,
            basis: "matched",
            units: 1,
        };
    }

    const cost = revenue * (index.blendedFoodCostPercent / 100);
    return { revenue, cost, profit: revenue - cost, basis: "blended", units: 1 };
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

function startOf(date: Date, granularity: Granularity): Date {
    const result = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
    );
    if (granularity === "month") {
        result.setDate(1);
    } else if (granularity === "week") {
        // Week starts Monday.
        const day = (result.getDay() + 6) % 7;
        result.setDate(result.getDate() - day);
    }
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
                profit: 0,
            } satisfies PeriodBucket);
        const resolved = resolveWithIndex(txn, index);
        bucket.orders += 1;
        bucket.revenue += resolved.revenue;
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
        { orders: number; revenue: number; profit: number; bases: Set<ProfitBasis> }
    >();

    for (const txn of txns) {
        if (!isCountable(txn)) continue;
        const resolved = resolveWithIndex(txn, index);
        const point = points.get(txn.amount) ?? {
            orders: 0,
            revenue: 0,
            profit: 0,
            bases: new Set<ProfitBasis>(),
        };
        point.orders += 1;
        point.revenue += resolved.revenue;
        point.profit += resolved.profit;
        point.bases.add(resolved.basis);
        points.set(txn.amount, point);
    }

    return Array.from(points.entries())
        .map(
            ([price, point]): PricePoint => ({
                price,
                orders: point.orders,
                revenue: point.revenue,
                profit: point.profit,
                basis: point.bases.size > 1 ? "mixed" : [...point.bases][0],
            }),
        )
        .sort((a, b) => a.price - b.price);
}

/**
 * Sum labeled quantities per `${itemId}:${variantId}` across the itemized,
 * approved sales inside the range. Un-itemized sales carry no per-item breakdown,
 * so only labeled sales contribute.
 */
export function unitsByVariantInRange(
    txns: Transaction[],
    range: TimeRange,
): Map<string, number> {
    const units = new Map<string, number>();
    for (const txn of filterByRange(txns, range)) {
        if (!isCountable(txn) || !txn.lineItems) continue;
        for (const line of txn.lineItems) {
            const key = variantKey(line.itemId, line.variantId);
            units.set(key, (units.get(key) ?? 0) + line.quantity);
        }
    }
    return units;
}

/**
 * A copy of `settings` whose every variant's `unitsSoldThisWeek` is replaced by
 * the units derived from itemized sales in the range (0 when unlabeled). Feeding
 * this to `weeklyStats` / `WeeklySales` makes the per-item breakdown reflect real
 * labeled sales without changing any downstream math.
 */
export function withDerivedUnits(settings: Settings, range: TimeRange): Settings {
    const units = unitsByVariantInRange(settings.transactions, range);
    return {
        ...settings,
        items: settings.items.map((item) => ({
            ...item,
            variants: item.variants.map((variant) => ({
                ...variant,
                unitsSoldThisWeek:
                    units.get(variantKey(item.id, variant.id)) ?? 0,
            })),
        })),
    };
}

/** Headline totals for a set of transactions (the stat-card row). */
export function salesSummary(
    txns: Transaction[],
    settings: Settings,
): SalesSummary {
    const index = buildProfitIndex(settings);
    let orders = 0;
    let units = 0;
    let revenue = 0;
    let profit = 0;
    for (const txn of txns) {
        if (!isCountable(txn)) continue;
        const resolved = resolveWithIndex(txn, index);
        orders += 1;
        units += resolved.units;
        revenue += resolved.revenue;
        profit += resolved.profit;
    }
    return {
        orders,
        units,
        revenue,
        profit,
        avgOrderValue: orders > 0 ? revenue / orders : 0,
    };
}
