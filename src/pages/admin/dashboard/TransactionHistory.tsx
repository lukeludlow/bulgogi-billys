import { useState } from "react";
import PageMeta from "@/components/PageMeta.tsx";
import DashboardShell from "./DashboardShell.tsx";
import Section from "./Section.tsx";
import ImportData from "./ImportData.tsx";
import NumberField from "./NumberField.tsx";
import PricePointAnalysis from "./PricePointAnalysis.tsx";
import SalesOverTime from "./SalesOverTime.tsx";
import TimeRangeSelector from "./TimeRangeSelector.tsx";
import TransactionsTable from "./TransactionsTable.tsx";
import type { NavSection } from "./DashboardNav.tsx";
import { mergeTransactions } from "./import/mergeTransactions.ts";
import type { TimeRange } from "./salesAnalytics.ts";
import { useSettings } from "@/pages/admin/SettingsContext.tsx";
import type { Transaction } from "./types.ts";

const SECTIONS: NavSection[] = [
    { id: "sales-over-time", label: "Sales Over Time" },
    { id: "price-points", label: "Price Points" },
    { id: "transactions", label: "Transactions" },
    { id: "import-data", label: "Import Data" },
    { id: "assumptions", label: "Assumptions" },
];

export default function TransactionHistory() {
    const { settings, setSettings } = useSettings();
    // The one range that drives every analytics section on this page.
    const [range, setRange] = useState<TimeRange>({
        window: "90d",
        granularity: "week",
    });

    function mergeImportedTransactions(incoming: Transaction[]) {
        setSettings((prev) => ({
            ...prev,
            transactions: mergeTransactions(prev.transactions, incoming)
                .transactions,
        }));
    }

    return (
        <DashboardShell
            title="Transaction History"
            heading="Transaction History"
            intro="Real sales, imported from your processor — revenue, profit, and price-point performance over time."
            sections={SECTIONS}
        >
            <PageMeta
                title="Admin | Transaction History"
                description="Bulgogi Billy's internal sales history and analytics."
                noindex
            />

            {/* One sticky range selector drives every section below. */}
            <div className="sticky top-0 z-10 -mx-6 mt-8 bg-white/95 px-6 py-3 backdrop-blur lg:-mx-10 lg:px-10 dark:bg-zinc-900/95">
                <TimeRangeSelector value={range} onChange={setRange} />
            </div>

            <Section
                id="sales-over-time"
                title="Sales over time"
                description="Real revenue and estimated profit per day, week, or month."
            >
                <SalesOverTime settings={settings} range={range} />
            </Section>

            <Section
                id="price-points"
                title="Price points"
                description="How many orders landed at each price, and the profit each price generated — the view for experimenting with price vs. volume."
            >
                <PricePointAnalysis settings={settings} range={range} />
            </Section>

            <Section
                id="transactions"
                title="Transactions"
                description="Every imported sale, with its estimated profit basis."
            >
                <TransactionsTable settings={settings} range={range} />
            </Section>

            <Section
                id="import-data"
                title="Import data"
                description="Upload your processor's transactions CSV to drive the charts above with real numbers. Re-imports are safe — sales are deduped."
            >
                <ImportData
                    settings={settings}
                    onImportTransactions={mergeImportedTransactions}
                />
            </Section>

            <Section
                id="assumptions"
                title="Assumptions"
                description="How profit is estimated for sales whose amount matches no menu price."
            >
                <div className="rounded-lg bg-white p-4 shadow-sm sm:p-5 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
                    <div className="max-w-xs">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Blended food cost
                        </label>
                        <div className="mt-1">
                            <NumberField
                                aria-label="Blended food cost percent"
                                value={settings.blendedFoodCostPercent}
                                suffix="%"
                                step={1}
                                onChange={(value) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        blendedFoodCostPercent: value,
                                    }))
                                }
                            />
                        </div>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Used to estimate profit for a sale whose amount
                            matches no menu price.
                        </p>
                    </div>
                </div>
            </Section>
        </DashboardShell>
    );
}
