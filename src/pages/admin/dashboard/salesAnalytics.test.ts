import { expect, test } from "vitest";
import {
    bucketByPeriod,
    filterByRange,
    isCountable,
    pricePointBreakdown,
    resolveTransactionProfit,
    salesSummary,
} from "./salesAnalytics.ts";
import { DEFAULT_SETTINGS } from "@/test/fixtures/defaultSettings.ts";
import type { Settings, Transaction } from "./types.ts";

// DEFAULT prices: fries/rice regular = $9, tacos one = $4. $9 matches a menu
// price; $100 matches nothing so it falls back to the blended %.
const settings: Settings = { ...DEFAULT_SETTINGS, blendedFoodCostPercent: 32 };

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
    expect(summary.avgOrderValue).toBeCloseTo(54.5);
});
