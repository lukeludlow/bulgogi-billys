// The RLS matrix (REFACTOR_PLAN §5.3): every data table, every role.
//
// RLS in Postgres — not anything in the client — is the app's real security
// boundary (BACKEND_ARCHITECTURE §2), and until this file existed nothing
// tested it. Two failure modes it exists to catch: a table added by a future
// migration that forgets `enable row level security` or its policy, and a
// grant that hands anon more than nothing.
//
// Note the asymmetry between the roles: anon has no table grants at all, so
// Postgres rejects its statements outright. A signed-in non-admin passes the
// grants and is stopped by the policies instead — which means its UPDATE and
// DELETE succeed against *zero rows* rather than erroring. Those cases assert
// on the surviving row, not on an error, or they would pass for the wrong
// reason.

import { beforeAll, describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
    ADMIN_EMAIL,
    clientAs,
    insertRow,
    readRows,
    resetData,
    type Role,
} from "./localStack.ts";

interface Probe {
    /** A complete, valid row this table doesn't already have. */
    row: Record<string, unknown>;
    /** Primary key of `row`, as a PostgREST match filter. */
    filter: Record<string, string | number>;
    /** A change an authorized caller is allowed to make. */
    patch: Record<string, unknown>;
}

const PROBES: Record<string, Probe> = {
    settings: {
        row: { id: 1 },
        filter: { id: 1 },
        patch: { grocery_weekly_spend: 123 },
    },
    ingredients: {
        row: {
            id: "probe",
            name: "Probe",
            unit: "lb",
            cost_per_unit: 1,
            pricing: "direct",
            batch_yield: null,
            position: 99,
        },
        filter: { id: "probe" },
        patch: { cost_per_unit: 2 },
    },
    batch_lines: {
        row: {
            ingredient_id: "seoul",
            id: "probe",
            name: "Probe",
            cost: 1,
            position: 99,
        },
        filter: { ingredient_id: "seoul", id: "probe" },
        patch: { cost: 2 },
    },
    menu_items: {
        row: { id: "probe", name: "Probe", has_protein: false, position: 99 },
        filter: { id: "probe" },
        patch: { name: "Renamed" },
    },
    variants: {
        row: {
            item_id: "fries",
            id: "probe",
            label: "Probe",
            sell_price: 1,
            units_sold_this_week: 0,
            position: 99,
        },
        filter: { item_id: "fries", id: "probe" },
        patch: { sell_price: 2 },
    },
    recipe_lines: {
        row: {
            item_id: "fries",
            variant_id: "small",
            ingredient_id: "probe",
            amount: 1,
            position: 99,
        },
        filter: {
            item_id: "fries",
            variant_id: "small",
            ingredient_id: "probe",
        },
        patch: { amount: 2 },
    },
    transactions: {
        row: {
            id: "probe",
            date: "2026-07-01T17:00:00Z",
            amount: 10,
            type: "Sale",
            result: "Approved",
            method: "Card",
            brand: null,
        },
        filter: { id: "probe" },
        patch: { amount: 11 },
    },
    events: {
        row: {
            date: "2026-07-01",
            market: "other",
            market_fee: 0,
            waste: 0,
            employee_hours: 0,
            billys_hours: 0,
        },
        filter: { date: "2026-07-01", market: "other" },
        patch: { market_fee: 5 },
    },
    purchases: {
        row: {
            id: "probe",
            date: "2026-07-01",
            category: "fuel",
            amount: 1,
            note: null,
        },
        filter: { id: "probe" },
        patch: { amount: 2 },
    },
    market_overrides: {
        row: { date: "2026-07-01", market: "other" },
        filter: { date: "2026-07-01" },
        patch: { market: "fm-1488" },
    },
    processor_fees: {
        row: { month: "2026-07", amount: 1 },
        filter: { month: "2026-07" },
        patch: { amount: 2 },
    },
    market_settings: {
        row: {
            market: "other",
            classification: null,
            employee_hourly_rate: null,
        },
        filter: { market: "other" },
        patch: { classification: "core" },
    },
    reserve_transfers: {
        row: {
            id: "probe",
            date: "2026-07-01",
            fund: "emergency",
            amount: 100,
            note: null,
        },
        filter: { id: "probe" },
        patch: { amount: 250 },
    },
};

const TABLES = Object.keys(PROBES);

/**
 * The matrix is data-driven over table names, which the generated row types
 * can't express; one cast here keeps every assertion below type-free.
 */
async function as(role: Role): Promise<SupabaseClient> {
    return (await clientAs(role)) as unknown as SupabaseClient;
}

/** Does the probe row still exist, exactly as seeded? */
function probeRow(table: string): Record<string, unknown> | undefined {
    const { filter } = PROBES[table];
    const where = Object.entries(filter)
        .map(([column, value]) =>
            typeof value === "number"
                ? `${column} = ${value}`
                : `${column} = '${value}'`,
        )
        .join(" and ");
    return readRows(table, where)[0];
}

function seedProbes(): void {
    resetData();
    for (const table of TABLES) insertRow(table, PROBES[table].row);
}

describe("anon has no access to any data table", () => {
    beforeAll(seedProbes);

    test.each(TABLES)("%s rejects every statement", async (table) => {
        const client = await as("anon");
        const { filter, patch, row } = PROBES[table];

        expect((await client.from(table).select("*")).error).not.toBeNull();
        expect((await client.from(table).upsert(row)).error).not.toBeNull();
        expect(
            (await client.from(table).update(patch).match(filter)).error,
        ).not.toBeNull();
        expect(
            (await client.from(table).delete().match(filter)).error,
        ).not.toBeNull();
    });

    test("the admin allowlist is unreadable", async () => {
        const client = await as("anon");
        expect(
            (await client.from("admin_users").select("*")).error,
        ).not.toBeNull();
    });
});

describe("a signed-in non-admin sees nothing and changes nothing", () => {
    beforeAll(seedProbes);

    test.each(TABLES)("%s is empty and immutable", async (table) => {
        const client = await as("nonAdmin");
        const { filter, patch, row } = PROBES[table];

        // The grants let the statement run; the policy filters every row.
        const read = await client.from(table).select("*");
        expect(read.error).toBeNull();
        expect(read.data).toEqual([]);

        // `with check` rejects the write outright.
        expect((await client.from(table).upsert(row)).error).not.toBeNull();

        // These match zero rows rather than erroring, so the proof is that
        // the row is still there and still unchanged.
        const before = probeRow(table);
        expect(
            (await client.from(table).update(patch).match(filter)).error,
        ).toBeNull();
        expect(
            (await client.from(table).delete().match(filter)).error,
        ).toBeNull();
        expect(probeRow(table)).toEqual(before);
    });

    test("the admin allowlist reads empty", async () => {
        const client = await as("nonAdmin");
        const { data, error } = await client.from("admin_users").select("*");
        expect(error).toBeNull();
        expect(data).toEqual([]);
    });
});

describe("an allowlisted admin has full access", () => {
    beforeAll(seedProbes);

    test.each(TABLES)("%s round-trips select/update/delete", async (table) => {
        const client = await as("admin");
        const { filter, patch, row } = PROBES[table];

        const read = await client.from(table).select("*");
        expect(read.error).toBeNull();
        expect(read.data?.length).toBeGreaterThan(0);

        expect(
            (await client.from(table).update(patch).match(filter)).error,
        ).toBeNull();
        expect(probeRow(table)).toMatchObject(patch);

        expect(
            (await client.from(table).delete().match(filter)).error,
        ).toBeNull();
        expect(probeRow(table)).toBeUndefined();

        expect((await client.from(table).upsert(row)).error).toBeNull();
        expect(probeRow(table)).toBeDefined();
    });

    test("the allowlist is readable but not editable", async () => {
        const client = await as("admin");
        const { data, error } = await client.from("admin_users").select("*");
        expect(error).toBeNull();
        expect(data).toEqual([{ email: ADMIN_EMAIL }]);

        // Membership is managed by seed (locally) or the SQL editor (hosted),
        // never from the app: there is no
        // insert policy, so even an admin is refused.
        expect(
            (
                await client
                    .from("admin_users")
                    .insert({ email: "someone@example.test" })
            ).error,
        ).not.toBeNull();
    });
});
