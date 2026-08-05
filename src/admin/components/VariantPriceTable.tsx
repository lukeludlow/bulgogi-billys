import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/catalyst-ui-kit/table.tsx";
import { Badge } from "@/shared/catalyst-ui-kit/badge.tsx";
import NumberField from "@/admin/components/NumberField.tsx";
import { variantMargin } from "@/admin/domain/calculations.ts";
import { formatCurrency, formatPercent } from "@/admin/components/ui/format.ts";
import type { Ingredient, MenuItem, Protein } from "@/admin/domain/types.ts";

function marginColor(marginPercent: number): "green" | "amber" | "red" {
    if (marginPercent >= 65) return "green";
    if (marginPercent >= 45) return "amber";
    return "red";
}

interface Props {
    item: MenuItem;
    ingredients: Ingredient[];
    selectedProtein: Protein;
    packagingCostPerOrder: number;
    onChangePrice: (variantId: string, value: number) => void;
}

/** One item's sizes, their menu prices, and the economics each price implies. */
export default function VariantPriceTable({
    item,
    ingredients,
    selectedProtein,
    packagingCostPerOrder,
    onChangePrice,
}: Props) {
    return (
        <Table dense className="mt-1 [--gutter:--spacing(4)]">
            <TableHead>
                <TableRow>
                    <TableHeader>Size</TableHeader>
                    <TableHeader>Price</TableHeader>
                    <TableHeader className="text-right">Cost</TableHeader>
                    <TableHeader className="text-right">Profit</TableHeader>
                    <TableHeader className="text-right">Margin</TableHeader>
                </TableRow>
            </TableHead>
            <TableBody>
                {item.variants.map((variant) => {
                    const margin = variantMargin(
                        variant,
                        ingredients,
                        selectedProtein,
                        packagingCostPerOrder,
                    );
                    return (
                        <TableRow key={variant.id}>
                            <TableCell className="font-medium">
                                {variant.label}
                            </TableCell>
                            <TableCell className="w-32">
                                <NumberField
                                    aria-label={`${item.name} ${variant.label} price`}
                                    value={variant.sellPrice}
                                    prefix="$"
                                    step={0.25}
                                    onChange={(value) =>
                                        onChangePrice(variant.id, value)
                                    }
                                />
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                                {formatCurrency(margin.cost)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                                {formatCurrency(margin.grossProfit)}
                            </TableCell>
                            <TableCell className="text-right">
                                <Badge
                                    color={marginColor(margin.marginPercent)}
                                >
                                    {formatPercent(margin.marginPercent)}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
