import type { Transaction } from "@/pages/admin/dashboard/types.ts";

export interface MergeResult {
    transactions: Transaction[];
    /** Rows that were new to the store. */
    added: number;
    /** Rows already present (matched by id) and left as-is. */
    duplicates: number;
}

/**
 * Merge freshly-imported transactions into the existing store, deduping by the
 * processor's transaction id. Existing rows win. New rows are appended and the
 * whole set is sorted newest-first.
 */
export function mergeTransactions(
    existing: Transaction[],
    incoming: Transaction[],
): MergeResult {
    const byId = new Map<string, Transaction>();
    for (const txn of existing) byId.set(txn.id, txn);

    let added = 0;
    let duplicates = 0;
    for (const txn of incoming) {
        if (byId.has(txn.id)) {
            duplicates++;
        } else {
            byId.set(txn.id, txn);
            added++;
        }
    }

    const transactions = Array.from(byId.values()).sort((a, b) =>
        b.date.localeCompare(a.date),
    );
    return { transactions, added, duplicates };
}
