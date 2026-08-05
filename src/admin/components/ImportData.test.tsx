import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { Route, Routes } from "react-router";
import AdminLayout from "@/admin/AdminLayout.tsx";
import TransactionHistory from "@/admin/pages/TransactionHistory.tsx";
import { parseTransactionsCsv } from "@/admin/import/parseTransactionsCsv.ts";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";
import { DEFAULT_SETTINGS } from "@/test/fixtures/defaultSettings.ts";
import { seedSettingsTables, stub } from "@/test/postgrestStub.ts";

// Stub the supabase client itself (not a repo module) so these tests pin the
// end-to-end import contract — what actually reaches the `transactions`
// table — independently of which code path carries it there.
vi.mock("@/admin/data/supabase.ts", async () => {
    const { stub } = await import("@/test/postgrestStub.ts");
    return { supabase: { from: stub.from } };
});

// Synthetic processor export in the same column layout the parser tests use.
const HEADER =
    "Transaction #,Date,Type,Amount,Result,Method,Brand,Last 4,Auth Code,Cardholder Name,Reference Number,Merchant Account,Taken By";

const CSV_ONE_NEW = `${HEADER}
TXN-0001,07/10/2026 10:19 AM,Sale,$17.00,Approved,Tapped,Visa,1111,AUTH01,,,ACCT,e@x.com
TXN-0002,07/11/2026 12:30 PM,Sale,$8.00,Approved,Tapped,Visa,2222,AUTH02,,,ACCT,e@x.com`;

const CSV_ALL_DUPLICATES = `${HEADER}
TXN-0001,07/10/2026 10:19 AM,Sale,$17.00,Approved,Tapped,Visa,1111,AUTH01,,,ACCT,e@x.com`;

// The row already in the database that CSV row TXN-0001 duplicates.
const EXISTING_ROW = {
    id: "TXN-0001",
    date: new Date(2026, 6, 10, 10, 19).toISOString(),
    amount: 17,
    type: "Sale",
    result: "Approved",
    method: "Tapped",
    brand: "Visa",
};

beforeEach(() => {
    stub.reset();
    seedSettingsTables(DEFAULT_SETTINGS);
    stub.data.set("transactions", [EXISTING_ROW]);
});

afterEach(() => {
    localStorage.removeItem("bb_admin_pending");
});

function renderHistory() {
    return renderWithProviders(
        <Routes>
            <Route path="/admin" element={<AdminLayout />}>
                <Route path="transactions" element={<TransactionHistory />} />
            </Route>
        </Routes>,
        { route: "/admin/transactions" },
    );
}

function csvFile(csv: string) {
    return new File([csv], "transactions.csv", { type: "text/csv" });
}

function transactionUpserts() {
    return stub.calls.filter(
        (call) => call.table === "transactions" && call.method === "upsert",
    );
}

test("CSV upload previews the batch, and confirming imports only the new sales", async () => {
    const { getByLabelText, getByRole, getByText } = await renderHistory();

    await expect.element(getByText("1 transaction")).toBeInTheDocument();
    await getByLabelText("Transactions CSV file").upload(csvFile(CSV_ONE_NEW));

    // Preview: dedupe counts against what's already imported, plus the
    // batch's date range.
    await expect
        .element(getByText("1 new sales, 1 already imported"))
        .toBeInTheDocument();
    await expect
        .element(getByText("Jul 10, 2026 – Jul 11, 2026"))
        .toBeInTheDocument();

    await getByRole("button", { name: "Import 1 sales" }).click();
    await expect
        .element(getByText("Imported 1 new sales. Saved automatically."))
        .toBeInTheDocument();

    // Only the genuinely new row reaches the database, insert-only so
    // existing rows always win.
    await vi.waitFor(
        () => {
            expect(transactionUpserts()).toHaveLength(1);
        },
        { timeout: 5000 },
    );
    const [upsert] = transactionUpserts();
    const parsed = parseTransactionsCsv(CSV_ONE_NEW);
    const newTxn = parsed.find((txn) => txn.id === "TXN-0002")!;
    expect(upsert.args[0]).toEqual([
        {
            id: "TXN-0002",
            date: new Date(newTxn.date).toISOString(),
            amount: 8,
            type: "Sale",
            result: "Approved",
            method: "Tapped",
            brand: "Visa",
        },
    ]);
    expect(upsert.args[1]).toEqual({
        onConflict: "id",
        ignoreDuplicates: true,
    });

    // The imported sale shows up in the transactions table immediately.
    await expect.element(getByText("2 transactions")).toBeInTheDocument();
});

test("an all-duplicates batch confirms without touching the database", async () => {
    const { getByLabelText, getByRole, getByText } = await renderHistory();

    await getByLabelText("Transactions CSV file").upload(
        csvFile(CSV_ALL_DUPLICATES),
    );
    await expect
        .element(getByText("0 new sales, 1 already imported"))
        .toBeInTheDocument();

    await getByRole("button", { name: "Import 0 sales" }).click();
    await expect
        .element(getByText("Imported 0 new sales. Saved automatically."))
        .toBeInTheDocument();

    // Wait out the autosave debounce before asserting nothing was written.
    await new Promise((resolve) => setTimeout(resolve, 1600));
    expect(transactionUpserts()).toHaveLength(0);
    await expect.element(getByText("1 transaction")).toBeInTheDocument();
});

test("a CSV with no usable rows shows an error instead of a preview", async () => {
    const { getByLabelText, getByText } = await renderHistory();

    await getByLabelText("Transactions CSV file").upload(csvFile(HEADER));
    await expect
        .element(getByText("No transactions found in that file."))
        .toBeInTheDocument();
});
