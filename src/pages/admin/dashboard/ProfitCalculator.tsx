import { useEffect, useState, type ReactNode } from "react";
import PageMeta from "@/components/PageMeta.tsx";
import DarkModeToggle from "@/components/dark-mode-toggle/DarkModeToggle.tsx";
import { Heading, Subheading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Text } from "@/components/catalyst-ui-kit/text.tsx";
import { Divider } from "@/components/catalyst-ui-kit/divider.tsx";
import CloudSyncBar from "./CloudSyncBar.tsx";
import SummaryCards from "./SummaryCards.tsx";
import MarginCharts from "./MarginCharts.tsx";
import IngredientsEditor from "./IngredientsEditor.tsx";
import MenuItemEditor from "./MenuItemEditor.tsx";
import NumberField from "./NumberField.tsx";
import { loadSettings, saveSettings } from "./storage.ts";
import type { Ingredient, Protein, Settings } from "./types.ts";

function Section({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="mt-10">
            <Subheading>{title}</Subheading>
            {description && <Text className="mt-1 text-sm">{description}</Text>}
            <Divider className="mt-3 mb-5" />
            {children}
        </section>
    );
}

export default function ProfitCalculator() {
    const [settings, setSettings] = useState<Settings>(() => loadSettings());

    // Persist to localStorage shortly after edits settle, so every keystroke
    // isn't a write but nothing is ever lost on reload.
    useEffect(() => {
        const timer = setTimeout(() => saveSettings(settings), 300);
        return () => clearTimeout(timer);
    }, [settings]);

    function updateIngredient(id: string, patch: Partial<Ingredient>) {
        setSettings((prev) => ({
            ...prev,
            ingredients: prev.ingredients.map((ingredient) =>
                ingredient.id === id ? { ...ingredient, ...patch } : ingredient,
            ),
        }));
    }

    function updatePrice(itemId: string, variantId: string, value: number) {
        setSettings((prev) => ({
            ...prev,
            items: prev.items.map((item) =>
                item.id !== itemId
                    ? item
                    : {
                          ...item,
                          variants: item.variants.map((variant) =>
                              variant.id === variantId
                                  ? { ...variant, sellPrice: value }
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
                            : [...variant.recipe, { ingredientId, amount: value }];
                        return { ...variant, recipe };
                    }),
                };
            }),
        }));
    }

    return (
        <main className="min-h-dvh bg-zinc-100 text-zinc-950 dark:bg-zinc-900 dark:text-white">
            <PageMeta
                title="Admin | Profit Margin Calculator"
                description="Bulgogi Billy's internal profit margin calculator."
            />
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <Heading level={1} className="text-2xl sm:text-3xl">
                            Profit Margin Calculator
                        </Heading>
                        <Text className="mt-1">
                            Bulgogi Billy's — model your menu economics. Edits save
                            to this browser automatically.
                        </Text>
                    </div>
                    <DarkModeToggle />
                </div>

                <div className="mt-6">
                    <CloudSyncBar
                        settings={settings}
                        onApplySettings={setSettings}
                        selectedProtein={settings.selectedProtein}
                        onChangeProtein={(protein: Protein) =>
                            setSettings((prev) => ({
                                ...prev,
                                selectedProtein: protein,
                            }))
                        }
                    />
                </div>

                <div className="mt-8">
                    <SummaryCards settings={settings} />
                </div>

                <Section
                    title="Profit visualizations"
                    description="Interactive — hover any bar for the exact numbers."
                >
                    <MarginCharts settings={settings} />
                </Section>

                <Section
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
                                packagingCostPerOrder={settings.packagingCostPerOrder}
                                onChangePrice={(variantId, value) =>
                                    updatePrice(item.id, variantId, value)
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
                    title="Ingredient costs"
                    description="What you pay per pound, ounce, or unit. This drives every cost above."
                >
                    <div className="overflow-hidden rounded-lg bg-white p-4 shadow-sm sm:p-5 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
                        <IngredientsEditor
                            ingredients={settings.ingredients}
                            onChange={updateIngredient}
                        />
                    </div>
                </Section>

                <Section
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
            </div>
        </main>
    );
}
