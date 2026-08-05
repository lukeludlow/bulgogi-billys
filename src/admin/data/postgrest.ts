// Shared helpers for talking to PostgREST through the supabase client,
// used by every per-domain repo module.

import { supabase } from "@/admin/data/supabase.ts";
import type { Database } from "./database.types.ts";

// PostgREST caps each response at 1000 rows (db.max-rows), so large tables
// must be fetched in pages. The tiebreaker column keeps the sort order total
// when the sort column alone isn't unique; rows sharing a sort value could
// otherwise shift between pages and be skipped or duplicated. Omit it only
// when the sort column is a single-column primary key.
const PAGE_SIZE = 1000;

export async function fetchAllRows<T>(
    table: keyof Database["public"]["Tables"],
    sortColumn: string,
    tiebreaker?: string,
): Promise<T[]> {
    const rows: T[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        let query = supabase
            .from(table)
            .select("*")
            .order(sortColumn, { ascending: false });
        if (tiebreaker) query = query.order(tiebreaker, { ascending: true });
        const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
        if (error) throw new Error(error.message);
        rows.push(...((data ?? []) as T[]));
        if (!data || data.length < PAGE_SIZE) return rows;
    }
}

export function unwrap<T>({
    data,
    error,
}: {
    data: T | null;
    error: { message: string } | null;
}): T {
    if (error) throw new Error(error.message);
    return data as T;
}
