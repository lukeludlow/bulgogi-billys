import { afterEach, expect, test, vi } from "vitest";
import ProfitCalculator from "@/admin/pages/ProfitCalculator.tsx";
import { SettingsProvider } from "@/admin/SettingsContext.tsx";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

// Resolve the provider's mount-load instantly with the defaults so the page
// renders without a database.
vi.mock("@/admin/data/settingsRepo.ts", async () => {
    const { DEFAULT_SETTINGS } =
        await import("@/test/fixtures/defaultSettings.ts");
    const { rowsToSettings, settingsToRows } =
        await import("@/admin/data/rows.ts");
    const defaults = () => rowsToSettings(settingsToRows(DEFAULT_SETTINGS));
    return {
        fetchSettings: async () => defaults(),
        applyChangeSet: async () => {},
    };
});

afterEach(() => {
    localStorage.removeItem("bb_admin_pending");
});

function renderCalculator() {
    return renderWithProviders(
        <SettingsProvider>
            <ProfitCalculator />
        </SettingsProvider>,
        { route: "/admin" },
    );
}

test("renders the calculator with a summary and controls", async () => {
    const { getByRole, getByText } = await renderCalculator();

    await expect
        .element(getByRole("heading", { name: "Profit Margin Calculator" }))
        .toBeInTheDocument();
    await expect.element(getByText("Average margin")).toBeInTheDocument();
});

test("editing a sell price updates the shared settings state", async () => {
    const { getByLabelText } = await renderCalculator();

    const priceInput = getByLabelText("Bulgogi Fries Small price");
    await expect.element(priceInput).toHaveValue(7);

    // The field is driven by the single `settings` object that every chart,
    // table, and summary card reads from, so a new value round-tripping back
    // into the input proves the edit reached that shared state.
    await priceInput.fill("999");
    await expect.element(priceInput).toHaveValue(999);
});

test("meat amounts are entered as pounds and ounces", async () => {
    const { getByLabelText } = await renderCalculator();

    // The default recipe uses 0.15 lb of protein → 0 lb 2.4 oz.
    const pounds = getByLabelText(
        "Bulgogi Fries Small Protein (beef) amount lb",
    );
    const ounces = getByLabelText(
        "Bulgogi Fries Small Protein (beef) amount oz",
    );
    await expect.element(pounds).toHaveValue(0);
    await expect.element(ounces).toHaveValue(2.4);

    // Editing the ounces half recomposes the stored decimal (8 oz = 0.5 lb)
    // and round-trips back into the inputs from shared state.
    await ounces.fill("8");
    await expect.element(ounces).toHaveValue(8);
    await expect.element(pounds).toHaveValue(0);
});

test("renders sidebar jump links for each section", async () => {
    const { getByRole } = await renderCalculator();

    await expect
        .element(getByRole("button", { name: "This Week" }))
        .toBeInTheDocument();
    await expect
        .element(getByRole("button", { name: "Ingredients" }))
        .toBeInTheDocument();
});

test("entering weekly units sold surfaces the weekly profit chart", async () => {
    const { getByLabelText, getByText } = await renderCalculator();

    // With nothing sold yet, the weekly chart is replaced by a prompt.
    await expect
        .element(getByText(/see this week's profit chart/))
        .toBeInTheDocument();

    const soldInput = getByLabelText("Bulgogi Fries — Small units sold");
    await expect.element(soldInput).toHaveValue(0);
    await soldInput.fill("2");

    // Selling something makes the weekly gross-profit chart render.
    await expect
        .element(getByText("Gross profit this week by item & size"))
        .toBeInTheDocument();
});

test("switching an ingredient to batch pricing reveals the batch editor", async () => {
    const { getByLabelText } = await renderCalculator();

    // Sriracha starts priced directly, so it has no batch yield field yet.
    const pricingSelect = getByLabelText("Sriracha pricing method");
    await pricingSelect.selectOptions("By batch");

    await expect
        .element(getByLabelText("Sriracha batch yield"))
        .toBeInTheDocument();
});
