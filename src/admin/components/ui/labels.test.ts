import { expect, test } from "vitest";
import {
    CATEGORY_LABELS,
    MARKET_LABELS,
} from "@/admin/components/ui/labels.ts";
import { MARKETS, PURCHASE_CATEGORIES } from "@/admin/domain/types.ts";

// The point of these: adding a market or a purchase category to the schema
// without a display name here would otherwise surface as a blank dropdown
// option rather than a failing test.

test("every market has a label", () => {
    for (const market of MARKETS) {
        expect(MARKET_LABELS[market]).toBeTruthy();
    }
    expect(Object.keys(MARKET_LABELS).sort()).toEqual([...MARKETS].sort());
});

test("every purchase category has a label", () => {
    for (const category of PURCHASE_CATEGORIES) {
        expect(CATEGORY_LABELS[category]).toBeTruthy();
    }
    expect(Object.keys(CATEGORY_LABELS).sort()).toEqual(
        [...PURCHASE_CATEGORIES].sort(),
    );
});
