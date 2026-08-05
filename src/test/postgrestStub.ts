// Chainable PostgREST stub shared by tests that mock the supabase client
// itself (rather than a repo module): every query method returns the same
// query object, and awaiting it resolves to { data, error } configured per
// table. Each call is recorded so tests can assert order and arguments.
//
// Browser-tier usage — vi.mock factories are hoisted, so consume it via a
// dynamic import inside the factory; a static import in the test body
// resolves to the same module instance:
//
//     vi.mock("@/admin/data/supabase.ts", async () => {
//         const { stub } = await import("@/test/postgrestStub.ts");
//         return { supabase: { from: stub.from } };
//     });

import { settingsToRows } from "@/admin/data/rows.ts";
import type { Settings } from "@/admin/domain/types.ts";

export interface RecordedCall {
    table: string;
    method: string;
    args: unknown[];
}

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
            error: errors.has(table) ? { message: errors.get(table) } : null,
        }).then(onFulfilled, onRejected);
    };
    return query;
}

function reset() {
    calls.length = 0;
    data.clear();
    errors.clear();
}

export const stub = { calls, data, errors, from, reset };

/** Seed every table `fetchSettings` reads from a Settings fixture. */
export function seedSettingsTables(settings: Settings) {
    const snapshot = settingsToRows(settings);
    data.set("settings", snapshot.settings);
    data.set("ingredients", snapshot.ingredients);
    data.set("batch_lines", snapshot.batchLines);
    data.set("menu_items", snapshot.menuItems);
    data.set("variants", snapshot.variants);
    data.set("recipe_lines", snapshot.recipeLines);
    data.set("transactions", snapshot.transactions);
    data.set("events", snapshot.events);
    data.set("purchases", snapshot.purchases);
    data.set("market_overrides", snapshot.marketOverrides);
    data.set("processor_fees", snapshot.processorFees);
    data.set("market_settings", snapshot.marketSettings);
}
