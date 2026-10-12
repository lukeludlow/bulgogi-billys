// Turns imported transactions + recorded per-event expenses + the purchases
// log into the Event Contribution report: which market each sale belongs to,
// pre-tax sales, and cash contribution per event and per market. Everything
// here is pure.
//
// The market a sale belongs to is derived from its timestamp — the market
// schedules never overlap:
//   Saturday          → Grogan's Mill
//   1st / 3rd Sunday  → New Caney
//   other Sundays     → Farmers Market at 1488 through Oct 11, 2026, when
//                       Billy left it; Other after that
//   any other day     → Other (catering, one-offs)
// A stored day-level override (Settings.marketOverrides) wins over the
// schedule when the heuristic got a day wrong.
//
// All date math uses LOCAL getters, matching bucketByPeriod and the CSV
// importer's local-time parse — the whole dashboard assumes it is imported
// and viewed in the business's own timezone.

import { preTaxAmount } from "@/admin/domain/calculations.ts";
import {
    buildProfitIndex,
    isCountable,
    resolveWithIndex,
} from "@/admin/domain/salesAnalytics.ts";
import {
    MARKETS,
    PURCHASE_CATEGORIES,
    type Market,
    type MarketClassification,
    type MarketEvent,
    type ProcessorFee,
    type Purchase,
    type PurchaseCategory,
    type OperatingRecords,
    type Settings,
    type Transaction,
} from "@/admin/domain/types.ts";

/** Local "YYYY-MM-DD" key for an ISO timestamp. */
export function localDateKey(isoDate: string): string {
    const date = new Date(isoDate);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

/** A local "YYYY-MM-DD" key as a local-midnight Date. */
export function parseLocalDate(dateKey: string): Date {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
}

/** Local midnight after Billy's last Farmers Market at 1488 (Sun Oct 11, 2026). */
const FM_1488_ENDED = new Date(2026, 9, 12);

/** The market whose schedule covers this local calendar day. */
export function marketForDate(date: Date): Market {
    const weekday = date.getDay();
    if (weekday === 6) return "grogans-mill";
    if (weekday === 0) {
        // 0-based occurrence of this Sunday within the month; 1st and 3rd
        // are New Caney, every other Sunday (2nd/4th/5th) was 1488.
        const occurrence = Math.floor((date.getDate() - 1) / 7);
        if (occurrence === 0 || occurrence === 2) return "new-caney";
        return date.getTime() < FM_1488_ENDED.getTime() ? "fm-1488" : "other";
    }
    return "other";
}

/** Schedule-derived market for a day, unless the day has a stored override. */
export function resolveMarket(
    dateKey: string,
    overrides: Record<string, Market>,
): Market {
    return overrides[dateKey] ?? marketForDate(parseLocalDate(dateKey));
}

export function marketForTransaction(
    txn: Transaction,
    overrides: Record<string, Market> = {},
): Market {
    return resolveMarket(localDateKey(txn.date), overrides);
}

// The tax math lives in calculations.ts (the bottom of the domain import
// chain); re-exported here for the event-report callers that always used it.
export { preTaxAmount };

/** Per-category dollar allocation, all categories present (0 when none). */
export type CategoryTotals = Record<PurchaseCategory, number>;

export function emptyCategoryTotals(): CategoryTotals {
    return Object.fromEntries(
        PURCHASE_CATEGORIES.map((category) => [category, 0]),
    ) as CategoryTotals;
}

/** The slice of an event row the allocators need. */
export interface AllocationEvent {
    /** Report key, `${date} ${market}`. */
    key: string;
    /** Local calendar day, "YYYY-MM-DD". */
    date: string;
    /** Tax-inclusive countable revenue. */
    grossSales: number;
    /** The card-paid share of grossSales. */
    cardGross: number;
}

export interface PurchaseAllocation {
    /** Event key → dollars per category allocated to that event. */
    byEvent: Map<string, CategoryTotals>;
    /** Purchases with no event on or after their date to absorb them. */
    unallocated: CategoryTotals;
}

/**
 * Distribute each purchase across the events between it and the next purchase
 * of the same category, proportional to gross sales. (One uniform tax rate
 * means gross and pre-tax weights give identical proportions.)
 *
 * Per category: purchases are grouped by day and walked oldest-first; a
 * group's pool covers the events from its day (inclusive) up to the next
 * purchase day (exclusive). A span with no events folds its pool forward into
 * the next span — restocking twice before a market day lands both purchases
 * on that day. A span whose events all have zero sales splits equally.
 * Events before the category's first purchase get nothing; pool left after
 * the last event is reported as unallocated.
 */
export function allocatePurchases(
    purchases: Purchase[],
    events: AllocationEvent[],
): PurchaseAllocation {
    const byEvent = new Map<string, CategoryTotals>();
    const unallocated = emptyCategoryTotals();
    const sortedEvents = [...events].sort((a, b) =>
        a.date.localeCompare(b.date),
    );

    const add = (key: string, category: PurchaseCategory, amount: number) => {
        const totals = byEvent.get(key) ?? emptyCategoryTotals();
        totals[category] += amount;
        byEvent.set(key, totals);
    };

    for (const category of PURCHASE_CATEGORIES) {
        // Group this category's purchases by day, oldest first.
        const byDate = new Map<string, number>();
        for (const purchase of purchases) {
            if (purchase.category !== category) continue;
            byDate.set(
                purchase.date,
                (byDate.get(purchase.date) ?? 0) + purchase.amount,
            );
        }
        const groups = [...byDate.entries()].sort(([a], [b]) =>
            a.localeCompare(b),
        );

        let carry = 0;
        for (const [index, [spanStart, amount]] of groups.entries()) {
            const pool = amount + carry;
            const spanEnd = groups[index + 1]?.[0]; // undefined = open-ended
            const span = sortedEvents.filter(
                (event) =>
                    event.date >= spanStart &&
                    (spanEnd === undefined || event.date < spanEnd),
            );
            if (span.length === 0) {
                carry = pool;
                continue;
            }
            const totalGross = span.reduce(
                (sum, event) => sum + event.grossSales,
                0,
            );
            for (const event of span) {
                const share =
                    totalGross > 0
                        ? event.grossSales / totalGross
                        : 1 / span.length;
                add(event.key, category, pool * share);
            }
            carry = 0;
        }
        unallocated[category] += carry;
    }

    return { byEvent, unallocated };
}

export interface FeeAllocation {
    /** Event key → this event's share of its month's processor fee. */
    byEvent: Map<string, number>;
    /** Fee dollars for months with no events to absorb them. */
    unallocated: number;
}

/**
 * Spread each month's card-processor fee across that month's events,
 * proportional to card sales — the fee is charged on card volume, so cash-only
 * events carry none of it. Fallbacks: a month with a fee but no card sales
 * weights by all gross sales; with no sales at all it splits equally; a month
 * with no events reports the fee as unallocated rather than losing it.
 */
export function allocateProcessorFees(
    fees: ProcessorFee[],
    events: AllocationEvent[],
): FeeAllocation {
    const byEvent = new Map<string, number>();
    let unallocated = 0;

    for (const fee of fees) {
        const month = events.filter((event) =>
            event.date.startsWith(`${fee.month}-`),
        );
        if (month.length === 0) {
            unallocated += fee.amount;
            continue;
        }
        const cardTotal = month.reduce((sum, e) => sum + e.cardGross, 0);
        const grossTotal = month.reduce((sum, e) => sum + e.grossSales, 0);
        for (const event of month) {
            const share =
                cardTotal > 0
                    ? event.cardGross / cardTotal
                    : grossTotal > 0
                      ? event.grossSales / grossTotal
                      : 1 / month.length;
            byEvent.set(
                event.key,
                (byEvent.get(event.key) ?? 0) + fee.amount * share,
            );
        }
    }

    return { byEvent, unallocated };
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
    /** employeeHours × the market's hourly rate (global rate as fallback). */
    laborCost: number;
    /** This event's share of fuel purchases. */
    fuelCost: number;
    /** This event's share of propane purchases. */
    propaneCost: number;
    /** This event's share of ice purchases. */
    iceCost: number;
    /**
     * This event's share of food purchases — shown as a reality check against
     * estFoodCost, never part of directCosts/contribution.
     */
    allocatedFoodCost: number;
    /** This event's share of its month's card-processor fee. */
    processorFee: number;
    /** marketFee + waste + laborCost + fuel/propane/ice shares + processorFee. */
    directCosts: number;
    /** preTaxSales − estFoodCost − directCosts (§17.1 cash contribution). */
    contribution: number;
}

/** Whether a sale was paid by card (anything but cash), for fee weighting. */
function isCardPayment(txn: Transaction): boolean {
    return txn.method.toLowerCase() !== "cash";
}

interface SalesAccumulator {
    orders: number;
    grossSales: number;
    cardGross: number;
    estFoodCost: number;
}

/** Countable sales bucketed by `${date} ${market}` (override-aware). */
function bucketSales(
    transactions: Transaction[],
    records: OperatingRecords,
    settings: Settings,
): Map<string, SalesAccumulator> {
    const index = buildProfitIndex(settings);
    const sales = new Map<string, SalesAccumulator>();
    for (const txn of transactions) {
        if (!isCountable(txn)) continue;
        const dateKey = localDateKey(txn.date);
        const key = `${dateKey} ${resolveMarket(dateKey, records.marketOverrides)}`;
        const bucket = sales.get(key) ?? {
            orders: 0,
            grossSales: 0,
            cardGross: 0,
            estFoodCost: 0,
        };
        const resolved = resolveWithIndex(txn, index);
        bucket.orders += 1;
        // Gross, not resolved.revenue (pre-tax) — buildEventReport backs the
        // tax out of the summed gross itself, exactly once.
        bucket.grossSales += resolved.grossRevenue;
        if (isCardPayment(txn)) bucket.cardGross += resolved.grossRevenue;
        bucket.estFoodCost += resolved.cost;
        sales.set(key, bucket);
    }
    return sales;
}

/** Every event key (sales-derived ∪ expense rows) as allocator input. */
function allocationEvents(
    sales: Map<string, SalesAccumulator>,
    records: OperatingRecords,
): AllocationEvent[] {
    const keys = new Set([
        ...sales.keys(),
        ...records.events.map((event) => `${event.date} ${event.market}`),
    ]);
    return [...keys].map((key) => {
        const [date] = key.split(" ");
        const sold = sales.get(key);
        return {
            key,
            date,
            grossSales: sold?.grossSales ?? 0,
            cardGross: sold?.cardGross ?? 0,
        };
    });
}

export interface EventAllocations {
    purchases: PurchaseAllocation;
    fees: FeeAllocation;
}

/**
 * The purchase and fee allocations for the current settings — used inside
 * buildEventReport, and by the editors to surface unallocated totals.
 */
export function buildEventAllocations(
    transactions: Transaction[],
    records: OperatingRecords,
    settings: Settings,
): EventAllocations {
    const events = allocationEvents(
        bucketSales(transactions, records, settings),
        records,
    );
    return {
        purchases: allocatePurchases(records.purchases, events),
        fees: allocateProcessorFees(records.processorFees, events),
    };
}

/**
 * One row per event: the union of events derived from sales and events with
 * a recorded expense row (so an expense-only event — a rained-out day, a
 * future booking — still shows up, with a negative contribution).
 * Sorted newest-first.
 */
export function buildEventReport(
    transactions: Transaction[],
    records: OperatingRecords,
    settings: Settings,
): EventReportRow[] {
    const sales = bucketSales(transactions, records, settings);
    const expenseRows = new Map(
        records.events.map((event) => [`${event.date} ${event.market}`, event]),
    );
    const events = allocationEvents(sales, records);
    const purchaseAlloc = allocatePurchases(records.purchases, events);
    const feeAlloc = allocateProcessorFees(records.processorFees, events);

    const rows: EventReportRow[] = [];
    for (const { key } of events) {
        const [date, market] = key.split(" ") as [string, Market];
        const sold = sales.get(key) ?? {
            orders: 0,
            grossSales: 0,
            cardGross: 0,
            estFoodCost: 0,
        };
        const expenses = expenseRows.get(key) ?? null;
        const hourlyRate =
            records.marketHourlyRates[market] ?? settings.employeeHourlyRate;
        const laborCost = expenses ? expenses.employeeHours * hourlyRate : 0;
        const allocated =
            purchaseAlloc.byEvent.get(key) ?? emptyCategoryTotals();
        const processorFee = feeAlloc.byEvent.get(key) ?? 0;
        // Allocated costs land on the event whether or not an expense row was
        // recorded — only the manually-entered fields need the row.
        const directCosts =
            (expenses ? expenses.marketFee + expenses.waste : 0) +
            laborCost +
            allocated.fuel +
            allocated.propane +
            allocated.ice +
            processorFee;
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
            fuelCost: allocated.fuel,
            propaneCost: allocated.propane,
            iceCost: allocated.ice,
            allocatedFoodCost: allocated.food,
            processorFee,
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
    allocatedFoodCost: number;
    directCosts: number;
    contribution: number;
    avgContributionPerEvent: number;
}

/** Totals per market, in fixed MARKETS order (zeros when a market is empty). */
export function rollupByMarket(
    rows: EventReportRow[],
    records: OperatingRecords,
): MarketRollup[] {
    return MARKETS.map((market) => {
        const own = rows.filter((row) => row.market === market);
        const total = (pick: (row: EventReportRow) => number) =>
            own.reduce((sum, row) => sum + pick(row), 0);
        const contribution = total((row) => row.contribution);
        return {
            market,
            classification: records.marketClassifications[market],
            events: own.length,
            grossSales: total((row) => row.grossSales),
            preTaxSales: total((row) => row.preTaxSales),
            estFoodCost: total((row) => row.estFoodCost),
            allocatedFoodCost: total((row) => row.allocatedFoodCost),
            directCosts: total((row) => row.directCosts),
            contribution,
            avgContributionPerEvent:
                own.length > 0 ? contribution / own.length : 0,
        };
    });
}
