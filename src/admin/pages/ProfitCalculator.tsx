import Section from "@/admin/components/Section.tsx";
import SummaryCards from "@/admin/components/SummaryCards.tsx";
import MarginCharts from "@/admin/components/MarginCharts.tsx";
import WeeklySales from "@/admin/components/WeeklySales.tsx";
import IngredientsEditor from "@/admin/components/IngredientsEditor.tsx";
import MenuItemEditor from "@/admin/components/MenuItemEditor.tsx";
import NumberField from "@/admin/components/NumberField.tsx";
import { useSettings } from "@/admin/SettingsContext.tsx";
import Card from "@/admin/components/ui/Card.tsx";
import FieldLabel from "@/admin/components/ui/FieldLabel.tsx";

/** Content for the /admin index route; AdminLayout supplies the chrome. */
export default function ProfitCalculator() {
    // The two whole-menu costs below are the only edits this page still makes
    // itself; everything structural lives in its editor and goes through
    // settingsMutations.ts.
    const { settings, setSettings } = useSettings();

    return (
        <>
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
                <WeeklySales />
            </Section>

            <Section
                id="menu-items"
                title="Menu items, sizes & recipes"
                description="Set your prices and the amount of each ingredient per size. Margins update live."
            >
                <div className="flex flex-col gap-4">
                    {settings.items.map((item) => (
                        <MenuItemEditor key={item.id} item={item} />
                    ))}
                </div>
            </Section>

            <Section
                id="ingredients"
                title="Ingredient costs"
                description="What you pay per pound, ounce, or unit — priced directly, or derived from a batch. This drives every cost above."
            >
                <Card className="overflow-hidden">
                    <IngredientsEditor />
                </Card>
            </Section>

            <Section
                id="other-costs"
                title="Other costs"
                description="Applied across the whole menu."
            >
                <Card className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <FieldLabel>Packaging cost per order</FieldLabel>
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
                        <FieldLabel>Weekly grocery spend</FieldLabel>
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
                </Card>
            </Section>
        </>
    );
}
