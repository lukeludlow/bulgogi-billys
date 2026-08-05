import { Subheading } from "@/shared/catalyst-ui-kit/heading.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import RecipeGrid from "@/admin/components/RecipeGrid.tsx";
import VariantPriceTable from "@/admin/components/VariantPriceTable.tsx";
import Card from "@/admin/components/ui/Card.tsx";
import * as mutations from "@/admin/domain/settingsMutations.ts";
import { useSettings } from "@/admin/SettingsContext.tsx";
import type { MenuItem } from "@/admin/domain/types.ts";

/**
 * One menu item's card: its sizes and prices with the live economics each
 * implies, then the per-size recipe amounts. The item is a prop because the
 * calculator renders one editor per item; everything else it needs comes from
 * the config document, and every edit goes through settingsMutations.ts.
 */
export default function MenuItemEditor({ item }: { item: MenuItem }) {
    const { settings, setSettings } = useSettings();

    function onChangePrice(variantId: string, value: number) {
        setSettings((prev) =>
            mutations.updateVariant(prev, item.id, variantId, {
                sellPrice: value,
            }),
        );
    }

    function onChangeRecipe(
        variantId: string,
        ingredientId: string,
        value: number,
    ) {
        setSettings((prev) =>
            mutations.updateRecipe(
                prev,
                item.id,
                variantId,
                ingredientId,
                value,
            ),
        );
    }

    return (
        <Card>
            <Subheading>{item.name}</Subheading>

            <Text className="mt-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Sizes & prices
            </Text>
            <VariantPriceTable
                item={item}
                ingredients={settings.ingredients}
                selectedProtein={settings.selectedProtein}
                packagingCostPerOrder={settings.packagingCostPerOrder}
                onChangePrice={onChangePrice}
            />

            <Text className="mt-5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Recipe amounts
            </Text>
            <RecipeGrid
                item={item}
                ingredients={settings.ingredients}
                selectedProtein={settings.selectedProtein}
                onChangeRecipe={onChangeRecipe}
            />
        </Card>
    );
}
