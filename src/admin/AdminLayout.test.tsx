import { afterEach, expect, test, vi } from "vitest";
import { Route } from "react-router";
import Events from "@/admin/pages/Events.tsx";
import ProfitCalculator from "@/admin/pages/ProfitCalculator.tsx";
import TransactionHistory from "@/admin/pages/TransactionHistory.tsx";
import { ADMIN_ROUTES } from "@/admin/routes.ts";
import { renderAdminPage } from "@/test/renderAdminPage.tsx";

// Resolve the providers' mount-loads instantly so the pages render without
// a database.
vi.mock("@/admin/data/settingsRepo.ts", async () => {
    const { DEFAULT_SETTINGS } =
        await import("@/test/fixtures/defaultSettings.ts");
    const { rowsToSettings, settingsToRows } =
        await import("@/admin/data/rows.ts");
    const defaults = () => rowsToSettings(settingsToRows(DEFAULT_SETTINGS));
    return {
        fetchSettings: async () => defaults(),
        applyConfig: async () => {},
    };
});

vi.mock("@/admin/data/recordsRepo.ts", async () => {
    const { DEFAULT_RECORDS } =
        await import("@/test/fixtures/defaultSettings.ts");
    return {
        fetchRecords: async () => structuredClone(DEFAULT_RECORDS),
        applyRecordsChangeSet: async () => {},
    };
});

vi.mock("@/admin/data/transactions.ts", () => ({
    fetchAllTransactions: async () => [],
    importTransactions: async () => {},
}));

afterEach(() => {
    localStorage.removeItem("bb_admin_config_pending");
});

/** The real /admin route tree from main.tsx, minus lazy-loading. */
function renderAdmin(route = "/admin") {
    return renderAdminPage(
        route,
        <>
            <Route index element={<ProfitCalculator />} />
            <Route path="transactions" element={<TransactionHistory />} />
            <Route path="events" element={<Events />} />
        </>,
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

    // Navigate away immediately (well inside the autosave debounce) and
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

// The chrome is built from the route manifest rather than repeated per page,
// so these assert the layout picks the right entry — a page whose sections
// didn't match its entry would silently lose its sidebar links.

test.each(ADMIN_ROUTES)(
    "$path wears the heading and intro from its manifest entry",
    async ({ path, heading, intro }) => {
        const { getByRole, getByText } = await renderAdmin(path);

        await expect
            .element(getByRole("heading", { level: 1, name: heading }))
            .toBeInTheDocument();
        await expect.element(getByText(intro)).toBeInTheDocument();
    },
);

test.each(ADMIN_ROUTES)(
    "$path gets a jump link for each of its sections",
    async ({ path, sections }) => {
        const { getByRole } = await renderAdmin(path);

        for (const section of sections) {
            await expect
                .element(getByRole("button", { name: section.label }).first())
                .toBeInTheDocument();
        }
    },
);

test("the sync bar rides above every page", async () => {
    const { getByRole } = await renderAdmin("/admin/events");

    await expect
        .element(getByRole("combobox", { name: "Protein" }))
        .toBeInTheDocument();
    await expect
        .element(getByRole("button", { name: "Log out" }))
        .toBeInTheDocument();
});
