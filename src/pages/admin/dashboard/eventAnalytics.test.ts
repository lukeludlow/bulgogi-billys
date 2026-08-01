import { describe, expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "@/test/fixtures/defaultSettings.ts";
import {
    allocatePurchases,
    allocateProcessorFees,
    buildEventAllocations,
    buildEventReport,
    localDateKey,
    marketForDate,
    parseLocalDate,
    preTaxAmount,
    resolveMarket,
    rollupByMarket,
    type AllocationEvent,
} from "./eventAnalytics.ts";
import type { MarketEvent, Purchase, Settings, Transaction } from "./types.ts";

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

describe("parseLocalDate", () => {
    test("round-trips with localDateKey at local midnight", () => {
        const date = parseLocalDate("2026-07-04");
        expect(date.getFullYear()).toBe(2026);
        expect(date.getMonth()).toBe(6);
        expect(date.getDate()).toBe(4);
        expect(localDateKey(date.toISOString())).toBe("2026-07-04");
    });
});

describe("resolveMarket", () => {
    test("falls back to the schedule when no override exists", () => {
        expect(resolveMarket("2026-07-25", {})).toBe("grogans-mill");
    });

    test("a stored override wins over the schedule", () => {
        expect(resolveMarket("2026-07-25", { "2026-07-25": "new-caney" })).toBe(
            "new-caney",
        );
    });
});

describe("preTaxAmount", () => {
    test("backs the tax out of a tax-inclusive amount", () => {
        expect(preTaxAmount(10.825, 8.25)).toBeCloseTo(10, 10);
        expect(preTaxAmount(100, 0)).toBe(100);
    });
});

function allocEvent(
    date: string,
    grossSales: number,
    cardGross = grossSales,
): AllocationEvent {
    return { key: `${date} grogans-mill`, date, grossSales, cardGross };
}

function purchase(
    id: string,
    date: string,
    category: Purchase["category"],
    amount: number,
): Purchase {
    return { id, date, category, amount };
}

describe("allocatePurchases", () => {
    test("splits a purchase across its span proportional to sales", () => {
        const events = [
            allocEvent("2026-07-25", 300),
            allocEvent("2026-07-26", 100),
        ];
        const { byEvent, unallocated } = allocatePurchases(
            [purchase("p1", "2026-07-24", "propane", 40)],
            events,
        );
        expect(byEvent.get(events[0].key)?.propane).toBeCloseTo(30);
        expect(byEvent.get(events[1].key)?.propane).toBeCloseTo(10);
        expect(unallocated.propane).toBe(0);
    });

    test("a purchase covers events up to (exclusive) the next purchase", () => {
        const events = [
            allocEvent("2026-07-18", 100),
            allocEvent("2026-07-25", 100),
        ];
        const { byEvent } = allocatePurchases(
            [
                purchase("p1", "2026-07-17", "fuel", 30),
                purchase("p2", "2026-07-24", "fuel", 50),
            ],
            events,
        );
        expect(byEvent.get(events[0].key)?.fuel).toBe(30);
        expect(byEvent.get(events[1].key)?.fuel).toBe(50);
    });

    test("an event on the purchase date is included in the span", () => {
        const events = [allocEvent("2026-07-25", 100)];
        const { byEvent } = allocatePurchases(
            [purchase("p1", "2026-07-25", "ice", 8)],
            events,
        );
        expect(byEvent.get(events[0].key)?.ice).toBe(8);
    });

    test("events before the first purchase get nothing", () => {
        const events = [
            allocEvent("2026-07-11", 100),
            allocEvent("2026-07-25", 100),
        ];
        const { byEvent } = allocatePurchases(
            [purchase("p1", "2026-07-20", "fuel", 40)],
            events,
        );
        expect(byEvent.get(events[0].key)).toBeUndefined();
        expect(byEvent.get(events[1].key)?.fuel).toBe(40);
    });

    test("a span with no events folds its pool into the next span", () => {
        // Bought propane Wednesday, more Friday; first event Saturday.
        const events = [allocEvent("2026-07-25", 100)];
        const { byEvent, unallocated } = allocatePurchases(
            [
                purchase("p1", "2026-07-22", "propane", 30),
                purchase("p2", "2026-07-24", "propane", 20),
            ],
            events,
        );
        expect(byEvent.get(events[0].key)?.propane).toBe(50);
        expect(unallocated.propane).toBe(0);
    });

    test("a zero-sales span splits the pool equally", () => {
        const events = [
            allocEvent("2026-07-25", 0),
            allocEvent("2026-07-26", 0),
        ];
        const { byEvent } = allocatePurchases(
            [purchase("p1", "2026-07-24", "fuel", 10)],
            events,
        );
        expect(byEvent.get(events[0].key)?.fuel).toBe(5);
        expect(byEvent.get(events[1].key)?.fuel).toBe(5);
    });

    test("purchases after the last event are reported unallocated", () => {
        const { byEvent, unallocated } = allocatePurchases(
            [purchase("p1", "2026-07-28", "food", 120)],
            [allocEvent("2026-07-25", 100)],
        );
        expect(byEvent.size).toBe(0);
        expect(unallocated.food).toBe(120);
    });

    test("same-date purchases in one category pool together", () => {
        const events = [allocEvent("2026-07-25", 100)];
        const { byEvent } = allocatePurchases(
            [
                purchase("p1", "2026-07-24", "fuel", 10),
                purchase("p2", "2026-07-24", "fuel", 15),
            ],
            events,
        );
        expect(byEvent.get(events[0].key)?.fuel).toBe(25);
    });

    test("categories allocate independently", () => {
        const events = [
            allocEvent("2026-07-18", 100),
            allocEvent("2026-07-25", 100),
        ];
        const { byEvent } = allocatePurchases(
            [
                purchase("p1", "2026-07-17", "fuel", 30),
                purchase("p2", "2026-07-24", "propane", 20),
            ],
            events,
        );
        expect(byEvent.get(events[0].key)?.fuel).toBe(15);
        expect(byEvent.get(events[1].key)?.fuel).toBe(15);
        expect(byEvent.get(events[0].key)?.propane ?? 0).toBe(0);
        expect(byEvent.get(events[1].key)?.propane).toBe(20);
    });
});

describe("allocateProcessorFees", () => {
    test("splits a month's fee proportional to card sales", () => {
        const events = [
            allocEvent("2026-07-11", 200, 150),
            allocEvent("2026-07-25", 200, 50),
        ];
        const { byEvent, unallocated } = allocateProcessorFees(
            [{ month: "2026-07", amount: 80 }],
            events,
        );
        expect(byEvent.get(events[0].key)).toBeCloseTo(60);
        expect(byEvent.get(events[1].key)).toBeCloseTo(20);
        expect(unallocated).toBe(0);
    });

    test("cash-only events carry none of the fee", () => {
        const events = [
            allocEvent("2026-07-11", 200, 200),
            allocEvent("2026-07-25", 500, 0), // all cash
        ];
        const { byEvent } = allocateProcessorFees(
            [{ month: "2026-07", amount: 30 }],
            events,
        );
        expect(byEvent.get(events[0].key)).toBe(30);
        expect(byEvent.get(events[1].key) ?? 0).toBe(0);
    });

    test("a month with no card sales falls back to gross-sales weighting", () => {
        const events = [
            allocEvent("2026-07-11", 300, 0),
            allocEvent("2026-07-25", 100, 0),
        ];
        const { byEvent } = allocateProcessorFees(
            [{ month: "2026-07", amount: 40 }],
            events,
        );
        expect(byEvent.get(events[0].key)).toBeCloseTo(30);
        expect(byEvent.get(events[1].key)).toBeCloseTo(10);
    });

    test("a month with no sales at all splits equally", () => {
        const events = [
            allocEvent("2026-07-11", 0, 0),
            allocEvent("2026-07-25", 0, 0),
        ];
        const { byEvent } = allocateProcessorFees(
            [{ month: "2026-07", amount: 10 }],
            events,
        );
        expect(byEvent.get(events[0].key)).toBe(5);
        expect(byEvent.get(events[1].key)).toBe(5);
    });

    test("a month with no events reports the fee as unallocated", () => {
        const { byEvent, unallocated } = allocateProcessorFees(
            [{ month: "2026-06", amount: 55 }],
            [allocEvent("2026-07-11", 100)],
        );
        expect(byEvent.size).toBe(0);
        expect(unallocated).toBe(55);
    });

    test("events in other months don't absorb the fee", () => {
        const june = {
            ...allocEvent("2026-06-27", 100),
            key: "2026-06-27 grogans-mill",
        };
        const july = allocEvent("2026-07-11", 100);
        const { byEvent } = allocateProcessorFees(
            [{ month: "2026-07", amount: 12 }],
            [june, july],
        );
        expect(byEvent.get(june.key)).toBeUndefined();
        expect(byEvent.get(july.key)).toBe(12);
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
        // 20 fee + 0 waste + 20 labor (no purchases logged)
        expect(saturday.directCosts).toBe(40);
        // Billy's 6 hours are NOT subtracted: 20 − 10 − 40.
        expect(saturday.contribution).toBe(-30);

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
        expect(row.contribution).toBe(-40);
    });

    test("a market override re-tags the day's sales and expense row", () => {
        const report = buildEventReport({
            ...SETTINGS,
            events: [{ ...SATURDAY_EXPENSES, market: "new-caney" }],
            marketOverrides: { "2026-07-25": "new-caney" },
        });
        // The Saturday sales now land on new-caney with the expense row.
        const saturday = report.find((row) => row.date === "2026-07-25")!;
        expect(saturday.market).toBe("new-caney");
        expect(saturday.grossSales).toBe(20);
        expect(saturday.expenses).not.toBeNull();
        expect(report.filter((row) => row.date === "2026-07-25")).toHaveLength(
            1,
        );
    });

    test("allocated purchases and fees land on events without expense rows", () => {
        const report = buildEventReport({
            ...SETTINGS,
            purchases: [purchase("p1", "2026-07-19", "propane", 8)],
            processorFees: [{ month: "2026-07", amount: 6 }],
        });
        const sunday = report.find((row) => row.market === "new-caney")!;
        expect(sunday.expenses).toBeNull();
        // Propane span covers the Sunday (19th) up to the next purchase
        // (none), so both events split by gross: 10 vs 20 → but the span
        // starts on the 19th, so both the 19th and 25th are inside it.
        expect(sunday.propaneCost).toBeCloseTo(8 * (10 / 30));
        // Fee weighted by card gross; every sale here is card.
        expect(sunday.processorFee).toBeCloseTo(6 * (10 / 30));
        expect(sunday.directCosts).toBeCloseTo(8 * (10 / 30) + 6 * (10 / 30));
    });

    test("food purchases show as reference but never hit contribution", () => {
        const base = buildEventReport(SETTINGS);
        const withFood = buildEventReport({
            ...SETTINGS,
            purchases: [purchase("p1", "2026-07-19", "food", 100)],
        });
        const sunday = withFood.find((row) => row.market === "new-caney")!;
        expect(sunday.allocatedFoodCost).toBeCloseTo(100 * (10 / 30));
        expect(sunday.contribution).toBe(
            base.find((row) => row.market === "new-caney")!.contribution,
        );
    });

    test("labor uses the per-market rate when set, global otherwise", () => {
        const report = buildEventReport({
            ...SETTINGS,
            marketHourlyRates: {
                ...SETTINGS.marketHourlyRates,
                "grogans-mill": 15,
            },
        });
        const saturday = report.find((row) => row.market === "grogans-mill")!;
        expect(saturday.laborCost).toBe(30); // 2 hrs × $15 market rate
        // 20 fee + 30 labor
        expect(saturday.directCosts).toBe(50);
    });

    test("rows are sorted newest-first", () => {
        const report = buildEventReport(SETTINGS);
        expect(report.map((row) => row.date)).toEqual([
            "2026-07-25",
            "2026-07-19",
        ]);
    });
});

describe("buildEventAllocations", () => {
    test("surfaces unallocated purchase and fee totals", () => {
        const { purchases, fees } = buildEventAllocations({
            ...SETTINGS,
            purchases: [purchase("p1", "2026-07-28", "fuel", 45)],
            processorFees: [{ month: "2026-05", amount: 33 }],
        });
        expect(purchases.unallocated.fuel).toBe(45);
        expect(fees.unallocated).toBe(33);
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
        expect(grogans.contribution).toBe(-30);
        expect(grogans.avgContributionPerEvent).toBe(-30);

        const fm1488 = rollups[2];
        expect(fm1488.events).toBe(0);
        expect(fm1488.contribution).toBe(0);
        expect(fm1488.avgContributionPerEvent).toBe(0);
        expect(fm1488.classification).toBeNull();
    });
});
