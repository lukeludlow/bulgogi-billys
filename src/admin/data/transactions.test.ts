import { beforeEach, describe, expect, test, vi } from "vitest";
import { fetchAllTransactions, importTransactions } from "./transactions.ts";
import { stub } from "@/test/postgrestStub.ts";

vi.mock("@/admin/data/supabase.ts", async () => {
    const { stub } = await import("@/test/postgrestStub.ts");
    return { supabase: { from: stub.from } };
});

beforeEach(() => {
    stub.reset();
});

function row(id: string, extra: Record<string, unknown> = {}) {
    return {
        id,
        date: "2026-07-11T17:19:00.000Z",
        amount: 1,
        type: "Sale",
        result: "Approved",
        method: "Tapped",
        brand: null,
        ...extra,
    };
}

describe("fetchAllTransactions", () => {
    test("pages past the 1000-row cap to load every transaction", async () => {
        stub.data.set(
            "transactions",
            Array.from({ length: 2500 }, (_, index) => row(String(index))),
        );

        const transactions = await fetchAllTransactions();
        expect(transactions).toHaveLength(2500);
        expect(transactions.map((txn) => txn.id)).toEqual(
            Array.from({ length: 2500 }, (_, index) => String(index)),
        );

        const rangeCalls = stub.calls.filter((call) => call.method === "range");
        expect(rangeCalls.map((call) => call.args)).toEqual([
            [0, 999],
            [1000, 1999],
            [2000, 2999],
        ]);
    });

    test("fetches a single page when the rows fit within the cap", async () => {
        stub.data.set("transactions", [row("1"), row("2")]);
        await fetchAllTransactions();

        const rangeCalls = stub.calls.filter((call) => call.method === "range");
        expect(rangeCalls.map((call) => call.args)).toEqual([[0, 999]]);
    });

    test("sorts by date descending with id as the paging tiebreaker", async () => {
        stub.data.set("transactions", [row("1")]);
        await fetchAllTransactions();

        const orderCalls = stub.calls.filter((call) => call.method === "order");
        expect(orderCalls.map((call) => call.args)).toEqual([
            ["date", { ascending: false }],
            ["id", { ascending: true }],
        ]);
    });

    test("maps rows to the domain shape: null brand dropped, date normalized", async () => {
        stub.data.set("transactions", [
            row("1", { date: "2026-07-11T17:19:00+00:00", brand: "Visa" }),
            row("2", { brand: null }),
        ]);

        const [card, cash] = await fetchAllTransactions();
        expect(card.date).toBe("2026-07-11T17:19:00.000Z");
        expect(card.brand).toBe("Visa");
        expect(cash).not.toHaveProperty("brand");
    });

    test("propagates fetch errors", async () => {
        stub.errors.set("transactions", "permission denied");
        await expect(fetchAllTransactions()).rejects.toThrow(
            "permission denied",
        );
    });
});

describe("importTransactions", () => {
    test("upserts insert-only so existing rows win", async () => {
        stub.data.set("transactions", []);
        await importTransactions([
            {
                id: "42",
                date: "2026-07-11T17:19:00+00:00",
                amount: 9,
                type: "Sale",
                result: "Approved",
                method: "Tapped",
            },
        ]);

        const upserts = stub.calls.filter((call) => call.method === "upsert");
        expect(upserts).toHaveLength(1);
        // Domain → row: date normalized for timestamptz round-trips, missing
        // brand stored as null.
        expect(upserts[0].args[0]).toEqual([
            {
                id: "42",
                date: "2026-07-11T17:19:00.000Z",
                amount: 9,
                type: "Sale",
                result: "Approved",
                method: "Tapped",
                brand: null,
            },
        ]);
        expect(upserts[0].args[1]).toEqual({
            onConflict: "id",
            ignoreDuplicates: true,
        });
    });

    test("an empty batch never touches the network", async () => {
        await importTransactions([]);
        expect(stub.calls).toHaveLength(0);
    });

    test("propagates upsert errors", async () => {
        stub.errors.set("transactions", "row level security violation");
        await expect(
            importTransactions([
                {
                    id: "42",
                    date: "2026-07-11T17:19:00.000Z",
                    amount: 9,
                    type: "Sale",
                    result: "Approved",
                    method: "Tapped",
                },
            ]),
        ).rejects.toThrow("row level security violation");
    });
});
