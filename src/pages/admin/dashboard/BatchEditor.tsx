import { PlusIcon, TrashIcon } from "@heroicons/react/16/solid";
import { Button } from "@/components/catalyst-ui-kit/button.tsx";
import { Input } from "@/components/catalyst-ui-kit/input.tsx";
import NumberField from "./NumberField.tsx";
import { effectiveCostPerUnit, formatCurrency } from "./calculations.ts";
import type { BatchLine, Ingredient } from "./types.ts";

interface Props {
    ingredient: Ingredient;
    onChangeYield: (value: number) => void;
    onChangeLine: (lineId: string, patch: Partial<BatchLine>) => void;
    onAddLine: () => void;
    onRemoveLine: (lineId: string) => void;
}

/**
 * Inline editor for an ingredient priced by batch/sub-recipe: a yield plus a
 * list of cost lines. The per-unit cost is derived, never typed. One line is
 * enough for a "whole bottle" purchase; several describe a made-from-scratch
 * batch.
 */
export default function BatchEditor({
    ingredient,
    onChangeYield,
    onChangeLine,
    onAddLine,
    onRemoveLine,
}: Props) {
    const batch = ingredient.batch ?? { yield: 0, lines: [] };
    const perUnit = effectiveCostPerUnit(ingredient);

    return (
        <div className="rounded-lg bg-zinc-50 p-3 sm:p-4 dark:bg-white/5">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                <div>
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Batch yield
                    </label>
                    <div className="mt-1">
                        <NumberField
                            aria-label={`${ingredient.name} batch yield`}
                            value={batch.yield}
                            step={1}
                            suffix={ingredient.unit}
                            onChange={onChangeYield}
                        />
                    </div>
                </div>
                <div className="text-sm">
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Derived cost
                    </div>
                    <div className="mt-1 font-semibold text-zinc-950 tabular-nums dark:text-white">
                        {formatCurrency(perUnit)}
                        <span className="ml-1 font-normal text-zinc-500 dark:text-zinc-400">
                            /{ingredient.unit} (auto)
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-4">
                <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Batch ingredients
                </div>
                <div className="mt-2 flex flex-col gap-2">
                    {batch.lines.map((line) => (
                        <div key={line.id} className="flex items-center gap-2">
                            <Input
                                aria-label={`${ingredient.name} batch line name`}
                                className="min-w-0 flex-1"
                                value={line.name}
                                placeholder="e.g. Soy sauce"
                                onChange={(event) =>
                                    onChangeLine(line.id, {
                                        name: event.target.value,
                                    })
                                }
                            />
                            <NumberField
                                aria-label={`${ingredient.name} ${line.name || "line"} cost`}
                                value={line.cost}
                                prefix="$"
                                step={0.5}
                                onChange={(value) =>
                                    onChangeLine(line.id, { cost: value })
                                }
                            />
                            <Button
                                plain
                                aria-label={`Remove ${line.name || "line"}`}
                                onClick={() => onRemoveLine(line.id)}
                            >
                                <TrashIcon />
                            </Button>
                        </div>
                    ))}
                </div>
                <div className="mt-3">
                    <Button outline onClick={onAddLine}>
                        <PlusIcon />
                        Add ingredient
                    </Button>
                </div>
            </div>
        </div>
    );
}
