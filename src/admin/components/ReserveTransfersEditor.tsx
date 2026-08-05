import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import { Input } from "@/shared/catalyst-ui-kit/input.tsx";
import { Select } from "@/shared/catalyst-ui-kit/select.tsx";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/catalyst-ui-kit/table.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import NumberField from "@/admin/components/NumberField.tsx";
import { localDateKey } from "@/admin/domain/eventAnalytics.ts";
import {
    addTransfer,
    removeTransfer,
    updateTransfer,
} from "@/admin/domain/reserveMutations.ts";
import { useRecords } from "@/admin/RecordsContext.tsx";
import { RESERVE_FUNDS, type ReserveFund } from "@/admin/domain/types.ts";
import Card from "@/admin/components/ui/Card.tsx";
import { FUND_LABELS } from "@/admin/components/ui/labels.ts";

/**
 * The reserve ledger, editable row by row. The weekly button on the review
 * page appends here too — this table is the audit trail behind the balances,
 * and where an opening balance or a withdrawal (negative amount) is entered.
 */
export default function ReserveTransfersEditor() {
    const { records, setRecords } = useRecords();

    // Newest first, matching the other logs.
    const transfers = [...records.reserveTransfers].sort((a, b) =>
        `${b.date} ${b.id}`.localeCompare(`${a.date} ${a.id}`),
    );

    return (
        <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3">
                <Text className="text-sm">
                    {transfers.length} transfer
                    {transfers.length === 1 ? "" : "s"}
                </Text>
                <Button
                    outline
                    onClick={() =>
                        setRecords((prev) =>
                            addTransfer(prev, {
                                date: localDateKey(new Date().toISOString()),
                                fund: "emergency",
                                amount: 0,
                            }),
                        )
                    }
                >
                    Add transfer
                </Button>
            </div>

            <div className="mt-3 overflow-x-auto">
                <Table dense className="[--gutter:--spacing(4)]">
                    <TableHead>
                        <TableRow>
                            <TableHeader>Date</TableHeader>
                            <TableHeader>Fund</TableHeader>
                            <TableHeader>Amount</TableHeader>
                            <TableHeader>Note</TableHeader>
                            {/* relative: anchors the absolutely-positioned
                                sr-only span so it can't stretch the page. */}
                            <TableHeader className="relative">
                                <span className="sr-only">Actions</span>
                            </TableHeader>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transfers.map((transfer) => (
                            <TableRow key={transfer.id}>
                                <TableCell>
                                    <Input
                                        type="date"
                                        aria-label="Transfer date"
                                        className="max-w-40"
                                        value={transfer.date}
                                        onChange={(event) =>
                                            setRecords((prev) =>
                                                updateTransfer(
                                                    prev,
                                                    transfer.id,
                                                    {
                                                        date: event.target
                                                            .value,
                                                    },
                                                ),
                                            )
                                        }
                                    />
                                </TableCell>
                                <TableCell>
                                    <Select
                                        aria-label="Transfer fund"
                                        className="min-w-36 max-w-44"
                                        value={transfer.fund}
                                        onChange={(event) =>
                                            setRecords((prev) =>
                                                updateTransfer(
                                                    prev,
                                                    transfer.id,
                                                    {
                                                        fund: event.target
                                                            .value as ReserveFund,
                                                    },
                                                ),
                                            )
                                        }
                                    >
                                        {RESERVE_FUNDS.map((fund) => (
                                            <option key={fund} value={fund}>
                                                {FUND_LABELS[fund]}
                                            </option>
                                        ))}
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <NumberField
                                        aria-label="Transfer amount"
                                        prefix="$"
                                        step={1}
                                        className="w-28"
                                        value={transfer.amount}
                                        onChange={(value) =>
                                            setRecords((prev) =>
                                                updateTransfer(
                                                    prev,
                                                    transfer.id,
                                                    { amount: value },
                                                ),
                                            )
                                        }
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        aria-label="Transfer note"
                                        placeholder="Optional note"
                                        className="min-w-40"
                                        value={transfer.note ?? ""}
                                        onChange={(event) =>
                                            setRecords((prev) =>
                                                updateTransfer(
                                                    prev,
                                                    transfer.id,
                                                    {
                                                        note:
                                                            event.target
                                                                .value === ""
                                                                ? undefined
                                                                : event.target
                                                                      .value,
                                                    },
                                                ),
                                            )
                                        }
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button
                                        plain
                                        onClick={() =>
                                            setRecords((prev) =>
                                                removeTransfer(
                                                    prev,
                                                    transfer.id,
                                                ),
                                            )
                                        }
                                    >
                                        Remove
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {transfers.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="text-center text-zinc-500 dark:text-zinc-400"
                                >
                                    No transfers yet — record this week&apos;s
                                    above, or add a row for what&apos;s already
                                    in the account. Withdrawals are negative
                                    amounts.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
}
