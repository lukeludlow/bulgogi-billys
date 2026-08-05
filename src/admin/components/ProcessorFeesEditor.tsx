import { useState } from "react";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import { Input } from "@/shared/catalyst-ui-kit/input.tsx";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/catalyst-ui-kit/table.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import { formatCurrency } from "@/admin/domain/calculations.ts";
import NumberField from "@/admin/components/NumberField.tsx";
import { useRecords } from "@/admin/RecordsContext.tsx";

interface Props {
    /** Fee dollars in months with no events to absorb them (from the allocator). */
    unallocated: number;
}

/** "Jul 2026" for a "YYYY-MM" month key. */
function formatMonth(month: string): string {
    const [year, monthIndex] = month.split("-").map(Number);
    return new Date(year, monthIndex - 1, 1).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
    });
}

/** The current local month as "YYYY-MM". */
function currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Monthly card-processor fee totals, entered from the Square statement. Each
 * month's total is spread across that month's events proportional to card
 * sales.
 */
export default function ProcessorFeesEditor({ unallocated }: Props) {
    const { records, setRecords } = useRecords();

    // Suggest the current month unless it already has an entry (a pre-filled
    // duplicate would show the warning before the user touched anything).
    const [newMonth, setNewMonth] = useState(() => {
        const suggestion = currentMonth();
        return records.processorFees.some((fee) => fee.month === suggestion)
            ? ""
            : suggestion;
    });

    const fees = [...records.processorFees].sort((a, b) =>
        b.month.localeCompare(a.month),
    );
    const duplicateMonth = records.processorFees.some(
        (fee) => fee.month === newMonth,
    );

    function addFee() {
        if (!newMonth || duplicateMonth) return;
        setRecords((prev) => ({
            ...prev,
            processorFees: [
                ...prev.processorFees,
                { month: newMonth, amount: 0 },
            ],
        }));
        setNewMonth("");
    }

    function updateFee(month: string, amount: number) {
        setRecords((prev) => ({
            ...prev,
            processorFees: prev.processorFees.map((fee) =>
                fee.month === month ? { ...fee, amount } : fee,
            ),
        }));
    }

    function removeFee(month: string) {
        setRecords((prev) => ({
            ...prev,
            processorFees: prev.processorFees.filter(
                (fee) => fee.month !== month,
            ),
        }));
    }

    return (
        <div className="rounded-lg bg-white p-4 shadow-sm sm:p-5 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Card processing fees
            </label>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Enter each month&apos;s total from the Square statement; it is
                split across that month&apos;s events in proportion to card
                sales.
            </p>

            {fees.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                    <Table dense className="[--gutter:--spacing(4)]">
                        <TableHead>
                            <TableRow>
                                <TableHeader>Month</TableHeader>
                                <TableHeader>Fees</TableHeader>
                                {/* relative: anchors the absolutely-positioned
                                    sr-only span so it can't stretch the page. */}
                                <TableHeader className="relative">
                                    <span className="sr-only">Actions</span>
                                </TableHeader>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {fees.map((fee) => (
                                <TableRow key={fee.month}>
                                    <TableCell className="whitespace-nowrap">
                                        {formatMonth(fee.month)}
                                    </TableCell>
                                    <TableCell>
                                        <NumberField
                                            aria-label={`Processor fees for ${fee.month}`}
                                            prefix="$"
                                            step={1}
                                            className="w-28"
                                            value={fee.amount}
                                            onChange={(value) =>
                                                updateFee(fee.month, value)
                                            }
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            plain
                                            onClick={() => removeFee(fee.month)}
                                        >
                                            Remove
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input
                    type="month"
                    aria-label="Fee month"
                    className="max-w-44"
                    value={newMonth}
                    onChange={(event) => setNewMonth(event.target.value)}
                />
                <Button
                    outline
                    onClick={addFee}
                    disabled={!newMonth || duplicateMonth}
                >
                    Add month
                </Button>
                {duplicateMonth && (
                    <Text className="text-sm text-red-600 dark:text-red-400">
                        {formatMonth(newMonth)} already has a fee entry.
                    </Text>
                )}
            </div>

            {unallocated > 0 && (
                <Text className="mt-3 text-sm text-amber-700 dark:text-amber-400">
                    {formatCurrency(unallocated)} in fees belongs to months with
                    no events, so it isn&apos;t counted anywhere yet.
                </Text>
            )}
        </div>
    );
}
