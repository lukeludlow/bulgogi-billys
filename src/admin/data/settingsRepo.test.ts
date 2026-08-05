import { beforeEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/test/fixtures/defaultSettings.ts";
import { seedSettingsTables, stub } from "@/test/postgrestStub.ts";
import { computeChangeSet } from "./diff.ts";
import { rowsToSettings, settingsToRows } from "./rows.ts";
import { applyChangeSet, fetchSettings } from "./settingsRepo.ts";

vi.mock("@/admin/data/supabase.ts", async () => {
    const { stub } = await import("@/test/postgrestStub.ts");
    return { supabase: { from: stub.from } };
});

beforeEach(() => {
    stub.reset();
});

/** The mutation calls (table + method) in the order they were issued. */
function mutationOrder(): string[] {
    return stub.calls
        .filter((call) => ["upsert", "insert", "delete"].includes(call.method))
        .map((call) => `${call.table}.${call.method}`);
}

const BASE = rowsToSettings(settingsToRows(DEFAULT_SETTINGS));

describe("fetchSettings", () => {
    test("returns null when the settings row has never been seeded", async () => {
        for (const table of [
            "ingredients",
            "batch_lines",
            "menu_items",
            "variants",
            "recipe_lines",
        ]) {
            stub.data.set(table, []);
        }
        expect(await fetchSettings()).toBeNull();
    });

    function seedAllTables() {
        seedSettingsTables(DEFAULT_SETTINGS);
    }

    test("assembles a full Settings object from the six config tables", async () => {
        seedAllTables();
        expect(await fetchSettings()).toEqual(BASE);
    });

    test("throws when a select fails", async () => {
        stub.errors.set("ingredients", "permission denied");
        await expect(fetchSettings()).rejects.toThrow("permission denied");
    });
});

describe("applyChangeSet", () => {
    test("config rewrite runs FK-safe: parent upserts, line rewrites, then deletes", async () => {
        const next = structuredClone(BASE);
        next.ingredients[0].costPerUnit = 9;
        next.items[0].variants.pop();
        await applyChangeSet(computeChangeSet(BASE, next));

        expect(mutationOrder()).toEqual([
            "ingredients.upsert",
            "menu_items.upsert",
            "variants.upsert",
            "batch_lines.delete",
            "batch_lines.insert",
            "recipe_lines.delete",
            "recipe_lines.insert",
            "variants.delete",
        ]);

        const variantUpsert = stub.calls.find(
            (call) => call.table === "variants" && call.method === "upsert",
        )!;
        expect(variantUpsert.args[1]).toEqual({ onConflict: "item_id,id" });
    });

    test("propagates the first database error", async () => {
        stub.errors.set("settings", "row level security violation");
        const next = { ...BASE, groceryWeeklySpend: 999 };
        await expect(
            applyChangeSet(computeChangeSet(BASE, next)),
        ).rejects.toThrow("row level security violation");
    });
});
