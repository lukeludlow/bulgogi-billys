import PageMeta from "@/components/PageMeta.tsx";
import DashboardShell from "./DashboardShell.tsx";
import Section from "./Section.tsx";
import SummaryCards from "./SummaryCards.tsx";
import MarginCharts from "./MarginCharts.tsx";
import WeeklySales from "./WeeklySales.tsx";
import IngredientsEditor from "./IngredientsEditor.tsx";
import MenuItemEditor from "./MenuItemEditor.tsx";
import NumberField from "./NumberField.tsx";
import type { NavSection } from "./DashboardNav.tsx";
import { useSettings } from "../SettingsContext.tsx";
import type { Batch, BatchLine, Ingredient } from "./types.ts";

const SECTIONS: NavSection[] = [
    { id: "visualizations", label: "Visualizations" },
    { id: "this-week", label: "This Week" },
    { id: "menu-items", label: "Menu Items" },
    { id: "ingredients", label: "Ingredients" },
    { id: "other-costs", label: "Other Costs" },
];

function newId(): string {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
}

export default function ProfitCalculator() {
    const { settings, setSettings } = useSettings();

    function patchIngredient(
        id: string,
        update: (ing: Ingredient) => Ingredient,
    ) {
        setSettings((prev) => ({
            ...prev,
            ingredients: prev.ingredients.map((ingredient) =>
                ingredient.id === id ? update(ingredient) : ingredient,
            ),
        }));
    }

    function updateIngredient(id: string, patch: Partial<Ingredient>) {
        patchIngredient(id, (ingredient) => {
            const next = { ...ingredient, ...patch };
            // Seed a starter batch the first time an ingredient switches to
            // batch pricing, so the derived cost initially matches what was
            // typed directly.
            if (patch.pricing === "batch" && !next.batch) {
                next.batch = {
                    yield: 1,
                    lines: [
                        { id: newId(), name: "", cost: next.costPerUnit || 0 },
                    ],
                };
            }
            return next;
        });
    }

    function withBatch(ingredient: Ingredient): Batch {
        return ingredient.batch ?? { yield: 0, lines: [] };
    }

    function updateBatchYield(id: string, value: number) {
        patchIngredient(id, (ingredient) => ({
            ...ingredient,
            batch: { ...withBatch(ingredient), yield: value },
        }));
    }

    function updateBatchLine(
        id: string,
        lineId: string,
        patch: Partial<BatchLine>,
    ) {
        patchIngredient(id, (ingredient) => {
            const batch = withBatch(ingredient);
            return {
                ...ingredient,
                batch: {
                    ...batch,
                    lines: batch.lines.map((line) =>
                        line.id === lineId ? { ...line, ...patch } : line,
                    ),
                },
            };
        });
    }

    function addBatchLine(id: string) {
        patchIngredient(id, (ingredient) => {
            const batch = withBatch(ingredient);
            return {
                ...ingredient,
                batch: {
                    ...batch,
                    lines: [...batch.lines, { id: newId(), name: "", cost: 0 }],
                },
            };
        });
    }

    function removeBatchLine(id: string, lineId: string) {
        patchIngredient(id, (ingredient) => {
            const batch = withBatch(ingredient);
            return {
                ...ingredient,
                batch: {
                    ...batch,
                    lines: batch.lines.filter((line) => line.id !== lineId),
                },
            };
        });
    }

    function updateVariant(
        itemId: string,
        variantId: string,
        patch: Partial<{ sellPrice: number; unitsSoldThisWeek: number }>,
    ) {
        setSettings((prev) => ({
            ...prev,
            items: prev.items.map((item) =>
                item.id !== itemId
                    ? item
                    : {
                          ...item,
                          variants: item.variants.map((variant) =>
                              variant.id === variantId
                                  ? { ...variant, ...patch }
                                  : variant,
                          ),
                      },
            ),
        }));
    }

    function updateRecipe(
        itemId: string,
        variantId: string,
        ingredientId: string,
        value: number,
    ) {
        setSettings((prev) => ({
            ...prev,
            items: prev.items.map((item) => {
                if (item.id !== itemId) return item;
                return {
                    ...item,
                    variants: item.variants.map((variant) => {
                        if (variant.id !== variantId) return variant;
                        const hasLine = variant.recipe.some(
                            (line) => line.ingredientId === ingredientId,
                        );
                        const recipe = hasLine
                            ? variant.recipe.map((line) =>
                                  line.ingredientId === ingredientId
                                      ? { ...line, amount: value }
                                      : line,
                              )
                            : [
                                  ...variant.recipe,
                                  { ingredientId, amount: value },
                              ];
                        return { ...variant, recipe };
                    }),
                };
            }),
        }));
    }

    return (
        <DashboardShell
            title="Profit Calculator"
            heading="Profit Margin Calculator"
            intro="Bulgogi Billy's — model your menu economics. Edits save automatically."
            sections={SECTIONS}
        >
            <PageMeta
                title="Admin | Profit Margin Calculator"
                description="Bulgogi Billy's internal profit margin calculator."
                noindex
            />

            {/* Sticky so the headline metrics stay visible while you edit the
                numbers that drive them. */}
            <div className="mt-8 hidden lg:sticky lg:top-0 lg:z-10 lg:-mx-10 lg:block lg:bg-white/95 lg:px-10 lg:py-3 lg:backdrop-blur dark:lg:bg-zinc-900/95">
                <SummaryCards settings={settings} />
            </div>

            <Section
                id="visualizations"
                title="Profit visualizations"
                description="Interactive — hover any bar for the exact numbers. Scroll a chart sideways on a narrow screen to see every item."
            >
                <MarginCharts settings={settings} />
            </Section>

            <Section
                id="this-week"
                title="This week"
                description="Enter how many of each item you sold to see actual weekly revenue and profit against your grocery spend."
            >
                <WeeklySales
                    settings={settings}
                    onChangeUnitsSold={(itemId, variantId, value) =>
                        updateVariant(itemId, variantId, {
                            unitsSoldThisWeek: value,
                        })
                    }
                />
            </Section>

            <Section
                id="menu-items"
                title="Menu items, sizes & recipes"
                description="Set your prices and the amount of each ingredient per size. Margins update live."
            >
                <div className="flex flex-col gap-4">
                    {settings.items.map((item) => (
                        <MenuItemEditor
                            key={item.id}
                            item={item}
                            ingredients={settings.ingredients}
                            selectedProtein={settings.selectedProtein}
                            packagingCostPerOrder={
                                settings.packagingCostPerOrder
                            }
                            onChangePrice={(variantId, value) =>
                                updateVariant(item.id, variantId, {
                                    sellPrice: value,
                                })
                            }
                            onChangeRecipe={(variantId, ingredientId, value) =>
                                updateRecipe(
                                    item.id,
                                    variantId,
                                    ingredientId,
                                    value,
                                )
                            }
                        />
                    ))}
                </div>
            </Section>

            <Section
                id="ingredients"
                title="Ingredient costs"
                description="What you pay per pound, ounce, or unit — priced directly, or derived from a batch. This drives every cost above."
            >
                <div className="overflow-hidden rounded-lg bg-white p-4 shadow-sm sm:p-5 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
                    <IngredientsEditor
                        ingredients={settings.ingredients}
                        onChange={updateIngredient}
                        onChangeBatchYield={updateBatchYield}
                        onChangeBatchLine={updateBatchLine}
                        onAddBatchLine={addBatchLine}
                        onRemoveBatchLine={removeBatchLine}
                    />
                </div>
            </Section>

            <Section
                id="other-costs"
                title="Other costs"
                description="Applied across the whole menu."
            >
                <div className="grid grid-cols-1 gap-4 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
                    <div>
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Packaging cost per order
                        </label>
                        <div className="mt-1">
                            <NumberField
                                aria-label="Packaging cost per order"
                                value={settings.packagingCostPerOrder}
                                prefix="$"
                                onChange={(value) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        packagingCostPerOrder: value,
                                    }))
                                }
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Weekly grocery spend
                        </label>
                        <div className="mt-1">
                            <NumberField
                                aria-label="Weekly grocery spend"
                                value={settings.groceryWeeklySpend}
                                prefix="$"
                                step={5}
                                onChange={(value) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        groceryWeeklySpend: value,
                                    }))
                                }
                            />
                        </div>
                    </div>
                </div>
            </Section>
        </DashboardShell>
    );
}
