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
            purchases: [PURCHASE],
            processorFees: [{ month: "2026-07", amount: 84 }],
        };
        seedRecordsTables(seeded);
        expect(await fetchRecords()).toEqual(seeded);
    });

    test("empty tables are a valid, empty result — not an error", async () => {
        seedRecordsTables(DEFAULT_RECORDS);
        expect(await fetchRecords()).toEqual({
            purchases: [],
            processorFees: [],
        });
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
