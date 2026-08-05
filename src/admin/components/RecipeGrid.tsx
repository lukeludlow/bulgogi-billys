import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/catalyst-ui-kit/table.tsx";
import DualUnitField from "@/admin/components/DualUnitField.tsx";
import NumberField from "@/admin/components/NumberField.tsx";
import {
    PROTEIN_INGREDIENT_ID,
    type Ingredient,
    type MenuItem,
    type Protein,
} from "@/admin/domain/types.ts";

interface Props {
    item: MenuItem;
    ingredients: Ingredient[];
    selectedProtein: Protein;
    onChangeRecipe: (
        variantId: string,
        ingredientId: string,
        value: number,
    ) => void;
}

/**
 * How much of each ingredient one order uses: ingredient rows × size columns.
 * The rows are the ingredient ids this item references anywhere, in first-seen
 * order, so a size that doesn't use an ingredient still shows an editable cell.
 */
export default function RecipeGrid({
    item,
    ingredients,
    selectedProtein,
    onChangeRecipe,
}: Props) {
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
        return {
            name: ingredient?.name ?? ingredientId,
            unit: ingredient?.unit ?? "",
        };
    };

    const amountFor = (variantId: string, ingredientId: string) => {
        const variant = item.variants.find((v) => v.id === variantId);
        return (
            variant?.recipe.find((l) => l.ingredientId === ingredientId)
                ?.amount ?? 0
        );
    };

    return (
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
                                <TableCell
                                    key={variant.id}
                                    className={unit === "lb" ? "w-48" : "w-32"}
                                >
                                    {unit === "lb" ? (
                                        // Billy weighs meat in lb + oz; stored
                                        // value stays decimal lb.
                                        <DualUnitField
                                            aria-label={`${item.name} ${variant.label} ${name} amount`}
                                            majorSuffix="lb"
                                            minorSuffix="oz"
                                            minorPerMajor={16}
                                            minorStep={0.25}
                                            value={amountFor(
                                                variant.id,
                                                ingredientId,
                                            )}
                                            onChange={(value) =>
                                                onChangeRecipe(
                                                    variant.id,
                                                    ingredientId,
                                                    value,
                                                )
                                            }
                                        />
                                    ) : (
                                        <NumberField
                                            aria-label={`${item.name} ${variant.label} ${name} amount`}
                                            value={amountFor(
                                                variant.id,
                                                ingredientId,
                                            )}
                                            suffix={unit}
                                            onChange={(value) =>
                                                onChangeRecipe(
                                                    variant.id,
                                                    ingredientId,
                                                    value,
                                                )
                                            }
                                        />
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
