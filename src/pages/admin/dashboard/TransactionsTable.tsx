import { useMemo, useState } from "react";
import { Button } from "@/components/catalyst-ui-kit/button.tsx";
import { Input } from "@/components/catalyst-ui-kit/input.tsx";
import { Select } from "@/components/catalyst-ui-kit/select.tsx";
import { Text } from "@/components/catalyst-ui-kit/text.tsx";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/catalyst-ui-kit/table.tsx";
import { allCombinations, formatCurrency } from "./calculations.ts";
import BasisBadge from "./BasisBadge.tsx";
import {
    filterByRange,
    isCountable,
    resolveTransactionProfit,
    type TimeRange,
} from "./salesAnalytics.ts";
import type {
    Settings,
    Transaction,
    TransactionLineItem,
} from "./types.ts";

const PAGE_SIZE = 12;

interface Props {
    settings: Settings;
    range: TimeRange;
    onItemize: (id: string, lineItems: TransactionLineItem[]) => void;
}

interface ComboOption {
    key: string;
    itemId: string;
    variantId: string;
    label: string;
    sellPrice: number;
}

export default function TransactionsTable({
    settings,
    range,
    onItemize,
}: Props) {
    const [query, setQuery] = useState("");
    const [onlyUnlabeled, setOnlyUnlabeled] = useState(false);
    const [page, setPage] = useState(0);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const options = useMemo<ComboOption[]>(
        () =>
            allCombinations(settings).map((combination) => ({
                key: `${combination.itemId}:${combination.variantId}`,
                itemId: combination.itemId,
                variantId: combination.variantId,
                label: combination.label,
                sellPrice: combination.revenue,
            })),
        [settings],
    );

    const filtered = useMemo(() => {
        const inRange = filterByRange(settings.transactions, range);
        const needle = query.trim().toLowerCase();
        return inRange.filter((txn) => {
            if (onlyUnlabeled && txn.lineItems && txn.lineItems.length > 0) {
                return false;
            }
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
    }, [settings.transactions, range, query, onlyUnlabeled]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const clampedPage = Math.min(page, pageCount - 1);
    const pageRows = filtered.slice(
        clampedPage * PAGE_SIZE,
        clampedPage * PAGE_SIZE + PAGE_SIZE,
    );

    return (
        <div className="overflow-hidden rounded-lg bg-white p-4 shadow-sm sm:p-5 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                    <input
                        type="checkbox"
                        checked={onlyUnlabeled}
                        onChange={(event) => {
                            setOnlyUnlabeled(event.target.checked);
                            setPage(0);
                        }}
                        className="rounded border-zinc-300 dark:border-white/20"
                    />
                    Only unlabeled
                </label>
            </div>

            <div className="mt-3 overflow-x-auto">
                <Table dense className="[--gutter:--spacing(4)]">
                    <TableHead>
                        <TableRow>
                            <TableHeader>Date</TableHeader>
                            <TableHeader className="text-right">Amount</TableHeader>
                            <TableHeader>Method</TableHeader>
                            <TableHeader>Profit basis</TableHeader>
                            <TableHeader className="text-right">Itemize</TableHeader>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {pageRows.map((txn) => (
                            <TransactionRow
                                key={txn.id}
                                txn={txn}
                                settings={settings}
                                options={options}
                                expanded={expandedId === txn.id}
                                onToggle={() =>
                                    setExpandedId(
                                        expandedId === txn.id ? null : txn.id,
                                    )
                                }
                                onSave={(lineItems) => {
                                    onItemize(txn.id, lineItems);
                                    setExpandedId(null);
                                }}
                            />
                        ))}
                        {pageRows.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
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
    options,
    expanded,
    onToggle,
    onSave,
}: {
    txn: Transaction;
    settings: Settings;
    options: ComboOption[];
    expanded: boolean;
    onToggle: () => void;
    onSave: (lineItems: TransactionLineItem[]) => void;
}) {
    const resolved = resolveTransactionProfit(txn, settings);
    const countable = isCountable(txn);

    return (
        <>
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
                <TableCell className="text-right">
                    <Button plain onClick={onToggle}>
                        {expanded ? "Close" : "Itemize"}
                    </Button>
                </TableCell>
            </TableRow>
            {expanded && (
                <TableRow>
                    <TableCell colSpan={5} className="bg-zinc-50 dark:bg-white/5">
                        <ItemizeEditor
                            txn={txn}
                            options={options}
                            onSave={onSave}
                        />
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

function ItemizeEditor({
    txn,
    options,
    onSave,
}: {
    txn: Transaction;
    options: ComboOption[];
    onSave: (lineItems: TransactionLineItem[]) => void;
}) {
    const [lines, setLines] = useState<TransactionLineItem[]>(
        () => txn.lineItems?.map((line) => ({ ...line })) ?? [],
    );

    const optionByKey = useMemo(() => {
        const map = new Map<string, ComboOption>();
        for (const option of options) map.set(option.key, option);
        return map;
    }, [options]);

    const assigned = lines.reduce((sum, line) => {
        const option = optionByKey.get(`${line.itemId}:${line.variantId}`);
        return sum + (option ? option.sellPrice * line.quantity : 0);
    }, 0);

    function addLine() {
        const first = options[0];
        if (!first) return;
        setLines((prev) => [
            ...prev,
            { itemId: first.itemId, variantId: first.variantId, quantity: 1 },
        ]);
    }

    function updateLine(index: number, patch: Partial<TransactionLineItem>) {
        setLines((prev) =>
            prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
        );
    }

    function removeLine(index: number) {
        setLines((prev) => prev.filter((_, i) => i !== index));
    }

    const difference = Math.round((assigned - txn.amount) * 100) / 100;

    return (
        <div className="flex flex-col gap-3 py-2">
            <Text className="text-sm">
                Label what was actually in this {formatCurrency(txn.amount)} sale
                for an exact profit figure.
            </Text>

            {lines.length === 0 && (
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                    No items yet — add the sizes that made up this order.
                </Text>
            )}

            <div className="flex flex-col gap-2">
                {lines.map((line, index) => (
                    <div
                        key={index}
                        className="flex flex-wrap items-center gap-2"
                    >
                        <Select
                            aria-label="Menu item"
                            className="min-w-52 flex-1"
                            value={`${line.itemId}:${line.variantId}`}
                            onChange={(event) => {
                                const [itemId, variantId] =
                                    event.target.value.split(":");
                                updateLine(index, { itemId, variantId });
                            }}
                        >
                            {options.map((option) => (
                                <option key={option.key} value={option.key}>
                                    {option.label} ({formatCurrency(option.sellPrice)})
                                </option>
                            ))}
                        </Select>
                        <Input
                            type="number"
                            min={1}
                            step={1}
                            aria-label="Quantity"
                            className="w-20"
                            value={line.quantity}
                            onChange={(event) =>
                                updateLine(index, {
                                    quantity: Math.max(
                                        1,
                                        Math.round(Number(event.target.value) || 1),
                                    ),
                                })
                            }
                        />
                        <Button plain onClick={() => removeLine(index)}>
                            Remove
                        </Button>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <Button outline onClick={addLine}>
                    Add item
                </Button>
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                    Assigned {formatCurrency(assigned)} of{" "}
                    {formatCurrency(txn.amount)}
                    {difference !== 0 && (
                        <span
                            className={
                                difference > 0
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-amber-600 dark:text-amber-400"
                            }
                        >
                            {" "}
                            ({difference > 0 ? "+" : ""}
                            {formatCurrency(difference)})
                        </span>
                    )}
                </Text>
                <div className="ml-auto flex gap-2">
                    {txn.lineItems && txn.lineItems.length > 0 && (
                        <Button plain onClick={() => onSave([])}>
                            Clear labels
                        </Button>
                    )}
                    <Button color="orange" onClick={() => onSave(lines)}>
                        Save labels
                    </Button>
                </div>
            </div>
        </div>
    );
}
