import { afterEach, expect, test } from "vitest";
import TransactionHistory from "./TransactionHistory.tsx";
import { SettingsProvider } from "../SettingsContext.tsx";
import { DEFAULT_SETTINGS } from "./defaults.ts";
import type { Settings } from "./types.ts";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

afterEach(() => {
    localStorage.removeItem("bb_admin_settings");
});

/** Seed localStorage so the provider loads these settings on mount. */
function seedSettings(settings: Settings) {
    localStorage.setItem("bb_admin_settings", JSON.stringify(settings));
}

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
        .element(getByRole("heading", { name: "Sold by item & size" }))
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

test("an itemized sale drives the item-sales breakdown chart", async () => {
    // A recent, approved, itemized sale: 2× Bulgogi Fries — Large.
    seedSettings({
        ...DEFAULT_SETTINGS,
        transactions: [
            {
                id: "SEED-1",
                date: new Date().toISOString(),
                amount: 24,
                type: "Sale",
                result: "Approved",
                method: "Cash",
                lineItems: [
                    { itemId: "fries", variantId: "large", quantity: 2 },
                ],
            },
        ],
    });

    const { getByText } = await renderHistory();

    // The derived breakdown renders its profit chart (units > 0), no manual
    // input anywhere.
    await expect
        .element(
            getByText("Gross profit by item & size in the selected range"),
        )
        .toBeInTheDocument();
});
