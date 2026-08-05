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
            "events",
            "purchases",
            "market_overrides",
            "processor_fees",
            "market_settings",
        ]) {
            stub.data.set(table, []);
        }
        expect(await fetchSettings()).toBeNull();
    });

    function seedAllTables() {
        seedSettingsTables(DEFAULT_SETTINGS);
    }

    test("assembles a full Settings object from the eleven tables", async () => {
        seedAllTables();
        expect(await fetchSettings()).toEqual(BASE);
    });

    test("throws when a select fails", async () => {
        stub.errors.set("ingredients", "permission denied");
        await expect(fetchSettings()).rejects.toThrow("permission denied");
    });

    test("pages past the 1000-row cap to load every market override", async () => {
        seedAllTables();
        // One override per corrected day — distinct dates, or the keyed
        // Settings.marketOverrides record would collapse.
        const date = (index: number) =>
            new Date(Date.UTC(2020, 0, 1 + index)).toISOString().slice(0, 10);
        stub.data.set(
            "market_overrides",
            Array.from({ length: 2500 }, (_, index) => ({
                date: date(index),
                market: "new-caney",
            })),
        );

        const settings = await fetchSettings();
        expect(Object.keys(settings!.marketOverrides)).toHaveLength(2500);
        expect(settings!.marketOverrides[date(0)]).toBe("new-caney");
        expect(settings!.marketOverrides[date(2499)]).toBe("new-caney");

        const rangeCalls = stub.calls.filter(
            (call) =>
                call.table === "market_overrides" && call.method === "range",
        );
        expect(rangeCalls.map((call) => call.args)).toEqual([
            [0, 999],
            [1000, 1999],
            [2000, 2999],
        ]);
    });

    test("propagates errors from the market_overrides fetch", async () => {
        seedAllTables();
        stub.errors.set("market_overrides", "permission denied");
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

    test("event edits upsert by composite key and delete per key", async () => {
        const event = {
            date: "2026-07-11",
            market: "grogans-mill" as const,
            marketFee: 20,
            waste: 0,
            employeeHours: 0,
            billysHours: 0,
        };
        const prev = {
            ...BASE,
            events: [event, { ...event, date: "2026-07-18" }],
        };
        const next = {
            ...BASE,
            events: [{ ...event, waste: 10 }],
        };
        await applyChangeSet(computeChangeSet(prev, next));

        expect(mutationOrder()).toEqual(["events.upsert", "events.delete"]);
        const upsert = stub.calls.find(
            (call) => call.table === "events" && call.method === "upsert",
        )!;
        expect(upsert.args[1]).toEqual({ onConflict: "date,market" });
        const deleteEqs = stub.calls.filter(
            (call) => call.table === "events" && call.method === "eq",
        );
        expect(deleteEqs.map((call) => call.args)).toEqual([
            ["date", "2026-07-18"],
            ["market", "grogans-mill"],
        ]);
    });

    test("purchase edits upsert by id then delete removed ids", async () => {
        const purchase = {
            id: "p1",
            date: "2026-07-20",
            category: "fuel" as const,
            amount: 30,
        };
        const prev = {
            ...BASE,
            purchases: [purchase, { ...purchase, id: "p2" }],
        };
        const next = {
            ...BASE,
            purchases: [{ ...purchase, amount: 45 }],
        };
        await applyChangeSet(computeChangeSet(prev, next));

        expect(mutationOrder()).toEqual([
            "purchases.upsert",
            "purchases.delete",
        ]);
        const upsert = stub.calls.find(
            (call) => call.table === "purchases" && call.method === "upsert",
        )!;
        expect(upsert.args[1]).toEqual({ onConflict: "id" });
        const deleteIn = stub.calls.find(
            (call) => call.table === "purchases" && call.method === "in",
        )!;
        expect(deleteIn.args).toEqual(["id", ["p2"]]);
    });

    test("market override changes upsert and delete by date", async () => {
        const prev = {
            ...BASE,
            marketOverrides: { "2026-07-19": "other" as const },
        };
        const next = {
            ...BASE,
            marketOverrides: { "2026-07-25": "new-caney" as const },
        };
        await applyChangeSet(computeChangeSet(prev, next));

        expect(mutationOrder()).toEqual([
            "market_overrides.upsert",
            "market_overrides.delete",
        ]);
        const upsert = stub.calls.find(
            (call) =>
                call.table === "market_overrides" && call.method === "upsert",
        )!;
        expect(upsert.args[0]).toEqual([
            { date: "2026-07-25", market: "new-caney" },
        ]);
        expect(upsert.args[1]).toEqual({ onConflict: "date" });
    });

    test("processor fee changes upsert by month", async () => {
        const next = {
            ...BASE,
            processorFees: [{ month: "2026-07", amount: 84 }],
        };
        await applyChangeSet(computeChangeSet(BASE, next));

        expect(mutationOrder()).toEqual(["processor_fees.upsert"]);
        const upsert = stub.calls.find(
            (call) => call.table === "processor_fees",
        )!;
        expect(upsert.args[1]).toEqual({ onConflict: "month" });
    });

    test("classification changes upsert the whole four-row set", async () => {
        const next = structuredClone(BASE);
        next.marketClassifications["fm-1488"] = "exit";
        await applyChangeSet(computeChangeSet(BASE, next));

        expect(mutationOrder()).toEqual(["market_settings.upsert"]);
        const upsert = stub.calls.find(
            (call) => call.table === "market_settings",
        )!;
        expect(upsert.args[0]).toHaveLength(4);
    });

    test("propagates the first database error", async () => {
        stub.errors.set("settings", "row level security violation");
        const next = { ...BASE, groceryWeeklySpend: 999 };
        await expect(
            applyChangeSet(computeChangeSet(BASE, next)),
        ).rejects.toThrow("row level security violation");
    });
});
