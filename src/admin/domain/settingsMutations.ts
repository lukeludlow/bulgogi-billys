// Pure edits to the config document: ingredients, their batches, and the menu
// items' prices and recipes.
//
// Every function takes the current Settings and returns a new one, so the
// editors can stay declarative — they call useSettings() and hand the setter a
// mutator, exactly the way EventsTable applies eventMutations.ts to the
// operational records. Nothing here knows about React or persistence.

import type {
    Batch,
    BatchLine,
    Ingredient,
    Settings,
    Variant,
} from "@/admin/domain/types.ts";

/** Ids for rows created in the browser; the database never generates them. */
export function newId(): string {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
}

/** Replace one ingredient, leaving the rest of the document alone. */
function patchIngredient(
    settings: Settings,
    id: string,
    update: (ingredient: Ingredient) => Ingredient,
): Settings {
    return {
        ...settings,
        ingredients: settings.ingredients.map((ingredient) =>
            ingredient.id === id ? update(ingredient) : ingredient,
        ),
    };
}

/** The ingredient's batch, or an empty one for an ingredient that has none. */
function withBatch(ingredient: Ingredient): Batch {
    return ingredient.batch ?? { yield: 0, lines: [] };
}

export function updateIngredient(
    settings: Settings,
    id: string,
    patch: Partial<Ingredient>,
): Settings {
    return patchIngredient(settings, id, (ingredient) => {
        const next = { ...ingredient, ...patch };
        // Seed a starter batch the first time an ingredient switches to batch
        // pricing, so the derived cost initially matches what was typed
        // directly.
        if (patch.pricing === "batch" && !next.batch) {
            next.batch = {
                yield: 1,
                lines: [{ id: newId(), name: "", cost: next.costPerUnit || 0 }],
            };
        }
        return next;
    });
}

export function updateBatchYield(
    settings: Settings,
    id: string,
    value: number,
): Settings {
    return patchIngredient(settings, id, (ingredient) => ({
        ...ingredient,
        batch: { ...withBatch(ingredient), yield: value },
    }));
}

export function updateBatchLine(
    settings: Settings,
    id: string,
    lineId: string,
    patch: Partial<BatchLine>,
): Settings {
    return patchIngredient(settings, id, (ingredient) => {
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

export function addBatchLine(settings: Settings, id: string): Settings {
    return patchIngredient(settings, id, (ingredient) => {
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

export function removeBatchLine(
    settings: Settings,
    id: string,
    lineId: string,
): Settings {
    return patchIngredient(settings, id, (ingredient) => {
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

export function updateVariant(
    settings: Settings,
    itemId: string,
    variantId: string,
    patch: Partial<Pick<Variant, "sellPrice" | "unitsSoldThisWeek">>,
): Settings {
    return {
        ...settings,
        items: settings.items.map((item) =>
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
    };
}

/**
 * Set how much of one ingredient a variant uses, adding the recipe line if the
 * variant didn't reference that ingredient yet — which is how the recipe grid
 * fills in a blank cell.
 */
export function updateRecipe(
    settings: Settings,
    itemId: string,
    variantId: string,
    ingredientId: string,
    amount: number,
): Settings {
    return {
        ...settings,
        items: settings.items.map((item) => {
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
                                  ? { ...line, amount }
                                  : line,
                          )
                        : [...variant.recipe, { ingredientId, amount }];
                    return { ...variant, recipe };
                }),
            };
        }),
    };
}
