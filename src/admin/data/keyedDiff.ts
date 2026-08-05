/** Keyed upserts/deletes for a table whose primary key is one column. */
export interface KeyedChange<Row> {
    /** New or modified rows only. */
    upserts: Row[];
    /** Key values present before but absent now. */
    deletes: string[];
}

/** Per-row diff over a single-column key. */
export function keyedChange<Row>(
    prevRows: Row[],
    nextRows: Row[],
    keyOf: (row: Row) => string,
): KeyedChange<Row> | undefined {
    const prev = new Map(
        prevRows.map((row) => [keyOf(row), JSON.stringify(row)]),
    );
    const nextKeys = new Set(nextRows.map(keyOf));
    const upserts = nextRows.filter(
        (row) => prev.get(keyOf(row)) !== JSON.stringify(row),
    );
    const deletes = [...prev.keys()].filter((key) => !nextKeys.has(key));
    if (upserts.length === 0 && deletes.length === 0) return undefined;
    return { upserts, deletes };
}
