import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/catalyst-ui-kit/table.tsx";
import { Badge } from "@/components/catalyst-ui-kit/badge.tsx";
import { Subheading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Text } from "@/components/catalyst-ui-kit/text.tsx";
import NumberField from "./NumberField.tsx";
import {
    formatCurrency,
    formatPercent,
    variantMargin,
} from "./calculations.ts";
import {
    PROTEIN_INGREDIENT_ID,
    type Ingredient,
    type MenuItem,
    type Protein,
} from "./types.ts";

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
    onChangeRecipe: (variantId: string, ingredientId: string, value: number) => void;
}

export default function MenuItemEditor({
    item,
    ingredients,
    selectedProtein,
    packagingCostPerOrder,
    onChangePrice,
    onChangeRecipe,
}: Props) {
    // Ingredient ids used anywhere in this item, in first-seen order — the rows
    // of the recipe grid.
    const recipeIngredientIds: string[] = [];
    for (const variant of item.variants) {
        for (const line of variant.recipe) {
            if (!recipeIngredientIds.includes(line.ingredientId)) {
                recipeIngredientIds.push(line.ingredientId);
            }
        }
    }

    const meta = (ingredientId: string) => {
        if (ingredientId === PROTEIN_INGREDIENT_ID) {
            return { name: `Protein (${selectedProtein})`, unit: "lb" };
        }
        const ingredient = ingredients.find((i) => i.id === ingredientId);
        return { name: ingredient?.name ?? ingredientId, unit: ingredient?.unit ?? "" };
    };

    const amountFor = (variantId: string, ingredientId: string) => {
        const variant = item.variants.find((v) => v.id === variantId);
        return variant?.recipe.find((l) => l.ingredientId === ingredientId)?.amount ?? 0;
    };

    return (
        <div className="rounded-lg bg-white p-4 shadow-sm sm:p-5 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
            <Subheading>{item.name}</Subheading>

            {/* Prices + live economics */}
            <Text className="mt-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Sizes & prices
            </Text>
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
                                    <Badge color={marginColor(margin.marginPercent)}>
                                        {formatPercent(margin.marginPercent)}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            {/* Recipe amounts grid: ingredient rows × size columns */}
            <Text className="mt-5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Recipe amounts
            </Text>
            <Table dense className="mt-1 [--gutter:--spacing(4)]">
                <TableHead>
                    <TableRow>
                        <TableHeader>Ingredient</TableHeader>
                        {item.variants.map((variant) => (
                            <TableHeader key={variant.id} className="text-right">
                                {variant.label}
                            </TableHeader>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {recipeIngredientIds.map((ingredientId) => {
                        const { name, unit } = meta(ingredientId);
                        return (
                            <TableRow key={ingredientId}>
                                <TableCell className="whitespace-nowrap">
                                    {name}
                                    <span className="ml-1 text-zinc-400 dark:text-zinc-500">
                                        ({unit})
                                    </span>
                                </TableCell>
                                {item.variants.map((variant) => (
                                    <TableCell key={variant.id} className="w-28">
                                        <NumberField
                                            aria-label={`${item.name} ${variant.label} ${name} amount`}
                                            value={amountFor(variant.id, ingredientId)}
                                            suffix={unit}
                                            onChange={(value) =>
                                                onChangeRecipe(
                                                    variant.id,
                                                    ingredientId,
                                                    value,
                                                )
                                            }
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
