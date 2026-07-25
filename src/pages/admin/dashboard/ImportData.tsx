import { useState } from "react";
import { Button } from "@/components/catalyst-ui-kit/button.tsx";
import { Text } from "@/components/catalyst-ui-kit/text.tsx";
import { parseTransactionsCsv } from "./import/parseTransactionsCsv.ts";
import { mergeTransactions } from "./import/mergeTransactions.ts";
import type { Settings, Transaction } from "./types.ts";

interface Props {
    settings: Settings;
    onImportTransactions: (transactions: Transaction[]) => void;
}

interface TxnPreview {
    transactions: Transaction[];
    added: number;
    duplicates: number;
    range: string;
}

const inputClass =
    "block w-full text-sm text-zinc-600 dark:text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:file:bg-white/10 dark:file:text-zinc-200 dark:hover:file:bg-white/15";

export default function ImportData({ settings, onImportTransactions }: Props) {
    const [txnPreview, setTxnPreview] = useState<TxnPreview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<string | null>(null);

    async function handleCsv(file: File) {
        setError(null);
        setDone(null);
        try {
            const transactions = parseTransactionsCsv(await file.text());
            if (transactions.length === 0) {
                setError("No transactions found in that file.");
                return;
            }
            const merge = mergeTransactions(
                settings.transactions,
                transactions,
            );
            setTxnPreview({
                transactions,
                added: merge.added,
                duplicates: merge.duplicates,
                range: dateRange(transactions),
            });
        } catch (e) {
            setError(errorMessage(e));
        }
    }

    function confirmTxns() {
        if (!txnPreview) return;
        onImportTransactions(txnPreview.transactions);
        setDone(`Imported ${txnPreview.added} new sales.`);
        setTxnPreview(null);
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-white p-4 shadow-sm sm:p-5 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
                <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    Transactions (.csv)
                </Text>
                <Text className="mt-1 text-sm">
                    Your processor's sales export. Re-importing is safe —
                    already-imported sales are skipped and your itemized labels
                    are kept.
                </Text>
                <input
                    type="file"
                    accept=".csv,text/csv"
                    aria-label="Transactions CSV file"
                    className={`mt-3 ${inputClass}`}
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleCsv(file);
                        event.target.value = "";
                    }}
                />
                {txnPreview && (
                    <div className="mt-4 rounded-md bg-zinc-50 p-3 text-sm dark:bg-white/5">
                        <div className="text-zinc-700 dark:text-zinc-200">
                            {txnPreview.added} new sales
                            {txnPreview.duplicates > 0 &&
                                `, ${txnPreview.duplicates} already imported`}
                        </div>
                        <div className="mt-0.5 text-zinc-500 dark:text-zinc-400">
                            {txnPreview.range}
                        </div>
                        <Button
                            color="orange"
                            className="mt-3"
                            onClick={confirmTxns}
                        >
                            Import {txnPreview.added} sales
                        </Button>
                    </div>
                )}
            </div>

            <div aria-live="polite" className="min-h-5 text-sm">
                {error && (
                    <span className="text-red-600 dark:text-red-400">
                        {error}
                    </span>
                )}
                {done && (
                    <span className="text-green-700 dark:text-green-400">
                        {done} Remember to Save to cloud to keep it.
                    </span>
                )}
            </div>
        </div>
    );
}

function dateRange(transactions: Transaction[]): string {
    const times = transactions
        .map((txn) => new Date(txn.date).getTime())
        .filter((time) => Number.isFinite(time));
    if (times.length === 0) return "";
    const format = (time: number) =>
        new Date(time).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    return `${format(Math.min(...times))} – ${format(Math.max(...times))}`;
}

function errorMessage(error: unknown): string {
    return error instanceof Error
        ? `Couldn't read that file: ${error.message}`
        : "Couldn't read that file.";
}
