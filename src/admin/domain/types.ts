// Data model for the profit-margin calculator.
//
// A recipe line can reference a real ingredient by id, or the special sentinel
// id `PROTEIN_INGREDIENT_ID` which resolves at calculation time to whichever
// protein (beef or pork) is currently selected. That lets one recipe describe
// both the beef and pork versions of a dish without duplication.

export const UNITS = ["lb", "oz", "each"] as const;
export type Unit = (typeof UNITS)[number];

export const PROTEINS = ["beef", "pork"] as const;
export type Protein = (typeof PROTEINS)[number];

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

/** The markets Billy sells at, plus "other" for non-market-day sales. */
export type Market = "grogans-mill" | "new-caney" | "fm-1488" | "other";

/** Fixed order — persistence emits market rows in this order so diffs are stable. */
export const MARKETS: Market[] = [
    "grogans-mill",
    "new-caney",
    "fm-1488",
    "other",
];

/** The growth plan's five-way market classification (§17.2). */
export const MARKET_CLASSIFICATIONS = [
    "growth",
    "core",
    "development",
    "probation",
    "exit",
] as const;
export type MarketClassification = (typeof MARKET_CLASSIFICATIONS)[number];

/** Direct expenses recorded for one market on one local calendar day. */
export interface MarketEvent {
    /** Local calendar day, "YYYY-MM-DD". */
    date: string;
    market: Market;
    /** Booth/stall fee in dollars. */
    marketFee: number;
    /** Dollar value of food wasted at this event. */
    waste: number;
    /**
     * Paid employee hours; costed at the market's hourly rate
     * (`Settings.marketHourlyRates`) or the global `employeeHourlyRate`.
     */
    employeeHours: number;
    /** Billy's own hours — recorded and displayed, never subtracted. */
    billysHours: number;
}

/** What a shopping trip bought. Fixed order for stable row emission and UI. */
export const PURCHASE_CATEGORIES = ["food", "fuel", "propane", "ice"] as const;
export type PurchaseCategory = (typeof PURCHASE_CATEGORIES)[number];

/**
 * One shopping trip's spend in one category. Costs are not entered per event;
 * each purchase is distributed across the events between it and the next
 * purchase of the same category, proportional to event sales.
 */
export interface Purchase {
    id: string;
    /** Local calendar day, "YYYY-MM-DD". */
    date: string;
    category: PurchaseCategory;
    amount: number;
    note?: string;
}

/** One month's card-processor fee total, from the Square statement. */
export interface ProcessorFee {
    /** Calendar month, "YYYY-MM". */
    month: string;
    amount: number;
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
    /** Which protein to price the recipes with (a what-if toggle, remembered). */
    selectedProtein: Protein;
    ingredients: Ingredient[];
    items: MenuItem[];
    /** Typical weekly grocery spend, used for the break-even estimate. */
    groceryWeeklySpend: number;
    /** Packaging/container cost added to every order, in dollars. */
    packagingCostPerOrder: number;
    /**
     * Food cost as a percent of price, used to estimate profit for a sale whose
     * amount matches no menu price. e.g. 32 = 32%.
     */
    blendedFoodCostPercent: number;
    /** Per-event expense records, keyed by (date, market). */
    events: MarketEvent[];
    /**
     * Days whose auto-tagged market was wrong: local "YYYY-MM-DD" → the market
     * that day actually was. Absent = trust `marketForDate`.
     */
    marketOverrides: Record<string, Market>;
    /** Manually chosen classification per market; null = not yet classified. */
    marketClassifications: Record<Market, MarketClassification | null>;
    /** Dollars per hour used to cost `MarketEvent.employeeHours`. */
    employeeHourlyRate: number;
    /** Per-market hourly rate; null = use the global `employeeHourlyRate`. */
    marketHourlyRates: Record<Market, number | null>;
    /**
     * Sales-tax rate baked into the tax-inclusive menu prices, e.g. 8.25 = 8.25%.
     * Pre-tax sales = amount ÷ (1 + rate/100).
     */
    salesTaxRatePercent: number;
}

/**
 * The keyed logs the dashboard appends to as the season goes on. Unlike the
 * config document these grow without bound and are edited one row at a time,
 * so they live outside Settings on their own sync engine.
 */
export interface OperatingRecords {
    /** Shopping-trip spend, allocated across events between trips. */
    purchases: Purchase[];
    /** Monthly card-processor fee totals, spread across the month's events. */
    processorFees: ProcessorFee[];
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
