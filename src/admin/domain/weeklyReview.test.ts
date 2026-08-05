import { describe, expect, test } from "vitest";
import {
    DEFAULT_RECORDS,
    DEFAULT_SETTINGS,
} from "@/test/fixtures/defaultSettings.ts";
import { buildEventReport } from "@/admin/domain/eventAnalytics.ts";
import {
    addDays,
    buildWeeklyReview,
    defaultReviewWeek,
    reserveBalances,
    reserveProgress,
    reviewWeekOptions,
    weekStartKey,
    TRAILING_WEEKS,
} from "@/admin/domain/weeklyReview.ts";
import type {
    OperatingRecords,
    ReserveTransfer,
    Settings,
    Transaction,
} from "@/admin/domain/types.ts";

// The event-report fixtures reuse eventAnalytics.test.ts's exact-arithmetic
// setup: blended 50% + 0% tax, so a $10 sale that matches no menu price
// costs $5. 2026-07-25 is a Saturday (Grogan's Mill) whose week runs Monday
// 2026-07-20 through Sunday 2026-07-26.
const SETTINGS: Settings = {
    ...DEFAULT_SETTINGS,
    blendedFoodCostPercent: 50,
    salesTaxRatePercent: 0,
    employeeHourlyRate: 10,
    emergencyReservePercent: 3,
    expansionFundPercent: 2,
};

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

function transfer(
    id: string,
    date: string,
    fund: ReserveTransfer["fund"],
    amount: number,
): ReserveTransfer {
    return { id, date, fund, amount };
}

describe("week keys", () => {
    test("weekStartKey finds the Monday of any day's week", () => {
        expect(weekStartKey("2026-07-25")).toBe("2026-07-20"); // Saturday
        expect(weekStartKey("2026-07-20")).toBe("2026-07-20"); // Monday itself
        expect(weekStartKey("2026-07-26")).toBe("2026-07-20"); // Sunday → same week
        expect(weekStartKey("2026-07-27")).toBe("2026-07-27"); // next Monday
    });

    test("weekStartKey crosses month boundaries", () => {
        // Aug 1 2026 is a Saturday; its Monday is July 27.
        expect(weekStartKey("2026-08-01")).toBe("2026-07-27");
    });

    test("addDays moves in local calendar days", () => {
        expect(addDays("2026-07-20", 6)).toBe("2026-07-26");
        expect(addDays("2026-07-27", -7)).toBe("2026-07-20");
        expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    });
});

describe("buildWeeklyReview", () => {
    const TRANSACTIONS = [
        sale("1", new Date(2026, 6, 25), 10), // Saturday, in week
        sale("2", new Date(2026, 6, 25), 10),
        sale("3", new Date(2026, 6, 19), 10), // Sunday of the PRIOR week
    ];

    function review(records: OperatingRecords = DEFAULT_RECORDS) {
        const report = buildEventReport(TRANSACTIONS, records, SETTINGS);
        return buildWeeklyReview(report, records, SETTINGS, "2026-07-20");
    }

    test("slices the report to the week and totals it", () => {
        const result = review();
        expect(result.weekEnd).toBe("2026-07-26");
        expect(result.events).toHaveLength(1); // the Jul 19 sale is outside
        expect(result.orders).toBe(2);
        expect(result.grossSales).toBe(20);
        expect(result.preTaxSales).toBe(20); // 0% tax
        expect(result.salesTaxSetAside).toBe(0);
        expect(result.estFoodCost).toBe(10);
        expect(result.contribution).toBe(10); // 20 − 10 food − 0 direct
    });

    test("derives the prescribed transfers from the settings rates", () => {
        const result = review();
        expect(result.emergencyTransfer).toBe(0.6); // 3% of $20
        expect(result.expansionTransfer).toBe(0.4); // 2% of $20
    });

    test("transfer amounts round to cents", () => {
        const report = buildEventReport(
            [sale("1", new Date(2026, 6, 25), 123.45)],
            DEFAULT_RECORDS,
            SETTINGS,
        );
        const result = buildWeeklyReview(
            report,
            DEFAULT_RECORDS,
            SETTINGS,
            "2026-07-20",
        );
        expect(result.emergencyTransfer).toBe(3.7); // 3.7035 → 3.70
        expect(result.expansionTransfer).toBe(2.47); // 2.469 → 2.47
    });

    test("splits the tax out of the week's sales", () => {
        const report = buildEventReport(TRANSACTIONS, DEFAULT_RECORDS, {
            ...SETTINGS,
            salesTaxRatePercent: 25,
        });
        const result = buildWeeklyReview(
            report,
            DEFAULT_RECORDS,
            SETTINGS,
            "2026-07-20",
        );
        expect(result.grossSales).toBe(20);
        expect(result.preTaxSales).toBe(16);
        expect(result.salesTaxSetAside).toBe(4);
    });

    test("a deposit dated in the week marks its fund recorded", () => {
        const result = review({
            ...DEFAULT_RECORDS,
            reserveTransfers: [
                transfer("a", "2026-07-26", "emergency", 0.6),
                transfer("b", "2026-07-13", "expansion", 5), // prior week
                transfer("c", "2026-07-22", "expansion", -2), // withdrawal
            ],
        });
        expect(result.transfersRecorded.emergency).toBe(true);
        expect(result.transfersRecorded.expansion).toBe(false);
    });

    test("an empty week is all zeros and offers no transfers", () => {
        const report = buildEventReport(
            TRANSACTIONS,
            DEFAULT_RECORDS,
            SETTINGS,
        );
        const result = buildWeeklyReview(
            report,
            DEFAULT_RECORDS,
            SETTINGS,
            "2026-08-03",
        );
        expect(result.events).toHaveLength(0);
        expect(result.preTaxSales).toBe(0);
        expect(result.emergencyTransfer).toBe(0);
        expect(result.expansionTransfer).toBe(0);
    });
});

describe("reviewWeekOptions / defaultReviewWeek", () => {
    test("collects distinct weeks from sales, events, and transfers", () => {
        const records: OperatingRecords = {
            ...DEFAULT_RECORDS,
            // An expense-only week (rained out) still needs reviewing.
            events: [
                {
                    date: "2026-07-11",
                    market: "grogans-mill",
                    marketFee: 20,
                    waste: 0,
                    employeeHours: 0,
                    billysHours: 0,
                },
            ],
            reserveTransfers: [transfer("a", "2026-06-28", "emergency", 500)],
        };
        const options = reviewWeekOptions(
            [
                sale("1", new Date(2026, 6, 25), 10),
                sale("2", new Date(2026, 6, 24), 10), // same week as above
            ],
            records,
        );
        expect(options).toEqual(["2026-07-20", "2026-07-06", "2026-06-22"]);
    });

    test("defaults to the most recent complete week", () => {
        const options = ["2026-07-27", "2026-07-20", "2026-07-06"];
        // On Wednesday Jul 29 the current (incomplete) week is Jul 27.
        expect(defaultReviewWeek(options, "2026-07-29")).toBe("2026-07-20");
        // With only current-week activity, fall back to the newest option.
        expect(defaultReviewWeek(["2026-07-27"], "2026-07-29")).toBe(
            "2026-07-27",
        );
        // With no activity at all, review last week.
        expect(defaultReviewWeek([], "2026-07-29")).toBe("2026-07-20");
    });
});

describe("reserves", () => {
    test("balances sum the ledger per fund, withdrawals included", () => {
        const balances = reserveBalances({
            ...DEFAULT_RECORDS,
            reserveTransfers: [
                transfer("a", "2026-07-05", "emergency", 500),
                transfer("b", "2026-07-12", "emergency", 25.5),
                transfer("c", "2026-07-19", "emergency", -100),
                transfer("d", "2026-07-12", "expansion", 40),
            ],
        });
        expect(balances.emergency).toBeCloseTo(425.5);
        expect(balances.expansion).toBeCloseTo(40);
    });

    test("targets derive from the trailing average weekly operating cost", () => {
        // Two active weeks, each one $10 sale costing $5 blended: $5/week.
        const report = buildEventReport(
            [
                sale("1", new Date(2026, 6, 25), 10),
                sale("2", new Date(2026, 6, 18), 10),
            ],
            DEFAULT_RECORDS,
            SETTINGS,
        );
        const progress = reserveProgress(report);
        expect(progress.avgWeeklyOperatingCost).toBe(5);
        expect(progress.targets.map((target) => target.amount)).toEqual([
            500, // the fixed starter target
            10, // two weeks
            20, // one "month" = four weeks
        ]);
    });

    test("the trailing window ignores weeks older than TRAILING_WEEKS", () => {
        // TRAILING_WEEKS cheap weeks ($10 sale → $5 cost) preceded by one huge
        // ancient week that must fall outside the window.
        const sales = Array.from({ length: TRAILING_WEEKS }, (_, week) =>
            sale(`w${week}`, new Date(2026, 6, 25 - 7 * week), 10),
        );
        const ancient = sale("old", new Date(2025, 6, 26), 10_000);
        const progress = reserveProgress(
            buildEventReport([...sales, ancient], DEFAULT_RECORDS, SETTINGS),
        );
        expect(progress.avgWeeklyOperatingCost).toBe(5);
    });

    test("no activity means zero-dollar operating targets", () => {
        const progress = reserveProgress([]);
        expect(progress.avgWeeklyOperatingCost).toBe(0);
        expect(progress.targets[0]).toEqual({
            label: "Starter reserve",
            amount: 500,
        });
        expect(progress.targets[1].amount).toBe(0);
    });
});
