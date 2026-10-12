/**
 * Minimal RFC-4180-ish CSV reader: strips a leading byte-order mark, handles
 * quoted fields, escaped quotes (""), and both \n and \r\n line endings. Good
 * enough for machine-generated exports (processor transactions, Vercel and
 * Search Console reports).
 */
export function parseCsv(text: string): string[][] {
    const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < source.length; i++) {
        const char = source[i];
        if (inQuotes) {
            if (char === '"') {
                if (source[i + 1] === '"') {
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
