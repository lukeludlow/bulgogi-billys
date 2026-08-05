import { useMemo, useState } from "react";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import { Select } from "@/shared/catalyst-ui-kit/select.tsx";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/catalyst-ui-kit/table.tsx";
import { Text, TextLink } from "@/shared/catalyst-ui-kit/text.tsx";
import NumberField from "@/admin/components/NumberField.tsx";
import ReserveTransfersEditor from "@/admin/components/ReserveTransfersEditor.tsx";
import Section from "@/admin/components/Section.tsx";
import Card from "@/admin/components/ui/Card.tsx";
import EmptyState from "@/admin/components/ui/EmptyState.tsx";
import FieldLabel from "@/admin/components/ui/FieldLabel.tsx";
import StatCard from "@/admin/components/ui/StatCard.tsx";
import { formatCurrency } from "@/admin/components/ui/format.ts";
import { FUND_LABELS, MARKET_LABELS } from "@/admin/components/ui/labels.ts";
import {
    buildEventReport,
    localDateKey,
    parseLocalDate,
} from "@/admin/domain/eventAnalytics.ts";
import { recordWeeklyTransfers } from "@/admin/domain/reserveMutations.ts";
import {
    addDays,
    buildWeeklyReview,
    defaultReviewWeek,
    reserveBalances,
    reserveProgress,
    reviewWeekOptions,
    TRAILING_WEEKS,
} from "@/admin/domain/weeklyReview.ts";
import { useRecords } from "@/admin/RecordsContext.tsx";
import { useSettings } from "@/admin/SettingsContext.tsx";
import { useTransactions } from "@/admin/TransactionsContext.tsx";

/** "Jul 20 – Jul 26, 2026" for a Monday week-start key. */
function weekLabel(weekStart: string): string {
    const start = parseLocalDate(weekStart);
    const end = parseLocalDate(addDays(weekStart, 6));
    const day = (date: Date) =>
        date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${day(start)} – ${day(end)}, ${end.getFullYear()}`;
}

/** Content for /admin/weekly; AdminLayout supplies the chrome. */
export default function WeeklyReview() {
    const { settings, setSettings } = useSettings();
    const { records, setRecords } = useRecords();
    const { transactions } = useTransactions();

    const report = useMemo(
        () => buildEventReport(transactions, records, settings),
        [transactions, records, settings],
    );
    const weekOptions = useMemo(
        () => reviewWeekOptions(transactions, records),
        [transactions, records],
    );

    const [pickedWeek, setPickedWeek] = useState<string | null>(null);
    const weekStart =
        pickedWeek ??
        defaultReviewWeek(weekOptions, localDateKey(new Date().toISOString()));
    // The default week can predate all activity (a brand-new dashboard); it
    // still needs to be a selectable option.
    const options = weekOptions.includes(weekStart)
        ? weekOptions
        : [weekStart, ...weekOptions];

    const review = useMemo(
        () => buildWeeklyReview(report, records, settings, weekStart),
        [report, records, settings, weekStart],
    );
    const balances = useMemo(() => reserveBalances(records), [records]);
    const progress = useMemo(() => reserveProgress(report), [report]);

    const allRecorded =
        review.transfersRecorded.emergency &&
        review.transfersRecorded.expansion;
    const nothingToTransfer =
        review.emergencyTransfer <= 0 && review.expansionTransfer <= 0;

    return (
        <>
            <Section
                id="week"
                title="The week"
                description="Pick the week to review — Monday through Sunday. On a Monday morning this is already last week."
            >
                <div className="flex flex-col gap-4">
                    <Select
                        aria-label="Week to review"
                        className="max-w-64"
                        value={weekStart}
                        onChange={(event) => setPickedWeek(event.target.value)}
                    >
                        {options.map((week) => (
                            <option key={week} value={week}>
                                Week of {weekLabel(week)}
                            </option>
                        ))}
                    </Select>

                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <StatCard
                            label="Pre-tax sales"
                            value={formatCurrency(review.preTaxSales)}
                            sub={`${formatCurrency(review.grossSales)} gross`}
                        />
                        <StatCard
                            label="Tax to set aside"
                            value={formatCurrency(review.salesTaxSetAside)}
                            sub="not income"
                        />
                        <StatCard
                            label="Contribution"
                            value={formatCurrency(review.contribution)}
                            sub="after food & direct costs"
                            tone={review.contribution >= 0 ? "profit" : "loss"}
                        />
                        <StatCard
                            label="Orders"
                            value={review.orders.toLocaleString()}
                            sub={`${review.events.length} event${review.events.length === 1 ? "" : "s"}`}
                        />
                    </div>
                </div>
            </Section>

            <Section
                id="events"
                title="Events"
                description="What each market day contributed this week."
            >
                {review.events.length > 0 ? (
                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table dense className="[--gutter:--spacing(4)]">
                                <TableHead>
                                    <TableRow>
                                        <TableHeader>Date</TableHeader>
                                        <TableHeader>Market</TableHeader>
                                        <TableHeader className="text-right">
                                            Orders
                                        </TableHeader>
                                        <TableHeader className="text-right">
                                            Pre-tax sales
                                        </TableHeader>
                                        <TableHeader className="text-right">
                                            Contribution
                                        </TableHeader>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {review.events.map((row) => (
                                        <TableRow
                                            key={`${row.date} ${row.market}`}
                                        >
                                            <TableCell className="whitespace-nowrap">
                                                {parseLocalDate(
                                                    row.date,
                                                ).toLocaleDateString("en-US", {
                                                    weekday: "short",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </TableCell>
                                            <TableCell>
                                                {MARKET_LABELS[row.market]}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {row.orders}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatCurrency(
                                                    row.preTaxSales,
                                                )}
                                            </TableCell>
                                            <TableCell
                                                className={`text-right font-medium tabular-nums ${
                                                    row.contribution >= 0
                                                        ? "text-green-700 dark:text-green-400"
                                                        : "text-red-600 dark:text-red-400"
                                                }`}
                                            >
                                                {formatCurrency(
                                                    row.contribution,
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <Text className="mt-3 text-sm">
                            Missing an event&apos;s fees, waste, or hours?{" "}
                            <TextLink href="/admin/events">
                                Record them on the Events page
                            </TextLink>{" "}
                            — contribution here updates with them.
                        </Text>
                    </Card>
                ) : (
                    <EmptyState>
                        No sales or recorded events in this week.
                    </EmptyState>
                )}
            </Section>

            <Section
                id="set-aside"
                title="Set aside & transfer"
                description="The Monday routine (§21): protect the tax money, then pay the reserves before anything else."
            >
                <Card>
                    <ol className="flex flex-col gap-3">
                        <li className="flex items-baseline justify-between gap-3">
                            <Text>1. Set aside sales tax</Text>
                            <span className="text-lg font-semibold tabular-nums">
                                {formatCurrency(review.salesTaxSetAside)}
                            </span>
                        </li>
                        <li className="flex items-baseline justify-between gap-3">
                            <Text>
                                2. Transfer to emergency reserve (
                                {settings.emergencyReservePercent}% of pre-tax
                                sales)
                                {review.transfersRecorded.emergency &&
                                    " — recorded ✓"}
                            </Text>
                            <span className="text-lg font-semibold tabular-nums">
                                {formatCurrency(review.emergencyTransfer)}
                            </span>
                        </li>
                        <li className="flex items-baseline justify-between gap-3">
                            <Text>
                                3. Transfer to expansion fund (
                                {settings.expansionFundPercent}%)
                                {review.transfersRecorded.expansion &&
                                    " — recorded ✓"}
                            </Text>
                            <span className="text-lg font-semibold tabular-nums">
                                {formatCurrency(review.expansionTransfer)}
                            </span>
                        </li>
                    </ol>
                    <div className="mt-4">
                        <Button
                            disabled={allRecorded || nothingToTransfer}
                            onClick={() =>
                                setRecords((prev) =>
                                    recordWeeklyTransfers(
                                        prev,
                                        review.weekEnd,
                                        {
                                            emergency: review.transfersRecorded
                                                .emergency
                                                ? 0
                                                : review.emergencyTransfer,
                                            expansion: review.transfersRecorded
                                                .expansion
                                                ? 0
                                                : review.expansionTransfer,
                                        },
                                    ),
                                )
                            }
                        >
                            {allRecorded
                                ? "Transfers recorded"
                                : "Record both transfers"}
                        </Button>
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                            Adds the two deposits to the ledger below, dated{" "}
                            {weekLabel(review.weekStart).split(" – ")[1]}. Move
                            the actual money at the bank — this records that you
                            did.
                        </p>
                    </div>
                </Card>
            </Section>

            <Section
                id="reserves"
                title="Reserves"
                description="Running balances and the growth plan's targets ($500, then two weeks, then a month of operating costs — §27)."
            >
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <StatCard
                            label={FUND_LABELS.emergency}
                            value={formatCurrency(balances.emergency)}
                            sub="balance"
                        />
                        <StatCard
                            label={FUND_LABELS.expansion}
                            value={formatCurrency(balances.expansion)}
                            sub="balance"
                        />
                    </div>

                    <Card>
                        <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                            Emergency reserve progress
                        </Text>
                        <ul className="mt-3 flex flex-col gap-3">
                            {progress.targets.map((target) => {
                                const reached =
                                    target.amount > 0 &&
                                    balances.emergency >= target.amount;
                                const percent =
                                    target.amount > 0
                                        ? Math.min(
                                              100,
                                              (balances.emergency /
                                                  target.amount) *
                                                  100,
                                          )
                                        : 0;
                                return (
                                    <li key={target.label}>
                                        <div className="flex items-baseline justify-between gap-3 text-sm">
                                            <span>
                                                {target.label}
                                                {reached && " ✓"}
                                            </span>
                                            <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                                                {formatCurrency(
                                                    balances.emergency,
                                                )}{" "}
                                                /{" "}
                                                {formatCurrency(target.amount)}
                                            </span>
                                        </div>
                                        <div
                                            role="progressbar"
                                            aria-label={`Progress toward ${target.label}`}
                                            aria-valuenow={Math.round(percent)}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            className="mt-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800"
                                        >
                                            <div
                                                className={`h-2 rounded-full ${reached ? "bg-green-600 dark:bg-green-500" : "bg-blue-600 dark:bg-blue-500"}`}
                                                style={{
                                                    width: `${percent}%`,
                                                }}
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </Card>

                    <ReserveTransfersEditor />
                </div>
            </Section>

            <Section
                id="assumptions"
                title="Assumptions"
                description="Rates and derivations behind the numbers above."
            >
                <Card>
                    <div className="flex flex-col gap-5 sm:flex-row sm:gap-10">
                        <div className="max-w-xs">
                            <FieldLabel>Emergency reserve rate</FieldLabel>
                            <div className="mt-1">
                                <NumberField
                                    aria-label="Emergency reserve percent"
                                    value={settings.emergencyReservePercent}
                                    suffix="%"
                                    step={0.5}
                                    onChange={(value) =>
                                        setSettings((prev) => ({
                                            ...prev,
                                            emergencyReservePercent: value,
                                        }))
                                    }
                                />
                            </div>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Percent of the week&apos;s pre-tax sales the
                                plan sends to the emergency reserve first
                                (§15.1).
                            </p>
                        </div>
                        <div className="max-w-xs">
                            <FieldLabel>Expansion fund rate</FieldLabel>
                            <div className="mt-1">
                                <NumberField
                                    aria-label="Expansion fund percent"
                                    value={settings.expansionFundPercent}
                                    suffix="%"
                                    step={0.5}
                                    onChange={(value) =>
                                        setSettings((prev) => ({
                                            ...prev,
                                            expansionFundPercent: value,
                                        }))
                                    }
                                />
                            </div>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Transferred after the emergency reserve (§15.2).
                            </p>
                        </div>
                    </div>
                    <p className="mt-5 text-xs text-zinc-500 dark:text-zinc-400">
                        The operating-cost targets estimate a week as estimated
                        food cost + direct costs, averaged over the last{" "}
                        {TRAILING_WEEKS} weeks with activity (
                        {formatCurrency(progress.avgWeeklyOperatingCost)}/week
                        right now), and a month as four such weeks.
                    </p>
                </Card>
            </Section>
        </>
    );
}
