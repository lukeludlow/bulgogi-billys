import { expect, test } from "vitest";
import { mergeTransactions } from "./mergeTransactions.ts";
import type { Transaction } from "../types.ts";

const txn = (
    id: string,
    date: string,
    extra: Partial<Transaction> = {},
): Transaction => ({
    id,
    date,
    amount: 10,
    type: "Sale",
    result: "Approved",
    method: "Cash",
    ...extra,
});

test("adds new transactions and reports counts", () => {
    const result = mergeTransactions(
        [txn("A", "2026-04-12T14:00:00.000Z")],
        [
            txn("A", "2026-04-12T14:00:00.000Z"),
            txn("B", "2026-04-13T14:00:00.000Z"),
        ],
    );
    expect(result.added).toBe(1);
    expect(result.duplicates).toBe(1);
    expect(result.transactions).toHaveLength(2);
});

test("keeps the existing row when the same sale is re-imported", () => {
    const existing = txn("A", "2026-04-12T14:00:00.000Z", { brand: "Visa" });
    const reimported = txn("A", "2026-04-12T14:00:00.000Z");

    const result = mergeTransactions([existing], [reimported]);
    const merged = result.transactions.find((t) => t.id === "A")!;
    expect(merged.brand).toBe("Visa");
});

test("sorts the merged set newest-first", () => {
    const result = mergeTransactions(
        [txn("A", "2026-04-12T14:00:00.000Z")],
        [txn("B", "2026-07-11T14:00:00.000Z")],
    );
    expect(result.transactions.map((t) => t.id)).toEqual(["B", "A"]);
});
