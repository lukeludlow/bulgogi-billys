import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { Route, Routes } from "react-router";
import AdminLayout from "@/admin/AdminLayout.tsx";
import TransactionHistory from "@/admin/pages/TransactionHistory.tsx";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";
import { DEFAULT_SETTINGS } from "@/test/fixtures/defaultSettings.ts";
import { seedSettingsTables, stub } from "@/test/postgrestStub.ts";

// Stub the supabase client itself so the page loads through the real data
// layer; the characterization below stays valid regardless of which module
// fetches the transactions.
vi.mock("@/admin/data/supabase.ts", async () => {
    const { stub } = await import("@/test/postgrestStub.ts");
    return { supabase: { from: stub.from } };
});

// Fixed-date history: the range window anchors on the latest transaction
// (not the wall clock), so these stay deterministic. Within 90 days of the
// newest: three approved sales and one refund; one older approved sale
// falls outside the default window.
const TRANSACTION_ROWS = [
    row("TXN-01", "2026-07-11T17:00:00.000Z", 10, "Sale"),
    row("TXN-04", "2026-07-01T17:00:00.000Z", 8, "Refund"),
    row("TXN-02", "2026-06-20T17:00:00.000Z", 12, "Sale"),
    row("TXN-03", "2026-05-01T17:00:00.000Z", 8, "Sale"),
    row("TXN-05", "2025-12-20T17:00:00.000Z", 20, "Sale"),
];

function row(id: string, date: string, amount: number, type: string) {
    return {
        id,
        date,
        amount,
        type,
        result: "Approved",
        method: "Tapped",
        brand: "Visa",
    };
}

beforeEach(() => {
    stub.reset();
    seedSettingsTables(DEFAULT_SETTINGS);
});

afterEach(() => {
    localStorage.removeItem("bb_admin_config_pending");
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

test("renders the page with a single range selector driving all sections", async () => {
    const { getByRole, getByLabelText } = await renderHistory();

    await expect
        .element(getByRole("heading", { name: "Transaction History" }))
        .toBeInTheDocument();

    // Exactly one shared range selector for the whole page.
    const windowSelects = getByLabelText("Time range").all();
    expect(windowSelects).toHaveLength(1);

    // Every analytics section is present.
    await expect
        .element(getByRole("heading", { name: "Sales over time" }))
        .toBeInTheDocument();
    await expect
        .element(getByRole("heading", { name: "Price points" }))
        .toBeInTheDocument();
    await expect
        .element(getByRole("heading", { name: "Transactions" }))
        .toBeInTheDocument();
    await expect
        .element(getByRole("heading", { name: "Import data" }))
        .toBeInTheDocument();

    // The blended food-cost assumption lives on this page now.
    await expect
        .element(getByLabelText("Blended food cost percent"))
        .toBeInTheDocument();
});

test("the range window filters both the stat cards and the table", async () => {
    stub.data.set("transactions", TRANSACTION_ROWS);
    const { getByLabelText, getByText } = await renderHistory();

    // The Orders stat card, scoped to its section ("Orders" also appears in
    // the price-point table and copy elsewhere on the page).
    const ordersCard = () => {
        const section = document.querySelector("#sales-over-time")!;
        const label = Array.from(section.querySelectorAll("div")).find(
            (div) => div.textContent === "Orders",
        )!;
        return label.parentElement!.textContent;
    };

    // Default 90-day window, measured back from the newest transaction:
    // the December sale is out; the refund shows in the table but never
    // counts as an order.
    await expect.element(getByText("4 transactions")).toBeInTheDocument();
    expect(ordersCard()).toBe("Orders3approved sales");

    await getByLabelText("Time range").selectOptions("All time");
    await expect.element(getByText("5 transactions")).toBeInTheDocument();
    expect(ordersCard()).toBe("Orders4approved sales");
});
