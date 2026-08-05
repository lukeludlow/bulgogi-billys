// Supabase reads/writes for the transactions table. Transactions live
// outside the Settings blob: they are append-only history, imported in
// batches and never edited, so they get their own repo instead of riding
// the settings autosave diff.

import { supabase } from "@/admin/data/supabase.ts";
import { fetchAllRows, unwrap } from "@/admin/data/postgrest.ts";
import type { Transaction } from "@/admin/domain/types.ts";
import type { Database } from "./database.types.ts";

type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];

/** Every transaction, newest first (paged past the PostgREST row cap). */
export async function fetchAllTransactions(): Promise<Transaction[]> {
    const rows = await fetchAllRows<TransactionRow>(
        "transactions",
        "date",
        "id",
    );
    return rows.map(rowToTransaction);
}

/**
 * Insert-only import: existing rows always win (re-importing an export is
 * safe), matching mergeTransactions. No-op for an empty batch.
 */
export async function importTransactions(
    transactions: Transaction[],
): Promise<void> {
    if (transactions.length === 0) return;
    unwrap(
        await supabase
            .from("transactions")
            .upsert(transactions.map(transactionToRow), {
                onConflict: "id",
                ignoreDuplicates: true,
            }),
    );
}

function rowToTransaction(row: TransactionRow): Transaction {
    const transaction: Transaction = {
        id: row.id,
        date: new Date(row.date).toISOString(),
        amount: row.amount,
        type: row.type,
        result: row.result,
        method: row.method,
    };
    if (row.brand !== null) transaction.brand = row.brand;
    return transaction;
}

function transactionToRow(transaction: Transaction): TransactionRow {
    return {
        id: transaction.id,
        // Normalized so a round-trip through timestamptz compares equal.
        date: new Date(transaction.date).toISOString(),
        amount: transaction.amount,
        type: transaction.type,
        result: transaction.result,
        method: transaction.method,
        brand: transaction.brand ?? null,
    };
}
