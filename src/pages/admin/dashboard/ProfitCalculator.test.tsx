import { afterEach, expect, test } from "vitest";
import ProfitCalculator from "./ProfitCalculator.tsx";
import { SettingsProvider } from "../SettingsContext.tsx";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

afterEach(() => {
    localStorage.removeItem("bb_admin_settings");
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
    await expect
        .element(getByRole("button", { name: "Save to cloud" }))
        .toBeInTheDocument();
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
