import { Fragment } from "react";
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
import BatchEditor from "./BatchEditor.tsx";
import { effectiveCostPerUnit, formatCurrency } from "./calculations.ts";
import type { BatchLine, Ingredient, Unit } from "./types.ts";

const UNITS: Unit[] = ["lb", "oz", "each"];

interface Props {
    ingredients: Ingredient[];
    onChange: (id: string, patch: Partial<Ingredient>) => void;
    onChangeBatchYield: (id: string, value: number) => void;
    onChangeBatchLine: (
        id: string,
        lineId: string,
        patch: Partial<BatchLine>,
    ) => void;
    onAddBatchLine: (id: string) => void;
    onRemoveBatchLine: (id: string, lineId: string) => void;
}

export default function IngredientsEditor({
    ingredients,
    onChange,
    onChangeBatchYield,
    onChangeBatchLine,
    onAddBatchLine,
    onRemoveBatchLine,
}: Props) {
    return (
        <Table dense striped className="[--gutter:--spacing(4)]">
            <TableHead>
                <TableRow>
                    <TableHeader>Ingredient</TableHeader>
                    <TableHeader>Unit</TableHeader>
                    <TableHeader>Pricing</TableHeader>
                    <TableHeader className="text-right">
                        Cost per unit
                    </TableHeader>
                </TableRow>
            </TableHead>
            <TableBody>
                {ingredients.map((ingredient) => {
                    const isBatch = ingredient.pricing === "batch";
                    return (
                        <Fragment key={ingredient.id}>
                            <TableRow>
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
                                                unit: event.target
                                                    .value as Unit,
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
                                <TableCell className="w-36">
                                    <Select
                                        aria-label={`${ingredient.name} pricing method`}
                                        value={ingredient.pricing ?? "direct"}
                                        onChange={(event) =>
                                            onChange(ingredient.id, {
                                                pricing: event.target
                                                    .value as Ingredient["pricing"],
                                            })
                                        }
                                    >
                                        <option value="direct">Per unit</option>
                                        <option value="batch">By batch</option>
                                    </Select>
                                </TableCell>
                                <TableCell className="text-right">
                                    {isBatch ? (
                                        <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                                            {formatCurrency(
                                                effectiveCostPerUnit(
                                                    ingredient,
                                                ),
                                            )}
                                            <span className="ml-0.5">
                                                /{ingredient.unit}
                                            </span>
                                        </span>
                                    ) : (
                                        <div className="flex justify-end">
                                            <NumberField
                                                aria-label={`${ingredient.name} cost per ${ingredient.unit}`}
                                                value={ingredient.costPerUnit}
                                                prefix="$"
                                                suffix={`/${ingredient.unit}`}
                                                onChange={(value) =>
                                                    onChange(ingredient.id, {
                                                        costPerUnit: value,
                                                    })
                                                }
                                            />
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                            {isBatch && (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-2">
                                        <BatchEditor
                                            ingredient={ingredient}
                                            onChangeYield={(value) =>
                                                onChangeBatchYield(
                                                    ingredient.id,
                                                    value,
                                                )
                                            }
                                            onChangeLine={(lineId, patch) =>
                                                onChangeBatchLine(
                                                    ingredient.id,
                                                    lineId,
                                                    patch,
                                                )
                                            }
                                            onAddLine={() =>
                                                onAddBatchLine(ingredient.id)
                                            }
                                            onRemoveLine={(lineId) =>
                                                onRemoveBatchLine(
                                                    ingredient.id,
                                                    lineId,
                                                )
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            )}
                        </Fragment>
                    );
                })}
            </TableBody>
        </Table>
    );
}
