import { beforeEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/test/fixtures/defaultSettings.ts";
import { computeChangeSet } from "./diff.ts";
import { rowsToSettings, settingsToRows } from "./rows.ts";
import { applyChangeSet, fetchSettings } from "./settingsRepo.ts";

// Chainable PostgREST stub: every method returns the same query object, and
// awaiting it resolves to { data, error } configured per table. Each call is
// recorded so tests can assert order and arguments.
interface RecordedCall {
    table: string;
    method: string;
    args: unknown[];
}

const mock = vi.hoisted(() => {
    const calls: RecordedCall[] = [];
    const data = new Map<string, unknown>();
    const errors = new Map<string, string>();

    function from(table: string) {
        const query: Record<string, unknown> = {};
        let range: [number, number] | null = null;
        for (const method of [
            "select",
            "order",
            "range",
            "maybeSingle",
            "upsert",
            "insert",
            "delete",
            "eq",
            "neq",
            "gte",
            "in",
        ]) {
            query[method] = (...args: unknown[]) => {
                calls.push({ table, method, args });
                if (method === "range") {
                    range = args as [number, number];
                }
                return query;
            };
        }
        query.then = (
            onFulfilled: (value: unknown) => unknown,
            onRejected?: (reason: unknown) => unknown,
        ) => {
            let rows = data.get(table) ?? null;
            if (range && Array.isArray(rows)) {
                rows = rows.slice(range[0], range[1] + 1);
            }
            return Promise.resolve({
                data: rows,
                error: errors.has(table)
                    ? { message: errors.get(table) }
                    : null,
            }).then(onFulfilled, onRejected);
        };
        return query;
    }

    return { calls, data, errors, from };
});

vi.mock("@/lib/supabase.ts", () => ({
    supabase: { from: mock.from },
}));

beforeEach(() => {
    mock.calls.length = 0;
    mock.data.clear();
    mock.errors.clear();
});

/** The mutation calls (table + method) in the order they were issued. */
function mutationOrder(): string[] {
    return mock.calls
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
            "transactions",
            "events",
            "purchases",
            "market_overrides",
            "processor_fees",
            "market_settings",
        ]) {
            mock.data.set(table, []);
        }
        expect(await fetchSettings()).toBeNull();
    });

    function seedAllTables() {
        const snapshot = settingsToRows(DEFAULT_SETTINGS);
        mock.data.set("settings", snapshot.settings);
        mock.data.set("ingredients", snapshot.ingredients);
        mock.data.set("batch_lines", snapshot.batchLines);
        mock.data.set("menu_items", snapshot.menuItems);
        mock.data.set("variants", snapshot.variants);
        mock.data.set("recipe_lines", snapshot.recipeLines);
        mock.data.set("transactions", snapshot.transactions);
        mock.data.set("events", snapshot.events);
        mock.data.set("purchases", snapshot.purchases);
        mock.data.set("market_overrides", snapshot.marketOverrides);
        mock.data.set("processor_fees", snapshot.processorFees);
        mock.data.set("market_settings", snapshot.marketSettings);
    }

    test("assembles a full Settings object from the twelve tables", async () => {
        seedAllTables();
        expect(await fetchSettings()).toEqual(BASE);
    });

    test("throws when a select fails", async () => {
        mock.errors.set("ingredients", "permission denied");
        await expect(fetchSettings()).rejects.toThrow("permission denied");
    });

    test("pages past the 1000-row cap to load every transaction", async () => {
        seedAllTables();
        mock.data.set(
            "transactions",
            Array.from({ length: 2500 }, (_, index) => ({
                id: String(index),
                date: "2026-07-11T17:19:00.000Z",
                amount: 1,
                type: "Sale",
                result: "Approved",
                method: "Tapped",
                brand: null,
            })),
        );

        const settings = await fetchSettings();
        expect(settings!.transactions).toHaveLength(2500);
        expect(settings!.transactions.map((txn) => txn.id)).toEqual(
            Array.from({ length: 2500 }, (_, index) => String(index)),
        );

        const rangeCalls = mock.calls.filter(
            (call) => call.table === "transactions" && call.method === "range",
        );
        expect(rangeCalls.map((call) => call.args)).toEqual([
            [0, 999],
            [1000, 1999],
            [2000, 2999],
        ]);
    });

    test("fetches a single page when transactions fit within the cap", async () => {
        seedAllTables();
        await fetchSettings();

        const rangeCalls = mock.calls.filter(
            (call) => call.table === "transactions" && call.method === "range",
        );
        expect(rangeCalls.map((call) => call.args)).toEqual([[0, 999]]);
    });

    test("propagates errors from paginated fetches", async () => {
        seedAllTables();
        mock.errors.set("transactions", "permission denied");
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

        const variantUpsert = mock.calls.find(
            (call) => call.table === "variants" && call.method === "upsert",
        )!;
        expect(variantUpsert.args[1]).toEqual({ onConflict: "item_id,id" });
    });

    test("transaction inserts ignore duplicates so existing rows win", async () => {
        const next = structuredClone(BASE);
        next.transactions = [
            {
                id: "42",
                date: "2026-07-11T17:19:00.000Z",
                amount: 9,
                type: "Sale",
                result: "Approved",
                method: "Tapped",
            },
        ];
        await applyChangeSet(computeChangeSet(BASE, next));

        expect(mutationOrder()).toEqual(["transactions.upsert"]);
        const upsert = mock.calls.find(
            (call) => call.table === "transactions" && call.method === "upsert",
        )!;
        expect(upsert.args[1]).toEqual({
            onConflict: "id",
            ignoreDuplicates: true,
        });
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
        const upsert = mock.calls.find(
            (call) => call.table === "events" && call.method === "upsert",
        )!;
        expect(upsert.args[1]).toEqual({ onConflict: "date,market" });
        const deleteEqs = mock.calls.filter(
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
        const upsert = mock.calls.find(
            (call) => call.table === "purchases" && call.method === "upsert",
        )!;
        expect(upsert.args[1]).toEqual({ onConflict: "id" });
        const deleteIn = mock.calls.find(
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
        const upsert = mock.calls.find(
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
        const upsert = mock.calls.find(
            (call) => call.table === "processor_fees",
        )!;
        expect(upsert.args[1]).toEqual({ onConflict: "month" });
    });

    test("classification changes upsert the whole four-row set", async () => {
        const next = structuredClone(BASE);
        next.marketClassifications["fm-1488"] = "exit";
        await applyChangeSet(computeChangeSet(BASE, next));

        expect(mutationOrder()).toEqual(["market_settings.upsert"]);
        const upsert = mock.calls.find(
            (call) => call.table === "market_settings",
        )!;
        expect(upsert.args[0]).toHaveLength(4);
    });

    test("propagates the first database error", async () => {
        mock.errors.set("settings", "row level security violation");
        const next = { ...BASE, groceryWeeklySpend: 999 };
        await expect(
            applyChangeSet(computeChangeSet(BASE, next)),
        ).rejects.toThrow("row level security violation");
    });
});
