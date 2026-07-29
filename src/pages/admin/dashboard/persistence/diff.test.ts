import { describe, expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "../defaults.ts";
import type { Settings, Transaction } from "../types.ts";
import { computeChangeSet, isEmptyChangeSet } from "./diff.ts";
import { rowsToSettings, settingsToRows } from "./rows.ts";

const BASE: Settings = rowsToSettings(settingsToRows(DEFAULT_SETTINGS));

function makeTransaction(id: string): Transaction {
    return {
        id,
        date: "2026-07-11T17:19:00.000Z",
        amount: 9,
        type: "Sale",
        result: "Approved",
        method: "Tapped",
    };
}

describe("computeChangeSet", () => {
    test("identical settings produce an empty change set", () => {
        const changeSet = computeChangeSet(BASE, structuredClone(BASE));
        expect(isEmptyChangeSet(changeSet)).toBe(true);
    });

    test("a scalar edit touches only the settings row", () => {
        const next = { ...BASE, groceryWeeklySpend: 500 };
        const changeSet = computeChangeSet(BASE, next);
        expect(changeSet.settings?.grocery_weekly_spend).toBe(500);
        expect(changeSet.config).toBeUndefined();
        expect(changeSet.transactionInserts).toBeUndefined();
    });

    test("an ingredient edit emits the config block and nothing else", () => {
        const next = structuredClone(BASE);
        next.ingredients[0].costPerUnit = 8.5;
        const changeSet = computeChangeSet(BASE, next);
        expect(changeSet.config).toBeDefined();
        expect(changeSet.config?.ingredients[0].cost_per_unit).toBe(8.5);
        expect(changeSet.config?.ingredientDeletes).toEqual([]);
        expect(changeSet.settings).toBeUndefined();
        expect(changeSet.transactionInserts).toBeUndefined();
    });

    test("a removed variant shows up in variantDeletes", () => {
        const next = structuredClone(BASE);
        const removed = next.items[0].variants.pop()!;
        const changeSet = computeChangeSet(BASE, next);
        expect(changeSet.config?.variantDeletes).toEqual([
            { itemId: next.items[0].id, id: removed.id },
        ]);
    });

    test("a removed ingredient shows up in ingredientDeletes", () => {
        const next = structuredClone(BASE);
        const removed = next.ingredients.pop()!;
        const changeSet = computeChangeSet(BASE, next);
        expect(changeSet.config?.ingredientDeletes).toEqual([removed.id]);
    });

    test("imported transactions become inserts only", () => {
        const prev = { ...BASE, transactions: [makeTransaction("1")] };
        const next = {
            ...BASE,
            transactions: [makeTransaction("1"), makeTransaction("2")],
        };
        const changeSet = computeChangeSet(prev, next);
        expect(changeSet.transactionInserts?.map((t) => t.id)).toEqual(["2"]);
        expect(changeSet.config).toBeUndefined();
        expect(changeSet.settings).toBeUndefined();
    });

    test("removed transactions never produce deletes or writes", () => {
        // Safety property: a stale snapshot (e.g. the recovery journal) that
        // lacks transactions the DB already has must not remove them.
        const prev = {
            ...BASE,
            transactions: [makeTransaction("1"), makeTransaction("2")],
        };
        const next = { ...BASE, transactions: [makeTransaction("1")] };
        const changeSet = computeChangeSet(prev, next);
        expect(isEmptyChangeSet(changeSet)).toBe(true);
    });
});
