import { Button } from "@/components/catalyst-ui-kit/button.tsx";
import { Input } from "@/components/catalyst-ui-kit/input.tsx";
import { Select } from "@/components/catalyst-ui-kit/select.tsx";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/catalyst-ui-kit/table.tsx";
import { Text } from "@/components/catalyst-ui-kit/text.tsx";
import { formatCurrency } from "./calculations.ts";
import { localDateKey, type CategoryTotals } from "./eventAnalytics.ts";
import NumberField from "./NumberField.tsx";
import {
    PURCHASE_CATEGORIES,
    type Purchase,
    type PurchaseCategory,
    type Settings,
} from "./types.ts";

export const CATEGORY_LABELS: Record<PurchaseCategory, string> = {
    food: "Food",
    fuel: "Fuel",
    propane: "Propane",
    ice: "Ice",
};

interface Props {
    settings: Settings;
    setSettings: (update: (prev: Settings) => Settings) => void;
    /** Per-category totals no event has absorbed yet (from the allocator). */
    unallocated: CategoryTotals;
}

/**
 * The shopping-trip log. Each purchase is spread across the market events
 * between it and the next purchase of the same category, so costs are entered
 * when money is spent, not re-guessed per event.
 */
export default function PurchasesEditor({
    settings,
    setSettings,
    unallocated,
}: Props) {
    function updatePurchase(id: string, patch: Partial<Purchase>) {
        setSettings((prev) => ({
            ...prev,
            purchases: prev.purchases.map((purchase) =>
                purchase.id === id ? { ...purchase, ...patch } : purchase,
            ),
        }));
    }

    function removePurchase(id: string) {
        setSettings((prev) => ({
            ...prev,
            purchases: prev.purchases.filter((purchase) => purchase.id !== id),
        }));
    }

    function addPurchase() {
        setSettings((prev) => ({
            ...prev,
            purchases: [
                ...prev.purchases,
                {
                    id: crypto.randomUUID(),
                    date: localDateKey(new Date().toISOString()),
                    category: "fuel",
                    amount: 0,
                },
            ],
        }));
    }

    // Newest first, matching the events table.
    const purchases = [...settings.purchases].sort((a, b) =>
        `${b.date} ${b.id}`.localeCompare(`${a.date} ${a.id}`),
    );

    const pendingCategories = PURCHASE_CATEGORIES.filter(
        (category) => unallocated[category] > 0,
    );

    return (
        <div className="overflow-hidden rounded-lg bg-white p-4 shadow-sm sm:p-5 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
            <div className="flex items-center justify-between gap-3">
                <Text className="text-sm">
                    {purchases.length} purchase
                    {purchases.length === 1 ? "" : "s"}
                </Text>
                <Button outline onClick={addPurchase}>
                    Add purchase
                </Button>
            </div>

            <div className="mt-3 overflow-x-auto">
                <Table dense className="[--gutter:--spacing(4)]">
                    <TableHead>
                        <TableRow>
                            <TableHeader>Date</TableHeader>
                            <TableHeader>Category</TableHeader>
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
                        {purchases.map((purchase) => (
                            <TableRow key={purchase.id}>
                                <TableCell>
                                    <Input
                                        type="date"
                                        aria-label="Purchase date"
                                        className="max-w-40"
                                        value={purchase.date}
                                        onChange={(event) =>
                                            updatePurchase(purchase.id, {
                                                date: event.target.value,
                                            })
                                        }
                                    />
                                </TableCell>
                                <TableCell>
                                    <Select
                                        aria-label="Purchase category"
                                        className="min-w-28 max-w-32"
                                        value={purchase.category}
                                        onChange={(event) =>
                                            updatePurchase(purchase.id, {
                                                category: event.target
                                                    .value as PurchaseCategory,
                                            })
                                        }
                                    >
                                        {PURCHASE_CATEGORIES.map((category) => (
                                            <option
                                                key={category}
                                                value={category}
                                            >
                                                {CATEGORY_LABELS[category]}
                                            </option>
                                        ))}
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <NumberField
                                        aria-label="Purchase amount"
                                        prefix="$"
                                        step={1}
                                        className="w-28"
                                        value={purchase.amount}
                                        onChange={(value) =>
                                            updatePurchase(purchase.id, {
                                                amount: value,
                                            })
                                        }
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        aria-label="Purchase note"
                                        placeholder="Optional note"
                                        className="min-w-40"
                                        value={purchase.note ?? ""}
                                        onChange={(event) =>
                                            updatePurchase(purchase.id, {
                                                note:
                                                    event.target.value === ""
                                                        ? undefined
                                                        : event.target.value,
                                            })
                                        }
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button
                                        plain
                                        onClick={() =>
                                            removePurchase(purchase.id)
                                        }
                                    >
                                        Remove
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {purchases.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="text-center text-zinc-500 dark:text-zinc-400"
                                >
                                    No purchases yet — log each shopping trip
                                    here and its cost is split across the events
                                    it supplied.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {pendingCategories.length > 0 && (
                <Text className="mt-3 text-sm text-amber-700 dark:text-amber-400">
                    Not yet allocated (no event on or after the purchase date):{" "}
                    {pendingCategories
                        .map(
                            (category) =>
                                `${CATEGORY_LABELS[category]} ${formatCurrency(
                                    unallocated[category],
                                )}`,
                        )
                        .join(", ")}
                    . These will land on the next event.
                </Text>
            )}
        </div>
    );
}
