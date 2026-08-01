import { expect, test, vi } from "vitest";
import TransactionHistory from "./TransactionHistory.tsx";
import { SettingsProvider } from "../SettingsContext.tsx";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

// Resolve the provider's mount-load instantly with the defaults so the page
// renders without a database.
vi.mock("./persistence/settingsRepo.ts", async () => {
    const { DEFAULT_SETTINGS } = await import("./defaults.ts");
    const { rowsToSettings, settingsToRows } =
        await import("./persistence/rows.ts");
    const defaults = () => rowsToSettings(settingsToRows(DEFAULT_SETTINGS));
    return {
        fetchSettings: async () => defaults(),
        applyChangeSet: async () => {},
    };
});

function renderHistory() {
    return renderWithProviders(
        <SettingsProvider>
            <TransactionHistory />
        </SettingsProvider>,
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
