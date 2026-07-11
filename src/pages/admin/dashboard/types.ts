// Data model for the profit-margin calculator.
//
// A recipe line can reference a real ingredient by id, or the special sentinel
// id `PROTEIN_INGREDIENT_ID` which resolves at calculation time to whichever
// protein (beef or pork) is currently selected. That lets one recipe describe
// both the beef and pork versions of a dish without duplication.

export type Unit = "lb" | "oz" | "each";
export type Protein = "beef" | "pork";

/** Sentinel recipe-line ingredient id that resolves to the selected protein. */
export const PROTEIN_INGREDIENT_ID = "protein";

export interface Ingredient {
    id: string;
    name: string;
    unit: Unit;
    /** Cost in dollars for one `unit` of this ingredient. */
    costPerUnit: number;
}

export interface RecipeLine {
    /** An `Ingredient.id`, or `PROTEIN_INGREDIENT_ID` for the chosen protein. */
    ingredientId: string;
    /** Quantity used, expressed in the referenced ingredient's unit. */
    amount: number;
}

export interface Variant {
    id: string;
    /** e.g. "Small", "Regular", "Large", "Texas", "One Taco", "Three Tacos". */
    label: string;
    /** Menu price charged to the customer, in dollars. */
    sellPrice: number;
    recipe: RecipeLine[];
}

export interface MenuItem {
    id: string;
    name: string;
    /** Whether the Beef/Pork choice applies to this item. */
    hasProtein: boolean;
    variants: Variant[];
}

export interface Settings {
    version: number;
    /** Which protein to price the recipes with (a what-if toggle, remembered). */
    selectedProtein: Protein;
    ingredients: Ingredient[];
    items: MenuItem[];
    /** Typical weekly grocery spend, used for the break-even estimate. */
    groceryWeeklySpend: number;
    /** Packaging/container cost added to every order, in dollars. */
    packagingCostPerOrder: number;
}

/** A single item×size combination with its computed economics. */
export interface Combination {
    itemId: string;
    itemName: string;
    variantId: string;
    variantLabel: string;
    /** "Bulgogi Fries — Large" */
    label: string;
    /** "Fries · Large" (compact, for chart axes) */
    shortLabel: string;
    revenue: number;
    cost: number;
    grossProfit: number;
    marginPercent: number;
    foodCostPercent: number;
}
