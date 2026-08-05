// The config document's save path, driven against real Postgres as a real
// admin (REFACTOR_PLAN §5.4's Phase 5 pin).
//
// Everything else that covers this path mocks something: the unit tier mocks
// the supabase client, the browser tier mocks the repo. Neither can tell you
// whether a save actually left the database in the state the app believes it
// is in. This file mocks nothing but the client's *destination* — the repo
// code, the mapping layer and the SQL are all the real ones — so it survives
// a rewrite of how the save is issued. That is exactly what a characterization
// pin is for: it was written against the sequential PostgREST statements and
// must keep passing, unedited, once one apply_config RPC replaces them.

import { beforeEach, expect, test, vi } from "vitest";
import { computeChangeSet } from "@/admin/data/diff.ts";
import { applyChangeSet, fetchSettings } from "@/admin/data/settingsRepo.ts";
import type { Settings } from "@/admin/domain/types.ts";
import { readRows, resetData } from "./localStack.ts";

vi.mock("@/admin/data/supabase.ts", async () => {
    const { clientAs } = await import("./localStack.ts");
    return { supabase: await clientAs("admin") };
});

/**
 * The whole surface the RPC swap changes. Written this way so the assertions
 * below never mention how a save is issued.
 */
async function save(base: Settings, next: Settings): Promise<void> {
    await applyChangeSet(computeChangeSet(base, next));
}

/** Load, mutate, save, reload — the exact cycle the sync engine performs. */
async function edit(mutate: (draft: Settings) => void): Promise<Settings> {
    const base = await fetchSettings();
    expect(base).not.toBeNull();
    const next = structuredClone(base!);
    mutate(next);
    await save(base!, next);
    const reloaded = await fetchSettings();
    expect(reloaded).not.toBeNull();
    return reloaded!;
}

beforeEach(resetData);

test("a scalar edit persists and nothing else moves", async () => {
    const before = await fetchSettings();
    const after = await edit((draft) => {
        draft.groceryWeeklySpend = 512;
        draft.selectedProtein = "pork";
    });

    expect(after.groceryWeeklySpend).toBe(512);
    expect(after.selectedProtein).toBe("pork");
    expect(after.ingredients).toEqual(before!.ingredients);
    expect(after.items).toEqual(before!.items);
});

test("an ingredient edit persists, including its batch lines", async () => {
    const after = await edit((draft) => {
        draft.ingredients[0].costPerUnit = 8.25;
        const batched = draft.ingredients.find((i) => i.batch)!;
        batched.batch!.yield = 100;
        batched.batch!.lines[0].cost = 9;
    });

    expect(after.ingredients[0].costPerUnit).toBe(8.25);
    const batched = after.ingredients.find((i) => i.batch)!;
    expect(batched.batch!.yield).toBe(100);
    expect(batched.batch!.lines[0].cost).toBe(9);
});

test("removing an ingredient removes its rows and its batch lines", async () => {
    const before = await fetchSettings();
    const removed = before!.ingredients.find((i) => i.batch)!;

    const after = await edit((draft) => {
        draft.ingredients = draft.ingredients.filter(
            (i) => i.id !== removed.id,
        );
    });

    expect(after.ingredients.map((i) => i.id)).not.toContain(removed.id);
    expect(readRows("ingredients", `id = '${removed.id}'`)).toEqual([]);
    expect(readRows("batch_lines", `ingredient_id = '${removed.id}'`)).toEqual(
        [],
    );
});

test("removing a variant removes it and its recipe lines", async () => {
    const before = await fetchSettings();
    const item = before!.items[0];
    const removed = item.variants[item.variants.length - 1];

    const after = await edit((draft) => {
        draft.items[0].variants = draft.items[0].variants.filter(
            (v) => v.id !== removed.id,
        );
    });

    expect(after.items[0].variants.map((v) => v.id)).not.toContain(removed.id);
    expect(
        readRows("variants", `item_id = '${item.id}' and id = '${removed.id}'`),
    ).toEqual([]);
    expect(
        readRows(
            "recipe_lines",
            `item_id = '${item.id}' and variant_id = '${removed.id}'`,
        ),
    ).toEqual([]);
});

test("removing a menu item removes its variants and recipe lines", async () => {
    const before = await fetchSettings();
    const removed = before!.items[0];

    const after = await edit((draft) => {
        draft.items = draft.items.filter((i) => i.id !== removed.id);
    });

    expect(after.items).toEqual([]);
    expect(readRows("menu_items", `id = '${removed.id}'`)).toEqual([]);
    expect(readRows("variants", `item_id = '${removed.id}'`)).toEqual([]);
    expect(readRows("recipe_lines", `item_id = '${removed.id}'`)).toEqual([]);
});

test("an added ingredient and variant come back in the order they were placed", async () => {
    const after = await edit((draft) => {
        draft.ingredients.unshift({
            id: "kimchi",
            name: "Kimchi",
            unit: "oz",
            costPerUnit: 0.3,
            pricing: "direct",
        });
        draft.items[0].variants.push({
            id: "family",
            label: "Family",
            sellPrice: 20,
            unitsSoldThisWeek: 0,
            recipe: [{ ingredientId: "kimchi", amount: 2 }],
        });
    });

    expect(after.ingredients[0].id).toBe("kimchi");
    const variants = after.items[0].variants;
    expect(variants[variants.length - 1]).toMatchObject({
        id: "family",
        sellPrice: 20,
        recipe: [{ ingredientId: "kimchi", amount: 2 }],
    });
});

test("a full round-trip through the save leaves the document identical", async () => {
    const before = await fetchSettings();
    const after = await edit((draft) => {
        draft.blendedFoodCostPercent = 29;
    });
    expect(after).toEqual({ ...before, blendedFoodCostPercent: 29 });
});
