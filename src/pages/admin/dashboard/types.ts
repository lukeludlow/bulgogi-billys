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

/** One cost line in a batch, e.g. "Soy sauce — $4.00" or "Bottle — $5.00". */
export interface BatchLine {
    id: string;
    name: string;
    /** Total dollars this line contributes to the batch. */
    cost: number;
}

/**
 * A batch/sub-recipe that produces a quantity of an ingredient. The per-unit
 * cost is derived as (sum of line costs) / yield. A single line covers the
 * "whole bottle of Sriracha" case; many lines describe a made-from-scratch
 * batch like Seoul sauce.
 */
export interface Batch {
    /** Output amount produced, expressed in the ingredient's `unit`. */
    yield: number;
    lines: BatchLine[];
}

export interface Ingredient {
    id: string;
    name: string;
    unit: Unit;
    /**
     * Cost in dollars for one `unit`, used directly when `pricing` is
     * "direct" (the default). When `pricing` is "batch" the effective cost is
     * derived from `batch` instead — see `effectiveCostPerUnit`.
     */
    costPerUnit: number;
    /** How the per-unit cost is set. Absent means "direct". */
    pricing?: "direct" | "batch";
    /** Present when `pricing` is "batch". */
    batch?: Batch;
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
    /** How many of this item×size were sold this week. Absent means 0. */
    unitsSoldThisWeek?: number;
}

export interface MenuItem {
    id: string;
    name: string;
    /** Whether the Beef/Pork choice applies to this item. */
    hasProtein: boolean;
    variants: Variant[];
}

/**
 * A single real sale imported from the card/cash processor export. The processor
 * only records the order total, not what was in it.
 */
export interface Transaction {
    /** The processor's "Transaction #" — the dedupe key across re-imports. */
    id: string;
    /** ISO 8601, parsed from the export's "07/11/2026 10:19 AM" local time. */
    date: string;
    /** Order total in dollars. */
    amount: number;
    /** "Sale", "Refund", … kept as-is from the export. */
    type: string;
    /** "Approved" | "Declined" | "Errored". */
    result: string;
    /** "Tapped" | "Cash" | "Keyed" | … */
    method: string;
    /** Card brand, or "Cash". Optional — absent on some rows. */
    brand?: string;
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
    /** Real sales history imported from the processor, deduped by `id`. */
    transactions: Transaction[];
    /**
     * Food cost as a percent of price, used to estimate profit for a sale whose
     * amount matches no menu price. e.g. 32 = 32%.
     */
    blendedFoodCostPercent: number;
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
    /** Units sold this week for this item×size. */
    unitsSoldThisWeek: number;
}
