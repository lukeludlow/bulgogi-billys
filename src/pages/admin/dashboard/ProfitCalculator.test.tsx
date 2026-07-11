import { afterEach, expect, test } from "vitest";
import ProfitCalculator from "./ProfitCalculator.tsx";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

afterEach(() => {
    localStorage.removeItem("bb_admin_settings");
});

test("renders the calculator with a summary and controls", async () => {
    const { getByRole, getByText } = await renderWithProviders(
        <ProfitCalculator />,
        { route: "/admin" },
    );

    await expect
        .element(getByRole("heading", { name: "Profit Margin Calculator" }))
        .toBeInTheDocument();
    await expect.element(getByText("Average margin")).toBeInTheDocument();
    await expect
        .element(getByRole("button", { name: "Save to cloud" }))
        .toBeInTheDocument();
});

test("editing a sell price updates the computed margins", async () => {
    const { getByLabelText, getByText } = await renderWithProviders(
        <ProfitCalculator />,
        { route: "/admin" },
    );

    const priceInput = getByLabelText("Bulgogi Fries Small price");
    await expect.element(priceInput).toHaveValue(7);

    // A huge price makes this combination the highest-margin one, which the
    // "Best margin" summary card then names — proving the edit flowed through
    // the calculations into the displayed output.
    await priceInput.fill("999");

    await expect
        .element(getByText("Bulgogi Fries — Small"))
        .toBeInTheDocument();
});
