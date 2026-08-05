import { beforeEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/test/fixtures/defaultSettings.ts";
import { seedSettingsTables, stub } from "@/test/postgrestStub.ts";
import { computeConfigChange } from "./diff.ts";
import { rowsToSettings, settingsToRows } from "./rows.ts";
import { applyConfig, fetchSettings } from "./settingsRepo.ts";

vi.mock("@/admin/data/supabase.ts", async () => {
    const { stub } = await import("@/test/postgrestStub.ts");
    return { supabase: { from: stub.from, rpc: stub.rpc } };
});

beforeEach(() => {
    stub.reset();
});

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

    test("assembles a full Settings object from the six config tables", async () => {
        seedSettingsTables(DEFAULT_SETTINGS);
        expect(await fetchSettings()).toEqual(BASE);
    });

    test("throws when a select fails", async () => {
        stub.errors.set("ingredients", "permission denied");
        await expect(fetchSettings()).rejects.toThrow("permission denied");
    });
});

describe("applyConfig", () => {
    test("sends the whole document as one RPC call", async () => {
        const next = structuredClone(BASE);
        next.ingredients[0].costPerUnit = 9;
        next.items[0].variants.pop();
        await applyConfig(computeConfigChange(BASE, next)!);

        // One statement, not a sequence — that is what makes it atomic.
        expect(stub.calls).toHaveLength(1);
        const [call] = stub.calls;
        expect(call.table).toBe("rpc:apply_config");
        const { config } = call.args[0] as {
            config: Record<string, unknown[]>;
        };
        expect(config.ingredients[0]).toMatchObject({ cost_per_unit: 9 });
        // The dropped variant is absent rather than listed for deletion.
        expect(config.variants).toHaveLength(
            settingsToRows(BASE).variants.length - 1,
        );
    });

    test("propagates a database error", async () => {
        stub.errors.set("rpc:apply_config", "row level security violation");
        const next = { ...BASE, groceryWeeklySpend: 999 };
        await expect(
            applyConfig(computeConfigChange(BASE, next)!),
        ).rejects.toThrow("row level security violation");
    });
});
