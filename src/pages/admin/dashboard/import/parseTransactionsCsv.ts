import type { Transaction } from "@/pages/admin/dashboard/types.ts";

/**
 * Parse a processor "transactions" CSV export into `Transaction[]`.
 *
 * The export looks like:
 *   Transaction #,Date,Type,Amount,Result,Method,Brand,Last 4,Auth Code,…
 *   10462545-8966,07/11/2026 10:19 AM,Sale,$17.00,Approved,Tapped,Visa,1838,…
 *
 * Columns are matched by header name (case-insensitive) rather than position, so
 * an extra/reordered column doesn't break the mapping. Rows whose date or amount
 * can't be parsed, or that have no transaction id, are skipped. Every result
 * (Approved/Declined/Errored) is kept — the analytics layer decides what counts.
 */
export function parseTransactionsCsv(text: string): Transaction[] {
    const rows = parseCsv(stripBom(text));
    if (rows.length === 0) return [];

    const header = rows[0].map((cell) => cell.trim().toLowerCase());
    const col = (name: string) => header.indexOf(name);
    const idIdx = col("transaction #");
    const dateIdx = col("date");
    const typeIdx = col("type");
    const amountIdx = col("amount");
    const resultIdx = col("result");
    const methodIdx = col("method");
    const brandIdx = col("brand");

    const at = (row: string[], idx: number) =>
        idx >= 0 && idx < row.length ? row[idx].trim() : "";

    const transactions: Transaction[] = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 0 || (row.length === 1 && row[0].trim() === "")) {
            continue; // blank trailing line
        }
        const id = at(row, idIdx);
        const date = parseDate(at(row, dateIdx));
        const amount = parseAmount(at(row, amountIdx));
        if (!id || date === null || amount === null) continue;

        const brand = at(row, brandIdx);
        transactions.push({
            id,
            date,
            amount,
            type: at(row, typeIdx),
            result: at(row, resultIdx),
            method: at(row, methodIdx),
            ...(brand ? { brand } : {}),
        });
    }
    return transactions;
}

function stripBom(text: string): string {
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Turn "$1,234.50" or "-$4.00" into a number; null if it isn't a number. */
function parseAmount(raw: string): number | null {
    const cleaned = raw.replace(/[$,\s]/g, "");
    if (cleaned === "") return null;
    const value = Number(cleaned);
    return Number.isFinite(value) ? value : null;
}

/**
 * Parse "MM/DD/YYYY h:mm AM/PM" (single- or double-digit hour) into an ISO
 * string, built in local wall-clock time so day/week/month bucketing lines up
 * with the restaurant's day. Returns null if the shape doesn't match.
 */
function parseDate(raw: string): string | null {
    const match = raw.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/,
    );
    if (!match) return null;
    const [, mm, dd, yyyy, hh, min, ampm] = match;
    let hour = Number(hh) % 12;
    if (ampm.toLowerCase() === "pm") hour += 12;
    const date = new Date(
        Number(yyyy),
        Number(mm) - 1,
        Number(dd),
        hour,
        Number(min),
    );
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
}

/**
 * Minimal RFC-4180-ish CSV reader: handles quoted fields, escaped quotes (""),
 * and both \n and \r\n line endings. Good enough for processor exports, which
 * are machine-generated.
 */
function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
            continue;
        }
        if (char === '"') {
            inQuotes = true;
        } else if (char === ",") {
            row.push(field);
            field = "";
        } else if (char === "\n") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else if (char === "\r") {
            // handled by the \n branch; ignore a lone \r
        } else {
            field += char;
        }
    }
    // Flush the last field/row if the file didn't end with a newline.
    if (field !== "" || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}
