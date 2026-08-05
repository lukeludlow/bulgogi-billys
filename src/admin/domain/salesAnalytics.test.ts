import { expect, test } from "vitest";
import {
    bucketByPeriod,
    filterByRange,
    isCountable,
    pricePointBreakdown,
    resolveTransactionProfit,
    salesSummary,
} from "@/admin/domain/salesAnalytics.ts";
import { DEFAULT_SETTINGS } from "@/test/fixtures/defaultSettings.ts";
import type { Settings, Transaction } from "@/admin/domain/types.ts";

// DEFAULT prices: fries/rice regular = $9, tacos one = $4. $9 matches a menu
// price; $100 matches nothing so it falls back to the blended %.
// Tax rate 0 keeps the long-standing arithmetic exact; the tax split has its
// own tests below at an exact 25%.
const settings: Settings = {
    ...DEFAULT_SETTINGS,
    blendedFoodCostPercent: 32,
    salesTaxRatePercent: 0,
};

const taxed: Settings = { ...settings, salesTaxRatePercent: 25 };

const DAY = 24 * 60 * 60 * 1000;
const LATEST = new Date(2026, 6, 11, 12, 0).getTime(); // Jul 11 2026, local noon

function txn(
    amount: number,
    daysAgo = 0,
    extra: Partial<Transaction> = {},
): Transaction {
    return {
        id: `t${amount}-${daysAgo}-${Math.random()}`,
        date: new Date(LATEST - daysAgo * DAY).toISOString(),
        amount,
        type: "Sale",
        result: "Approved",
        method: "Cash",
        ...extra,
    };
}

test("isCountable only accepts approved sales", () => {
    expect(isCountable(txn(9))).toBe(true);
    expect(isCountable(txn(9, 0, { result: "Declined" }))).toBe(false);
    expect(isCountable(txn(9, 0, { type: "Refund" }))).toBe(false);
});

test("resolveTransactionProfit falls back to blended % for an unmatched amount", () => {
    const resolved = resolveTransactionProfit(txn(100), settings);
    expect(resolved.basis).toBe("blended");
    expect(resolved.cost).toBeCloseTo(32); // 32% of $100
    expect(resolved.profit).toBeCloseTo(68);
});

test("resolveTransactionProfit matches a menu price to its recipe cost", () => {
    const resolved = resolveTransactionProfit(txn(9), settings);
    expect(resolved.basis).toBe("matched");
    expect(resolved.cost).toBeGreaterThan(0);
    expect(resolved.cost).toBeLessThan(9);
});

test("the tax comes out of revenue, but matching still uses the gross amount", () => {
    // $9 IS a menu price. If matching used the pre-tax $7.20 instead of the
    // gross $9, this sale would silently degrade to the blended fallback.
    const resolved = resolveTransactionProfit(txn(9), taxed);
    expect(resolved.basis).toBe("matched");
    expect(resolved.grossRevenue).toBe(9);
    expect(resolved.revenue).toBeCloseTo(7.2);
    expect(resolved.salesTax).toBeCloseTo(1.8);
    expect(resolved.profit).toBeCloseTo(7.2 - resolved.cost);
});

test("the blended fallback stays a percent of the gross amount under tax", () => {
    // Cost estimates must not shift when the tax rate changes — the blended %
    // was calibrated against gross amounts.
    const resolved = resolveTransactionProfit(txn(100), taxed);
    expect(resolved.basis).toBe("blended");
    expect(resolved.cost).toBeCloseTo(32); // 32% of the $100 gross
    expect(resolved.revenue).toBeCloseTo(80);
    expect(resolved.salesTax).toBeCloseTo(20);
    expect(resolved.profit).toBeCloseTo(48);
});

test("filterByRange anchors the window to the latest transaction", () => {
    const txns = [txn(9, 0), txn(9, 3), txn(9, 10), txn(9, 40)];
    expect(
        filterByRange(txns, { window: "7d", granularity: "day" }),
    ).toHaveLength(2);
    expect(
        filterByRange(txns, { window: "30d", granularity: "day" }),
    ).toHaveLength(3);
    expect(
        filterByRange(txns, { window: "all", granularity: "day" }),
    ).toHaveLength(4);
});

test("bucketByPeriod groups countable sales and excludes non-approved", () => {
    const txns = [
        txn(9, 0),
        txn(9, 0),
        txn(9, 1),
        txn(100, 2, { result: "Declined" }), // excluded
    ];
    const daily = bucketByPeriod(txns, "day", settings);
    expect(daily).toHaveLength(2); // two distinct days with approved sales
    const totalOrders = daily.reduce((sum, b) => sum + b.orders, 0);
    expect(totalOrders).toBe(3);
    // Buckets are ordered oldest-first.
    expect(daily[0].periodStart < daily[1].periodStart).toBe(true);
});

test("bucketByPeriod collapses a week into one bucket", () => {
    const txns = [txn(9, 0), txn(9, 1), txn(9, 2)];
    expect(bucketByPeriod(txns, "week", settings)).toHaveLength(1);
});

test("pricePointBreakdown aggregates by amount with a profit basis", () => {
    const txns = [txn(9), txn(9), txn(100)];
    const points = pricePointBreakdown(txns, settings);
    expect(points.map((p) => p.price)).toEqual([9, 100]); // sorted ascending
    expect(points[0]).toMatchObject({ orders: 2, basis: "matched" });
    expect(points[1]).toMatchObject({ orders: 1, basis: "blended" });
});

test("salesSummary totals revenue, profit, and average order value", () => {
    const txns = [txn(9), txn(100), txn(9, 0, { result: "Declined" })];
    const summary = salesSummary(txns, settings);
    expect(summary.orders).toBe(2);
    expect(summary.revenue).toBe(109);
    expect(summary.salesTax).toBe(0);
    expect(summary.avgOrderValue).toBeCloseTo(54.5);
});

test("salesSummary reports pre-tax revenue and the tax set-aside", () => {
    const summary = salesSummary([txn(9), txn(100)], taxed);
    expect(summary.revenue).toBeCloseTo((9 + 100) / 1.25);
    expect(summary.salesTax).toBeCloseTo(109 - 109 / 1.25);
    // revenue + salesTax always reassembles the gross takings.
    expect(summary.revenue + summary.salesTax).toBeCloseTo(109);
});
