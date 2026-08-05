import { useState } from "react";
import PageMeta from "@/shared/PageMeta.tsx";
import DashboardShell from "@/admin/components/DashboardShell.tsx";
import Section from "@/admin/components/Section.tsx";
import ImportData from "@/admin/components/ImportData.tsx";
import NumberField from "@/admin/components/NumberField.tsx";
import PricePointAnalysis from "@/admin/components/PricePointAnalysis.tsx";
import SalesOverTime from "@/admin/components/SalesOverTime.tsx";
import TimeRangeSelector from "@/admin/components/TimeRangeSelector.tsx";
import TransactionsTable from "@/admin/components/TransactionsTable.tsx";
import type { NavSection } from "@/admin/components/DashboardNav.tsx";
import type { TimeRange } from "@/admin/domain/salesAnalytics.ts";
import { useSettings } from "@/admin/SettingsContext.tsx";
import { useTransactions } from "@/admin/TransactionsContext.tsx";
import Card from "@/admin/components/ui/Card.tsx";
import FieldLabel from "@/admin/components/ui/FieldLabel.tsx";

const SECTIONS: NavSection[] = [
    { id: "sales-over-time", label: "Sales Over Time" },
    { id: "price-points", label: "Price Points" },
    { id: "transactions", label: "Transactions" },
    { id: "import-data", label: "Import Data" },
    { id: "assumptions", label: "Assumptions" },
];

export default function TransactionHistory() {
    const { settings, setSettings } = useSettings();
    const { transactions, importTransactions } = useTransactions();
    // The one range that drives every analytics section on this page.
    const [range, setRange] = useState<TimeRange>({
        window: "90d",
        granularity: "week",
    });

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
                <SalesOverTime
                    settings={settings}
                    transactions={transactions}
                    range={range}
                />
            </Section>

            <Section
                id="price-points"
                title="Price points"
                description="How many orders landed at each price, and the profit each price generated — the view for experimenting with price vs. volume."
            >
                <PricePointAnalysis
                    settings={settings}
                    transactions={transactions}
                    range={range}
                />
            </Section>

            <Section
                id="transactions"
                title="Transactions"
                description="Every imported sale, with its estimated profit basis."
            >
                <TransactionsTable
                    settings={settings}
                    transactions={transactions}
                    range={range}
                />
            </Section>

            <Section
                id="import-data"
                title="Import data"
                description="Upload your processor's transactions CSV to drive the charts above with real numbers. Re-imports are safe — sales are deduped."
            >
                <ImportData
                    transactions={transactions}
                    onImportTransactions={importTransactions}
                />
            </Section>

            <Section
                id="assumptions"
                title="Assumptions"
                description="How profit is estimated for sales whose amount matches no menu price."
            >
                <Card>
                    <div className="max-w-xs">
                        <FieldLabel>Blended food cost</FieldLabel>
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
                </Card>
            </Section>
        </DashboardShell>
    );
}
