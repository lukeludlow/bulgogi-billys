import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/catalyst-ui-kit/table.tsx";
import { Input } from "@/components/catalyst-ui-kit/input.tsx";
import { Select } from "@/components/catalyst-ui-kit/select.tsx";
import NumberField from "./NumberField.tsx";
import type { Ingredient, Unit } from "./types.ts";

const UNITS: Unit[] = ["lb", "oz", "each"];

interface Props {
    ingredients: Ingredient[];
    onChange: (id: string, patch: Partial<Ingredient>) => void;
}

export default function IngredientsEditor({ ingredients, onChange }: Props) {
    return (
        <Table dense striped className="[--gutter:--spacing(4)]">
            <TableHead>
                <TableRow>
                    <TableHeader>Ingredient</TableHeader>
                    <TableHeader>Unit</TableHeader>
                    <TableHeader className="text-right">Cost per unit</TableHeader>
                </TableRow>
            </TableHead>
            <TableBody>
                {ingredients.map((ingredient) => (
                    <TableRow key={ingredient.id}>
                        <TableCell className="min-w-40">
                            <Input
                                aria-label={`${ingredient.name} name`}
                                value={ingredient.name}
                                onChange={(event) =>
                                    onChange(ingredient.id, {
                                        name: event.target.value,
                                    })
                                }
                            />
                        </TableCell>
                        <TableCell className="w-24">
                            <Select
                                aria-label={`${ingredient.name} unit`}
                                value={ingredient.unit}
                                onChange={(event) =>
                                    onChange(ingredient.id, {
                                        unit: event.target.value as Unit,
                                    })
                                }
                            >
                                {UNITS.map((unit) => (
                                    <option key={unit} value={unit}>
                                        {unit}
                                    </option>
                                ))}
                            </Select>
                        </TableCell>
                        <TableCell>
                            <NumberField
                                aria-label={`${ingredient.name} cost per ${ingredient.unit}`}
                                value={ingredient.costPerUnit}
                                prefix="$"
                                suffix={`/${ingredient.unit}`}
                                onChange={(value) =>
                                    onChange(ingredient.id, { costPerUnit: value })
                                }
                            />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
