import { useMemo } from "react";
import { Input } from "@/shared/catalyst-ui-kit/input.tsx";
import Section from "@/admin/components/Section.tsx";
import EventsTable from "@/admin/components/EventsTable.tsx";
import MarketRollups from "@/admin/components/MarketRollups.tsx";
import NumberField from "@/admin/components/NumberField.tsx";
import ProcessorFeesEditor from "@/admin/components/ProcessorFeesEditor.tsx";
import PurchasesEditor from "@/admin/components/PurchasesEditor.tsx";
import {
    buildEventAllocations,
    buildEventReport,
} from "@/admin/domain/eventAnalytics.ts";
import { MARKET_LABELS } from "@/admin/components/ui/labels.ts";
import { useRecords } from "@/admin/RecordsContext.tsx";
import { useSettings } from "@/admin/SettingsContext.tsx";
import { useTransactions } from "@/admin/TransactionsContext.tsx";
import { MARKETS } from "@/admin/domain/types.ts";
import Card from "@/admin/components/ui/Card.tsx";
import FieldLabel from "@/admin/components/ui/FieldLabel.tsx";

/** Content for /admin/events; AdminLayout supplies the chrome. */
export default function Events() {
    const { settings, setSettings } = useSettings();
    // The Assumptions card below edits both engines side by side: the two
    // rates live on the config document, the per-market rates on the records.
    const { records, setRecords } = useRecords();
    const { transactions } = useTransactions();

    const report = useMemo(
        () => buildEventReport(transactions, records, settings),
        [transactions, records, settings],
    );
    const allocations = useMemo(
        () => buildEventAllocations(transactions, records, settings),
        [transactions, records, settings],
    );

    return (
        <>
            <Section
                id="market-rollups"
                title="Markets"
                description="How each market performs across all its events, and where it stands in the growth plan's classification."
            >
                <MarketRollups report={report} />
            </Section>

            <Section
                id="events"
                title="Events"
                description="One row per market day. Sales and food cost come from imported transactions; fuel, propane, ice, and card fees are allocated from the purchases log and monthly statements; enter the rest of each event's direct costs to see its true cash contribution."
            >
                <EventsTable report={report} />
            </Section>

            <Section
                id="purchases"
                title="Purchases"
                description="Log fuel, propane, ice, and food spending when you buy it. Each purchase is split across the events between that shopping trip and the next one, in proportion to sales."
            >
                <PurchasesEditor
                    unallocated={allocations.purchases.unallocated}
                />
            </Section>

            <Section
                id="assumptions"
                title="Assumptions"
                description="Rates used in the contribution math."
            >
                <div className="flex flex-col gap-5">
                    <Card>
                        <div className="flex flex-col gap-5 sm:flex-row sm:gap-10">
                            <div className="max-w-xs">
                                <FieldLabel>Employee hourly rate</FieldLabel>
                                <div className="mt-1">
                                    <NumberField
                                        aria-label="Employee hourly rate"
                                        value={settings.employeeHourlyRate}
                                        prefix="$"
                                        suffix="/hr"
                                        step={0.5}
                                        onChange={(value) =>
                                            setSettings((prev) => ({
                                                ...prev,
                                                employeeHourlyRate: value,
                                            }))
                                        }
                                    />
                                </div>
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Converts each event&apos;s employee hours
                                    into labor cost. Billy&apos;s hours are
                                    tracked but never subtracted.
                                </p>
                            </div>
                            <div className="max-w-xs">
                                <FieldLabel>Sales tax rate</FieldLabel>
                                <div className="mt-1">
                                    <NumberField
                                        aria-label="Sales tax rate percent"
                                        value={settings.salesTaxRatePercent}
                                        suffix="%"
                                        step={0.25}
                                        onChange={(value) =>
                                            setSettings((prev) => ({
                                                ...prev,
                                                salesTaxRatePercent: value,
                                            }))
                                        }
                                    />
                                </div>
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Menu prices are tax-inclusive, so pre-tax
                                    sales = amount ÷ (1 + rate). That tax money
                                    is set aside, not income.
                                </p>
                            </div>
                        </div>

                        <div className="mt-5">
                            <FieldLabel>Per-market hourly rates</FieldLabel>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Set a different pay rate for a market; leave a
                                field blank to use the global rate above.
                            </p>
                            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {MARKETS.map((market) => (
                                    <div key={market}>
                                        <label className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {MARKET_LABELS[market]}
                                        </label>
                                        <div className="mt-1 flex items-center gap-1.5">
                                            <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                                $
                                            </span>
                                            {/* Not NumberField: blank must stay
                                                null (use global), not become 0. */}
                                            <Input
                                                type="number"
                                                inputMode="decimal"
                                                step={0.5}
                                                min={0}
                                                aria-label={`Hourly rate for ${MARKET_LABELS[market]}`}
                                                placeholder={String(
                                                    settings.employeeHourlyRate,
                                                )}
                                                value={
                                                    records.marketHourlyRates[
                                                        market
                                                    ] ?? ""
                                                }
                                                onChange={(event) => {
                                                    const raw =
                                                        event.target.value;
                                                    setRecords((prev) => ({
                                                        ...prev,
                                                        marketHourlyRates: {
                                                            ...prev.marketHourlyRates,
                                                            [market]:
                                                                raw === ""
                                                                    ? null
                                                                    : Number(
                                                                          raw,
                                                                      ),
                                                        },
                                                    }));
                                                }}
                                            />
                                            <span className="w-8 shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                                                /hr
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <ProcessorFeesEditor
                        unallocated={allocations.fees.unallocated}
                    />
                </div>
            </Section>
        </>
    );
}
