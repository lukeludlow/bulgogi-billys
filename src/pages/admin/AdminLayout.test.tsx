import { afterEach, expect, test } from "vitest";
import { Route, Routes } from "react-router";
import AdminLayout from "./AdminLayout.tsx";
import ProfitCalculator from "./dashboard/ProfitCalculator.tsx";
import TransactionHistory from "./dashboard/TransactionHistory.tsx";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

afterEach(() => {
    localStorage.removeItem("bb_admin_settings");
});

/** The real /admin route tree from main.tsx, minus lazy-loading. */
function renderAdmin(route = "/admin") {
    return renderWithProviders(
        <Routes>
            <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<ProfitCalculator />} />
                <Route path="transactions" element={<TransactionHistory />} />
            </Route>
        </Routes>,
        { route },
    );
}

test("shows the top nav with links to both pages", async () => {
    const { getByRole } = await renderAdmin();

    // The top nav renders twice (mobile header + desktop bar) — assert on the
    // first instance of each link.
    await expect
        .element(getByRole("link", { name: "Profit Calculator" }).first())
        .toBeInTheDocument();
    await expect
        .element(getByRole("link", { name: "Transaction History" }).first())
        .toBeInTheDocument();
});

test("renders a dark mode toggle", async () => {
    const { getByRole } = await renderAdmin();

    await expect.element(getByRole("switch")).toBeInTheDocument();
});

test("top nav navigates between the two pages", async () => {
    const { getByRole } = await renderAdmin();

    await expect
        .element(getByRole("heading", { name: "Profit Margin Calculator" }))
        .toBeInTheDocument();

    await getByRole("link", { name: "Transaction History" }).first().click();
    await expect
        .element(getByRole("heading", { name: "Transaction History" }))
        .toBeInTheDocument();

    await getByRole("link", { name: "Profit Calculator" }).first().click();
    await expect
        .element(getByRole("heading", { name: "Profit Margin Calculator" }))
        .toBeInTheDocument();
});

test("an in-progress edit survives switching pages", async () => {
    const { getByRole, getByLabelText } = await renderAdmin();

    const priceInput = getByLabelText("Bulgogi Fries Small price");
    await expect.element(priceInput).toHaveValue(7);
    await priceInput.fill("999");

    // Navigate away immediately (well inside the 300ms save debounce) and
    // back: the settings live in the layout, so the edit must still be there.
    await getByRole("link", { name: "Transaction History" }).first().click();
    await expect
        .element(getByRole("heading", { name: "Transaction History" }))
        .toBeInTheDocument();

    await getByRole("link", { name: "Profit Calculator" }).first().click();
    await expect
        .element(getByLabelText("Bulgogi Fries Small price"))
        .toHaveValue(999);
});
