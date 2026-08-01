import { useMemo, useState } from "react";
import { Button } from "@/components/catalyst-ui-kit/button.tsx";
import { Input } from "@/components/catalyst-ui-kit/input.tsx";
import { Text } from "@/components/catalyst-ui-kit/text.tsx";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/catalyst-ui-kit/table.tsx";
import { formatCurrency } from "./calculations.ts";
import BasisBadge from "./BasisBadge.tsx";
import {
    filterByRange,
    isCountable,
    resolveTransactionProfit,
    type TimeRange,
} from "./salesAnalytics.ts";
import type { Settings, Transaction } from "./types.ts";

const PAGE_SIZE = 12;

interface Props {
    settings: Settings;
    range: TimeRange;
}

export default function TransactionsTable({ settings, range }: Props) {
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(0);

    const filtered = useMemo(() => {
        const inRange = filterByRange(settings.transactions, range);
        const needle = query.trim().toLowerCase();
        return inRange.filter((txn) => {
            if (!needle) return true;
            const haystack = [
                txn.amount.toFixed(2),
                new Date(txn.date).toLocaleDateString(),
                txn.method,
                txn.brand ?? "",
                txn.result,
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(needle);
        });
    }, [settings.transactions, range, query]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const clampedPage = Math.min(page, pageCount - 1);
    const pageRows = filtered.slice(
        clampedPage * PAGE_SIZE,
        clampedPage * PAGE_SIZE + PAGE_SIZE,
    );

    return (
        <div className="overflow-hidden rounded-lg bg-white p-4 shadow-sm sm:p-5 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
            <Input
                aria-label="Search transactions"
                placeholder="Search by amount, date, method…"
                value={query}
                onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(0);
                }}
                className="sm:max-w-xs"
            />

            <div className="mt-3 overflow-x-auto">
                <Table dense className="[--gutter:--spacing(4)]">
                    <TableHead>
                        <TableRow>
                            <TableHeader>Date</TableHeader>
                            <TableHeader className="text-right">
                                Amount
                            </TableHeader>
                            <TableHeader>Method</TableHeader>
                            <TableHeader>Profit basis</TableHeader>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {pageRows.map((txn) => (
                            <TransactionRow
                                key={txn.id}
                                txn={txn}
                                settings={settings}
                            />
                        ))}
                        {pageRows.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={4}
                                    className="text-center text-zinc-500 dark:text-zinc-400"
                                >
                                    No transactions match.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="mt-4 flex items-center justify-between">
                <Text className="text-sm">
                    {filtered.length} transaction
                    {filtered.length === 1 ? "" : "s"}
                </Text>
                <div className="flex items-center gap-2">
                    <Button
                        outline
                        disabled={clampedPage === 0}
                        onClick={() => setPage(clampedPage - 1)}
                    >
                        Previous
                    </Button>
                    <Text className="text-sm tabular-nums">
                        {clampedPage + 1} / {pageCount}
                    </Text>
                    <Button
                        outline
                        disabled={clampedPage >= pageCount - 1}
                        onClick={() => setPage(clampedPage + 1)}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}

function TransactionRow({
    txn,
    settings,
}: {
    txn: Transaction;
    settings: Settings;
}) {
    const resolved = resolveTransactionProfit(txn, settings);
    const countable = isCountable(txn);

    return (
        <TableRow>
            <TableCell className="whitespace-nowrap">
                {new Date(txn.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                })}
                <span className="ml-2 text-zinc-400">
                    {new Date(txn.date).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                    })}
                </span>
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
                {formatCurrency(txn.amount)}
            </TableCell>
            <TableCell className="text-zinc-500 dark:text-zinc-400">
                {txn.brand || txn.method}
                {!countable && (
                    <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                        {txn.result}
                    </span>
                )}
            </TableCell>
            <TableCell>
                <BasisBadge basis={resolved.basis} />
            </TableCell>
        </TableRow>
    );
}
