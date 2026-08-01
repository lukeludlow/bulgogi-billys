import { expect, test } from "vitest";
import { parseTransactionsCsv } from "./parseTransactionsCsv.ts";

// All fixtures below are synthetic — made-up ids, amounts, and dates in the same
// column layout a processor export uses.
const HEADER =
    "Transaction #,Date,Type,Amount,Result,Method,Brand,Last 4,Auth Code,Cardholder Name,Reference Number,Merchant Account,Taken By";

test("parses a basic row into a normalized transaction", () => {
    const csv = `${HEADER}\nTXN-0001,07/11/2026 10:19 AM,Sale,$17.00,Approved,Tapped,Visa,1111,AUTH01,,,ACCT,e@x.com`;
    const [txn] = parseTransactionsCsv(csv);
    expect(txn.id).toBe("TXN-0001");
    expect(txn.amount).toBe(17);
    expect(txn.type).toBe("Sale");
    expect(txn.result).toBe("Approved");
    expect(txn.method).toBe("Tapped");
    expect(txn.brand).toBe("Visa");
    // 10:19 AM local round-trips through the ISO string.
    const date = new Date(txn.date);
    expect(date.getHours()).toBe(10);
    expect(date.getMinutes()).toBe(19);
    expect(date.getFullYear()).toBe(2026);
});

test("strips a UTF-8 BOM on the header", () => {
    const csv = `\uFEFF${HEADER}\nTXN-0002,04/12/2026 9:06 AM,Sale,$4.00,Approved,Cash,,,,,,ACCT,e@x.com`;
    const rows = parseTransactionsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(4);
});

test("parses PM times and 12-hour edge cases", () => {
    const csv = `${HEADER}
TXN-0003,07/11/2026 12:00 PM,Sale,$1.00,Approved,Cash,,,,,,ACCT,e
TXN-0004,07/11/2026 12:30 AM,Sale,$1.00,Approved,Cash,,,,,,ACCT,e
TXN-0005,07/11/2026 1:05 PM,Sale,$1.00,Approved,Cash,,,,,,ACCT,e`;
    const [noon, midnight, afternoon] = parseTransactionsCsv(csv).map((t) =>
        new Date(t.date).getHours(),
    );
    expect(noon).toBe(12);
    expect(midnight).toBe(0);
    expect(afternoon).toBe(13);
});

test("handles a quoted field containing a comma", () => {
    const csv = `${HEADER}\nTXN-0006,07/11/2026 10:19 AM,Sale,"$1,234.50",Approved,Keyed,Visa,2222,AUTH,"DOE, JANE",,ACCT,e`;
    const [txn] = parseTransactionsCsv(csv);
    expect(txn.amount).toBe(1234.5);
    expect(txn.method).toBe("Keyed");
});

test("skips rows with an unparseable date or amount, or no id", () => {
    const csv = `${HEADER}
,07/11/2026 10:19 AM,Sale,$17.00,Approved,Tapped,Visa,1,,,,ACCT,e
TXN-0007,not-a-date,Sale,$5.00,Approved,Cash,,,,,,ACCT,e
TXN-0008,07/11/2026 10:19 AM,Sale,,Approved,Cash,,,,,,ACCT,e
TXN-0009,07/11/2026 10:19 AM,Sale,$5.00,Approved,Cash,,,,,,ACCT,e`;
    const rows = parseTransactionsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("TXN-0009");
});

test("omits brand when the column is empty (cash sales)", () => {
    const csv = `${HEADER}\nTXN-0010,07/11/2026 10:11 AM,Sale,$11.00,Approved,Cash,,,,,,ACCT,e`;
    const [txn] = parseTransactionsCsv(csv);
    expect(txn.brand).toBeUndefined();
    expect(txn.method).toBe("Cash");
});

test("keeps every row but distinguishes approved sales from the rest", () => {
    const csv = `${HEADER}
TXN-1001,07/11/2026 9:00 AM,Sale,$10.00,Approved,Cash,,,,,,ACCT,e
TXN-1002,07/11/2026 9:05 AM,Sale,$12.00,Declined,Tapped,Visa,3,,,,ACCT,e
TXN-1003,07/11/2026 9:10 AM,Sale,$8.00,Approved,Tapped,Visa,4,AUTH,,,ACCT,e
TXN-1004,07/11/2026 9:15 AM,Refund,$8.00,Approved,Tapped,Visa,4,AUTH,,,ACCT,e`;
    const rows = parseTransactionsCsv(csv);
    expect(rows).toHaveLength(4);
    const approvedSales = rows.filter(
        (r) => r.result === "Approved" && r.type === "Sale",
    );
    expect(approvedSales).toHaveLength(2);
});
