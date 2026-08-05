// The Monday review (growth plan §21): one week of events, the sales tax to
// set aside, and the prescribed reserve transfers (§15.1–15.2) — derived from
// the same event report the Events page shows, so the two pages can never
// disagree. Balances and targets for the §27 reserve ladder live here too.
// Everything is pure.

import { startOfWeek } from "@/admin/domain/salesAnalytics.ts";
import {
    localDateKey,
    parseLocalDate,
    type EventReportRow,
} from "@/admin/domain/eventAnalytics.ts";
import {
    RESERVE_FUNDS,
    type OperatingRecords,
    type ReserveFund,
    type Transaction,
} from "@/admin/domain/types.ts";

const roundCents = (value: number) => Math.round(value * 100) / 100;

/** Local "YYYY-MM-DD" of the Monday starting the week that contains dateKey. */
export function weekStartKey(dateKey: string): string {
    return localDateKey(startOfWeek(parseLocalDate(dateKey)).toISOString());
}

/** dateKey moved by `days` local calendar days. */
export function addDays(dateKey: string, days: number): string {
    const date = parseLocalDate(dateKey);
    date.setDate(date.getDate() + days);
    return localDateKey(date.toISOString());
}

/** The rates the review derives its transfers from — a Settings subset. */
export interface TransferRates {
    emergencyReservePercent: number;
    expansionFundPercent: number;
}

export interface WeeklyReview {
    /** Monday, local "YYYY-MM-DD". */
    weekStart: string;
    /** Sunday, inclusive. */
    weekEnd: string;
    /** The week's slice of the event report, newest first. */
    events: EventReportRow[];
    orders: number;
    grossSales: number;
    preTaxSales: number;
    /** grossSales − preTaxSales: the state's money, not income. */
    salesTaxSetAside: number;
    estFoodCost: number;
    directCosts: number;
    contribution: number;
    /** preTaxSales × the emergency rate, rounded to cents (§15.1). */
    emergencyTransfer: number;
    /** preTaxSales × the expansion rate, rounded to cents (§15.2). */
    expansionTransfer: number;
    /** Whether a deposit into each fund is already dated within this week. */
    transfersRecorded: Record<ReserveFund, boolean>;
}

/**
 * One week's numbers, sliced out of the full event report (pass the same
 * `buildEventReport` result the Events page renders — nothing is recomputed).
 */
export function buildWeeklyReview(
    report: EventReportRow[],
    records: OperatingRecords,
    rates: TransferRates,
    weekStart: string,
): WeeklyReview {
    const weekEnd = addDays(weekStart, 6);
    const events = report.filter(
        (row) => row.date >= weekStart && row.date <= weekEnd,
    );
    const total = (pick: (row: EventReportRow) => number) =>
        events.reduce((sum, row) => sum + pick(row), 0);

    const grossSales = total((row) => row.grossSales);
    const preTaxSales = total((row) => row.preTaxSales);

    // A deposit dated in the week counts as recorded, whoever made it — the
    // one-click button and a hand-entered row are the same event. Withdrawals
    // don't count.
    const transfersRecorded = Object.fromEntries(
        RESERVE_FUNDS.map((fund) => [
            fund,
            records.reserveTransfers.some(
                (transfer) =>
                    transfer.fund === fund &&
                    transfer.amount > 0 &&
                    transfer.date >= weekStart &&
                    transfer.date <= weekEnd,
            ),
        ]),
    ) as Record<ReserveFund, boolean>;

    return {
        weekStart,
        weekEnd,
        events,
        orders: total((row) => row.orders),
        grossSales,
        preTaxSales,
        salesTaxSetAside: grossSales - preTaxSales,
        estFoodCost: total((row) => row.estFoodCost),
        directCosts: total((row) => row.directCosts),
        contribution: total((row) => row.contribution),
        emergencyTransfer: roundCents(
            preTaxSales * (rates.emergencyReservePercent / 100),
        ),
        expansionTransfer: roundCents(
            preTaxSales * (rates.expansionFundPercent / 100),
        ),
        transfersRecorded,
    };
}

/**
 * Weeks with any activity — a sale, an expense row, or a recorded transfer —
 * newest first: the week picker's options.
 */
export function reviewWeekOptions(
    transactions: Transaction[],
    records: OperatingRecords,
): string[] {
    const weeks = new Set<string>();
    for (const txn of transactions) {
        weeks.add(weekStartKey(localDateKey(txn.date)));
    }
    for (const event of records.events) weeks.add(weekStartKey(event.date));
    for (const transfer of records.reserveTransfers) {
        weeks.add(weekStartKey(transfer.date));
    }
    return [...weeks].sort((a, b) => b.localeCompare(a));
}

/**
 * The default week to review: the most recent COMPLETE week with activity —
 * on a Monday morning, that's last week. Falls back to the newest option,
 * then to the week before `todayKey` when nothing is recorded at all.
 */
export function defaultReviewWeek(options: string[], todayKey: string): string {
    const currentWeek = weekStartKey(todayKey);
    return (
        options.find((week) => week < currentWeek) ??
        options[0] ??
        addDays(currentWeek, -7)
    );
}

/** Current fund balances: the ledger, summed. */
export function reserveBalances(
    records: OperatingRecords,
): Record<ReserveFund, number> {
    const balances = Object.fromEntries(
        RESERVE_FUNDS.map((fund) => [fund, 0]),
    ) as Record<ReserveFund, number>;
    for (const transfer of records.reserveTransfers) {
        balances[transfer.fund] += transfer.amount;
    }
    return balances;
}

export interface ReserveTarget {
    label: string;
    amount: number;
}

export interface ReserveProgress {
    /** The trailing average the operating-cost targets derive from. */
    avgWeeklyOperatingCost: number;
    /** §27's emergency-reserve ladder: $500 → two weeks → one month. */
    targets: ReserveTarget[];
}

/** How many trailing active weeks the operating-cost average looks back over. */
export const TRAILING_WEEKS = 8;

/**
 * The §27 reserve targets. The plan's ladder is "$500, then two weeks, then
 * one month of operating costs"; a week of operating cost is approximated as
 * estimated food cost + direct costs, averaged over the last TRAILING_WEEKS
 * weeks that had any activity, and a month as four such weeks. That
 * derivation is an assumption — the page states it outright.
 */
export function reserveProgress(report: EventReportRow[]): ReserveProgress {
    const byWeek = new Map<string, number>();
    for (const row of report) {
        const week = weekStartKey(row.date);
        byWeek.set(
            week,
            (byWeek.get(week) ?? 0) + row.estFoodCost + row.directCosts,
        );
    }
    const recent = [...byWeek.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, TRAILING_WEEKS);
    const avgWeeklyOperatingCost =
        recent.length > 0
            ? recent.reduce((sum, [, cost]) => sum + cost, 0) / recent.length
            : 0;
    return {
        avgWeeklyOperatingCost: roundCents(avgWeeklyOperatingCost),
        targets: [
            { label: "Starter reserve", amount: 500 },
            {
                label: "Two weeks of operating costs",
                amount: roundCents(avgWeeklyOperatingCost * 2),
            },
            {
                label: "One month of operating costs",
                amount: roundCents(avgWeeklyOperatingCost * 4),
            },
        ],
    };
}
