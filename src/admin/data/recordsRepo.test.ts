import { beforeEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_RECORDS } from "@/test/fixtures/defaultSettings.ts";
import { seedRecordsTables, stub } from "@/test/postgrestStub.ts";
import { computeRecordsChangeSet } from "./recordsDiff.ts";
import { applyRecordsChangeSet, fetchRecords } from "./recordsRepo.ts";
import type { OperatingRecords } from "@/admin/domain/types.ts";

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

const BASE: OperatingRecords = DEFAULT_RECORDS;

const PURCHASE = {
    id: "p1",
    date: "2026-07-20",
    category: "fuel" as const,
    amount: 30,
};

describe("fetchRecords", () => {
    test("assembles records from the purchases and fees tables", async () => {
        const seeded: OperatingRecords = {
            ...BASE,
            events: [
                {
                    date: "2026-07-25",
                    market: "grogans-mill",
                    marketFee: 20,
                    waste: 0,
                    employeeHours: 2,
                    billysHours: 6,
                },
            ],
            purchases: [PURCHASE],
            marketOverrides: { "2026-07-25": "new-caney" },
            processorFees: [{ month: "2026-07", amount: 84 }],
        };
        seedRecordsTables(seeded);
        expect(await fetchRecords()).toEqual(seeded);
    });

    test("empty tables are a valid, empty result — not an error", async () => {
        seedRecordsTables(DEFAULT_RECORDS);
        expect(await fetchRecords()).toEqual(DEFAULT_RECORDS);
    });

    test("pages past the 1000-row cap to load every purchase", async () => {
        const purchases = Array.from({ length: 2_400 }, (_, index) => ({
            ...PURCHASE,
            id: `p${String(index).padStart(4, "0")}`,
        }));
        seedRecordsTables({ ...BASE, purchases });

        const records = await fetchRecords();

        expect(records.purchases).toHaveLength(2_400);
        const ranges = stub.calls
            .filter(
                (call) => call.table === "purchases" && call.method === "range",
            )
            .map((call) => call.args);
        expect(ranges).toEqual([
            [0, 999],
            [1000, 1999],
            [2000, 2999],
        ]);
    });

    test("pages past the 1000-row cap to load every market override", async () => {
        seedRecordsTables(DEFAULT_RECORDS);
        // One override per corrected day — distinct dates, or the keyed
        // marketOverrides record would collapse.
        const date = (index: number) =>
            new Date(Date.UTC(2020, 0, 1 + index)).toISOString().slice(0, 10);
        stub.data.set(
            "market_overrides",
            Array.from({ length: 2500 }, (_, index) => ({
                date: date(index),
                market: "new-caney",
            })),
        );

        const records = await fetchRecords();
        expect(Object.keys(records.marketOverrides)).toHaveLength(2500);
        expect(records.marketOverrides[date(0)]).toBe("new-caney");
        expect(records.marketOverrides[date(2499)]).toBe("new-caney");

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
        seedRecordsTables(DEFAULT_RECORDS);
        stub.errors.set("market_overrides", "permission denied");
        await expect(fetchRecords()).rejects.toThrow("permission denied");
    });

    test("sorts purchases newest-first with a stable tiebreaker", async () => {
        seedRecordsTables({ ...BASE, purchases: [PURCHASE] });
        await fetchRecords();
        const orders = stub.calls
            .filter(
                (call) => call.table === "purchases" && call.method === "order",
            )
            .map((call) => call.args);
        expect(orders).toEqual([
            ["date", { ascending: false }],
            ["id", { ascending: true }],
        ]);
    });

    test("propagates errors from a fetch", async () => {
        stub.errors.set("purchases", "permission denied");
        await expect(fetchRecords()).rejects.toThrow("permission denied");
    });
});

describe("applyRecordsChangeSet", () => {
    test("purchase edits upsert by id then delete removed ids", async () => {
        const prev = {
            ...BASE,
            purchases: [PURCHASE, { ...PURCHASE, id: "p2" }],
        };
        const next = { ...BASE, purchases: [{ ...PURCHASE, amount: 45 }] };
        await applyRecordsChangeSet(computeRecordsChangeSet(prev, next));

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

    test("event edits upsert by composite key and delete per key", async () => {
        const event = {
            date: "2026-07-19",
            market: "new-caney" as const,
            marketFee: 20,
            waste: 0,
            employeeHours: 0,
            billysHours: 0,
        };
        const prev = {
            ...BASE,
            events: [event, { ...event, date: "2026-07-11" }],
        };
        const next = { ...BASE, events: [{ ...event, waste: 5 }] };
        await applyRecordsChangeSet(computeRecordsChangeSet(prev, next));

        // The upsert lands before the delete, so a moved row is never absent.
        expect(mutationOrder()).toEqual(["events.upsert", "events.delete"]);
        const upsert = stub.calls.find(
            (call) => call.table === "events" && call.method === "upsert",
        )!;
        expect(upsert.args[1]).toEqual({ onConflict: "date,market" });
        const eqs = stub.calls
            .filter((call) => call.table === "events" && call.method === "eq")
            .map((call) => call.args);
        expect(eqs).toEqual([
            ["date", "2026-07-11"],
            ["market", "new-caney"],
        ]);
    });

    test("market override changes upsert and delete by date", async () => {
        const withOverride = {
            ...BASE,
            marketOverrides: { "2026-07-25": "new-caney" as const },
        };
        await applyRecordsChangeSet(
            computeRecordsChangeSet(BASE, withOverride),
        );
        expect(mutationOrder()).toEqual(["market_overrides.upsert"]);
        expect(
            stub.calls.find((call) => call.table === "market_overrides")!
                .args[1],
        ).toEqual({ onConflict: "date" });

        stub.reset();
        await applyRecordsChangeSet(
            computeRecordsChangeSet(withOverride, BASE),
        );
        expect(mutationOrder()).toEqual(["market_overrides.delete"]);
        const deleteIn = stub.calls.find(
            (call) => call.table === "market_overrides" && call.method === "in",
        )!;
        expect(deleteIn.args).toEqual(["date", ["2026-07-25"]]);
    });

    test("classification changes upsert the whole four-row set", async () => {
        const next = structuredClone(BASE);
        next.marketClassifications["grogans-mill"] = "core";
        await applyRecordsChangeSet(computeRecordsChangeSet(BASE, next));

        expect(mutationOrder()).toEqual(["market_settings.upsert"]);
        const upsert = stub.calls.find(
            (call) => call.table === "market_settings",
        )!;
        expect((upsert.args[0] as unknown[]).length).toBe(4);
        expect(upsert.args[1]).toEqual({ onConflict: "market" });
    });

    test("processor fee changes upsert by month", async () => {
        const next = {
            ...BASE,
            processorFees: [{ month: "2026-07", amount: 84 }],
        };
        await applyRecordsChangeSet(computeRecordsChangeSet(BASE, next));

        expect(mutationOrder()).toEqual(["processor_fees.upsert"]);
        const upsert = stub.calls.find(
            (call) => call.table === "processor_fees",
        )!;
        expect(upsert.args[1]).toEqual({ onConflict: "month" });
    });

    test("an empty change set issues no statements", async () => {
        await applyRecordsChangeSet({});
        expect(mutationOrder()).toEqual([]);
    });

    test("propagates a database error", async () => {
        stub.errors.set("purchases", "row level security");
        const next = { ...BASE, purchases: [PURCHASE] };
        await expect(
            applyRecordsChangeSet(computeRecordsChangeSet(BASE, next)),
        ).rejects.toThrow("row level security");
    });
});
