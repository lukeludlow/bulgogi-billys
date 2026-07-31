import { describe, expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "./defaults.ts";
import {
    buildEventReport,
    localDateKey,
    marketForDate,
    preTaxAmount,
    rollupByMarket,
} from "./eventAnalytics.ts";
import type { MarketEvent, Settings, Transaction } from "./types.ts";

describe("marketForDate", () => {
    test("Saturdays are Grogan's Mill", () => {
        expect(marketForDate(new Date(2026, 6, 25))).toBe("grogans-mill");
        expect(marketForDate(new Date(2026, 6, 4))).toBe("grogans-mill");
    });

    test("1st and 3rd Sundays are New Caney", () => {
        // July 2026: Sundays fall on the 5th, 12th, 19th, 26th.
        expect(marketForDate(new Date(2026, 6, 5))).toBe("new-caney");
        expect(marketForDate(new Date(2026, 6, 19))).toBe("new-caney");
    });

    test("2nd and 4th Sundays are Farmers Market at 1488", () => {
        expect(marketForDate(new Date(2026, 6, 12))).toBe("fm-1488");
        expect(marketForDate(new Date(2026, 6, 26))).toBe("fm-1488");
    });

    test("a 5th Sunday counts as an 'other Sunday' → 1488", () => {
        // August 2026 has five Sundays; the 30th is the fifth.
        expect(marketForDate(new Date(2026, 7, 30))).toBe("fm-1488");
    });

    test("a month starting on Sunday makes day 1 the 1st Sunday", () => {
        // February and March 2026 both start on a Sunday.
        expect(marketForDate(new Date(2026, 1, 1))).toBe("new-caney");
        expect(marketForDate(new Date(2026, 1, 8))).toBe("fm-1488");
        expect(marketForDate(new Date(2026, 2, 15))).toBe("new-caney");
    });

    test("weekdays are Other", () => {
        expect(marketForDate(new Date(2026, 6, 22))).toBe("other");
    });
});

describe("localDateKey", () => {
    test("uses the local calendar day, zero-padded", () => {
        // Built from local components so the assertion holds in any timezone,
        // including late evening where UTC has already rolled to the next day.
        const lateEvening = new Date(2026, 6, 4, 23, 30).toISOString();
        expect(localDateKey(lateEvening)).toBe("2026-07-04");
    });
});

describe("preTaxAmount", () => {
    test("backs the tax out of a tax-inclusive amount", () => {
        expect(preTaxAmount(10.825, 8.25)).toBeCloseTo(10, 10);
        expect(preTaxAmount(100, 0)).toBe(100);
    });
});

/** A countable sale at local noon on the given local calendar date. */
function sale(id: string, date: Date, amount: number): Transaction {
    return {
        id,
        date: new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            12,
        ).toISOString(),
        amount,
        type: "Sale",
        result: "Approved",
        method: "Tapped",
    };
}

const SATURDAY_EXPENSES: MarketEvent = {
    date: "2026-07-25",
    market: "grogans-mill",
    marketFee: 20,
    fuel: 5,
    propane: 5,
    waste: 0,
    employeeHours: 2,
    billysHours: 6,
};

// blended 50% + 0% tax + $10/hr keep the arithmetic exact: a $10 sale that
// matches no menu price costs $5.
const SETTINGS: Settings = {
    ...DEFAULT_SETTINGS,
    blendedFoodCostPercent: 50,
    salesTaxRatePercent: 0,
    employeeHourlyRate: 10,
    transactions: [
        sale("1", new Date(2026, 6, 25), 10), // Saturday → Grogan's Mill
        sale("2", new Date(2026, 6, 25), 10),
        { ...sale("3", new Date(2026, 6, 25), 10), result: "Declined" },
        sale("4", new Date(2026, 6, 19), 10), // 3rd Sunday → New Caney
    ],
    events: [SATURDAY_EXPENSES],
};

describe("buildEventReport", () => {
    test("groups sales into events and computes contribution", () => {
        const report = buildEventReport(SETTINGS);
        expect(report).toHaveLength(2);

        const saturday = report.find((row) => row.market === "grogans-mill")!;
        expect(saturday.date).toBe("2026-07-25");
        expect(saturday.orders).toBe(2); // declined sale excluded
        expect(saturday.grossSales).toBe(20);
        expect(saturday.preTaxSales).toBe(20);
        expect(saturday.estFoodCost).toBe(10);
        expect(saturday.laborCost).toBe(20); // 2 hrs × $10
        // 20 fee + 5 fuel + 5 propane + 0 waste + 20 labor
        expect(saturday.directCosts).toBe(50);
        // Billy's 6 hours are NOT subtracted: 20 − 10 − 50.
        expect(saturday.contribution).toBe(-40);

        const sunday = report.find((row) => row.market === "new-caney")!;
        expect(sunday.date).toBe("2026-07-19");
        expect(sunday.expenses).toBeNull();
        expect(sunday.directCosts).toBe(0);
        expect(sunday.contribution).toBe(5); // 10 − 5 food cost
    });

    test("applies the sales-tax rate to pre-tax sales and contribution", () => {
        const taxed = buildEventReport({
            ...SETTINGS,
            salesTaxRatePercent: 25,
        });
        const sunday = taxed.find((row) => row.market === "new-caney")!;
        expect(sunday.grossSales).toBe(10);
        expect(sunday.preTaxSales).toBe(8);
        expect(sunday.contribution).toBe(3); // 8 − 5 food cost
    });

    test("an expense row with no sales still produces a report row", () => {
        const report = buildEventReport({
            ...SETTINGS,
            transactions: [],
        });
        expect(report).toHaveLength(1);
        const row = report[0];
        expect(row.orders).toBe(0);
        expect(row.preTaxSales).toBe(0);
        expect(row.contribution).toBe(-50);
    });

    test("rows are sorted newest-first", () => {
        const report = buildEventReport(SETTINGS);
        expect(report.map((row) => row.date)).toEqual([
            "2026-07-25",
            "2026-07-19",
        ]);
    });
});

describe("rollupByMarket", () => {
    test("totals per market in fixed order, zeros for empty markets", () => {
        const settings: Settings = {
            ...SETTINGS,
            marketClassifications: {
                ...SETTINGS.marketClassifications,
                "grogans-mill": "core",
            },
        };
        const rollups = rollupByMarket(buildEventReport(settings), settings);

        expect(rollups.map((rollup) => rollup.market)).toEqual([
            "grogans-mill",
            "new-caney",
            "fm-1488",
            "other",
        ]);

        const grogans = rollups[0];
        expect(grogans.classification).toBe("core");
        expect(grogans.events).toBe(1);
        expect(grogans.contribution).toBe(-40);
        expect(grogans.avgContributionPerEvent).toBe(-40);

        const fm1488 = rollups[2];
        expect(fm1488.events).toBe(0);
        expect(fm1488.contribution).toBe(0);
        expect(fm1488.avgContributionPerEvent).toBe(0);
        expect(fm1488.classification).toBeNull();
    });
});
