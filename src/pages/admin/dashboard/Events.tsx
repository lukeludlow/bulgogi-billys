import { useMemo } from "react";
import PageMeta from "@/components/PageMeta.tsx";
import { Input } from "@/components/catalyst-ui-kit/input.tsx";
import DashboardShell from "./DashboardShell.tsx";
import Section from "./Section.tsx";
import EventsTable from "./EventsTable.tsx";
import MarketRollups from "./MarketRollups.tsx";
import NumberField from "./NumberField.tsx";
import ProcessorFeesEditor from "./ProcessorFeesEditor.tsx";
import PurchasesEditor from "./PurchasesEditor.tsx";
import type { NavSection } from "./DashboardNav.tsx";
import {
    MARKET_LABELS,
    buildEventAllocations,
    buildEventReport,
} from "./eventAnalytics.ts";
import { useSettings } from "../SettingsContext.tsx";
import { MARKETS } from "./types.ts";

const SECTIONS: NavSection[] = [
    { id: "market-rollups", label: "Markets" },
    { id: "events", label: "Events" },
    { id: "purchases", label: "Purchases" },
    { id: "assumptions", label: "Assumptions" },
];

export default function Events() {
    const { settings, setSettings } = useSettings();

    const report = useMemo(() => buildEventReport(settings), [settings]);
    const allocations = useMemo(
        () => buildEventAllocations(settings),
        [settings],
    );

    return (
        <DashboardShell
            title="Events"
            heading="Events"
            intro="Cash contribution per market event — every sale assigned to its market automatically, minus food cost and the direct costs you record here."
            sections={SECTIONS}
        >
            <PageMeta
                title="Admin | Events"
                description="Bulgogi Billy's internal event contribution report."
                noindex
            />

            <Section
                id="market-rollups"
                title="Markets"
                description="How each market performs across all its events, and where it stands in the growth plan's classification."
            >
                <MarketRollups
                    settings={settings}
                    setSettings={setSettings}
                    report={report}
                />
            </Section>

            <Section
                id="events"
                title="Events"
                description="One row per market day. Sales and food cost come from imported transactions; fuel, propane, ice, and card fees are allocated from the purchases log and monthly statements; enter the rest of each event's direct costs to see its true cash contribution."
            >
                <EventsTable
                    settings={settings}
                    setSettings={setSettings}
                    report={report}
                />
            </Section>

            <Section
                id="purchases"
                title="Purchases"
                description="Log fuel, propane, ice, and food spending when you buy it. Each purchase is split across the events between that shopping trip and the next one, in proportion to sales."
            >
                <PurchasesEditor
                    settings={settings}
                    setSettings={setSettings}
                    unallocated={allocations.purchases.unallocated}
                />
            </Section>

            <Section
                id="assumptions"
                title="Assumptions"
                description="Rates used in the contribution math."
            >
                <div className="flex flex-col gap-5">
                    <div className="rounded-lg bg-white p-4 shadow-sm sm:p-5 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
                        <div className="flex flex-col gap-5 sm:flex-row sm:gap-10">
                            <div className="max-w-xs">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Employee hourly rate
                                </label>
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
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Sales tax rate
                                </label>
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
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Per-market hourly rates
                            </label>
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
                                                    settings.marketHourlyRates[
                                                        market
                                                    ] ?? ""
                                                }
                                                onChange={(event) => {
                                                    const raw =
                                                        event.target.value;
                                                    setSettings((prev) => ({
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
                    </div>

                    <ProcessorFeesEditor
                        settings={settings}
                        setSettings={setSettings}
                        unallocated={allocations.fees.unallocated}
                    />
                </div>
            </Section>
        </DashboardShell>
    );
}
