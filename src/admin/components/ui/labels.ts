// Human-readable names for the enum values the schema stores. UI strings, so
// they live here rather than in the pure analytics engines that produce the
// values (domain/eventAnalytics.ts) or in the editor that first needed them
// (PurchasesEditor.tsx).

import type {
    Market,
    PurchaseCategory,
    ReserveFund,
} from "@/admin/domain/types.ts";

export const MARKET_LABELS: Record<Market, string> = {
    "grogans-mill": "Grogan's Mill",
    "new-caney": "New Caney",
    "fm-1488": "Farmers Market at 1488",
    other: "Other",
};

export const CATEGORY_LABELS: Record<PurchaseCategory, string> = {
    food: "Food",
    fuel: "Fuel",
    propane: "Propane",
    ice: "Ice",
};

export const FUND_LABELS: Record<ReserveFund, string> = {
    emergency: "Emergency reserve",
    expansion: "Expansion fund",
};
