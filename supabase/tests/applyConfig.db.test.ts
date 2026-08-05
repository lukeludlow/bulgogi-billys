// The apply_config(jsonb) RPC (REFACTOR_PLAN B5), tested at the SQL contract
// rather than through the app: the payload here is assembled from the tables
// themselves, so these tests say what the function guarantees to any caller.
//
// The guarantee that matters is atomicity. A sequence of PostgREST statements
// can land half a config; a function body cannot.

import { beforeEach, describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clientAs, readRows, resetData, type Role } from "./localStack.ts";

type Payload = Record<string, unknown>;

async function rpcAs(role: Role, config: Payload) {
    // The generated Args type is Json; the matrix-style casts here keep the
    // test free of type gymnastics it isn't about.
    const client = (await clientAs(role)) as unknown as SupabaseClient;
    return client.rpc("apply_config", { config });
}

/**
 * The document exactly as it currently sits in the six config tables, minus
 * `updated_at` — it is DB-managed, so the app's payload omits it and these
 * comparisons must too (see the updated_at test below).
 */
function currentPayload(): Payload {
    const settings = { ...readRows("settings")[0] };
    delete settings.updated_at;
    return {
        settings,
        ingredients: readRows("ingredients"),
        batch_lines: readRows("batch_lines"),
        menu_items: readRows("menu_items"),
        variants: readRows("variants"),
        recipe_lines: readRows("recipe_lines"),
    };
}

beforeEach(resetData);

describe("an allowlisted admin", () => {
    test("writes scalars, rows, and removals in one call", async () => {
        const config = currentPayload();
        (config.settings as Payload).grocery_weekly_spend = 512;
        (config.ingredients as Payload[]).push({
            id: "kimchi",
            name: "Kimchi",
            unit: "oz",
            cost_per_unit: 0.3,
            pricing: "direct",
            batch_yield: null,
            position: 99,
        });
        // Absent from the payload means gone — the function has no delete list.
        config.recipe_lines = (config.recipe_lines as Payload[]).filter(
            (line) => line.variant_id !== "large",
        );
        config.variants = (config.variants as Payload[]).filter(
            (variant) => variant.id !== "large",
        );

        const { error } = await rpcAs("admin", config);
        expect(error).toBeNull();

        expect(readRows("settings")[0]).toMatchObject({
            grocery_weekly_spend: 512,
        });
        expect(readRows("ingredients", "id = 'kimchi'")).toHaveLength(1);
        expect(readRows("variants", "id = 'large'")).toEqual([]);
        expect(readRows("recipe_lines", "variant_id = 'large'")).toEqual([]);
    });

    test("an unchanged payload leaves the document exactly as it was", async () => {
        const before = currentPayload();
        const { error } = await rpcAs("admin", currentPayload());
        expect(error).toBeNull();
        expect(currentPayload()).toEqual(before);
    });

    test("every save touches settings.updated_at", async () => {
        // The document is written whole, so the settings row is upserted even
        // when only a menu item changed. Nothing reads the column; this is
        // here so the behavior is recorded rather than discovered.
        const before = readRows("settings")[0].updated_at;
        const config = currentPayload();
        (config.menu_items as Payload[])[0].name = "Renamed";
        expect((await rpcAs("admin", config)).error).toBeNull();
        expect(readRows("settings")[0].updated_at).not.toBe(before);
    });

    test("writes the reserve transfer rates with the settings row", async () => {
        // The columns arrived after the function did; a stale function body
        // would silently keep the defaults instead of the caller's rates.
        const config = currentPayload();
        (config.settings as Payload).emergency_reserve_percent = 4;
        (config.settings as Payload).expansion_fund_percent = 1.5;

        expect((await rpcAs("admin", config)).error).toBeNull();
        expect(readRows("settings")[0]).toMatchObject({
            emergency_reserve_percent: 4,
            expansion_fund_percent: 1.5,
        });
    });

    test("emptying a list is honored, not treated as a mistake", async () => {
        const config = currentPayload();
        config.batch_lines = [];
        expect((await rpcAs("admin", config)).error).toBeNull();
        expect(readRows("batch_lines")).toEqual([]);
    });
});

describe("a malformed payload is refused rather than acted on", () => {
    test.each([
        "settings",
        "ingredients",
        "batch_lines",
        "menu_items",
        "variants",
        "recipe_lines",
    ])("a missing %s key raises instead of emptying the table", async (key) => {
        const before = currentPayload();
        const config = currentPayload();
        delete config[key];

        const { error } = await rpcAs("admin", config);
        expect(error?.message).toContain(`"${key}"`);
        expect(currentPayload()).toEqual(before);
    });
});

describe("atomicity", () => {
    test("a violation late in the payload rolls back the whole save", async () => {
        const before = currentPayload();
        const config = currentPayload();

        // A change the old sequential save would have committed before ever
        // reaching the row that fails.
        (config.ingredients as Payload[])[0].cost_per_unit = 99;
        // recipe_lines references (item_id, variant_id) in variants.
        (config.recipe_lines as Payload[]).push({
            item_id: "no-such-item",
            variant_id: "no-such-variant",
            ingredient_id: "fries",
            amount: 1,
            position: 99,
        });

        const { error } = await rpcAs("admin", config);
        expect(error).not.toBeNull();
        expect(currentPayload()).toEqual(before);
    });
});

describe("access", () => {
    test("anon cannot execute it at all", async () => {
        const { error } = await rpcAs("anon", currentPayload());
        expect(error).not.toBeNull();
    });

    test("a signed-in non-admin is stopped by RLS, and nothing changes", async () => {
        const before = currentPayload();
        const config = currentPayload();
        (config.settings as Payload).grocery_weekly_spend = 999;

        const { error } = await rpcAs("nonAdmin", config);
        expect(error).not.toBeNull();
        expect(currentPayload()).toEqual(before);
    });
});
