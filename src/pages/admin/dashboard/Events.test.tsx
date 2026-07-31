import { afterEach, expect, test, vi } from "vitest";
import Events from "./Events.tsx";
import { SettingsProvider } from "../SettingsContext.tsx";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

// Resolve the provider's mount-load instantly with fixture data: one Saturday
// sale with no expense record yet, and one Sunday sale whose event already
// has expenses. Simple rates keep the contribution math exact — a $10 sale
// matches no menu price, so blended 50% makes its food cost $5.
vi.mock("./persistence/settingsRepo.ts", async () => {
    const { DEFAULT_SETTINGS } = await import("./defaults.ts");
    const { rowsToSettings, settingsToRows } = await import(
        "./persistence/rows.ts"
    );
    const sale = (id: string, year: number, month: number, day: number) => ({
        id,
        date: new Date(year, month, day, 12).toISOString(),
        amount: 10,
        type: "Sale",
        result: "Approved",
        method: "Tapped",
    });
    const fixture = () =>
        rowsToSettings(
            settingsToRows({
                ...DEFAULT_SETTINGS,
                blendedFoodCostPercent: 50,
                salesTaxRatePercent: 0,
                employeeHourlyRate: 10,
                transactions: [
                    // 2026-07-25 is a Saturday → Grogan's Mill.
                    sale("1", 2026, 6, 25),
                    // 2026-07-19 is the 3rd Sunday → New Caney.
                    sale("2", 2026, 6, 19),
                ],
                events: [
                    {
                        date: "2026-07-19",
                        market: "new-caney",
                        marketFee: 20,
                        fuel: 0,
                        propane: 0,
                        waste: 0,
                        employeeHours: 0,
                        billysHours: 0,
                    },
                ],
            }),
        );
    return {
        fetchSettings: async () => fixture(),
        applyChangeSet: async () => {},
    };
});

afterEach(() => {
    localStorage.removeItem("bb_admin_pending");
});

function renderEvents() {
    return renderWithProviders(
        <SettingsProvider>
            <Events />
        </SettingsProvider>,
        { route: "/admin/events" },
    );
}

test("renders the page with rollup, events, and assumptions sections", async () => {
    const { getByRole, getByLabelText } = await renderEvents();

    await expect
        .element(getByRole("heading", { level: 1, name: "Events" }))
        .toBeInTheDocument();
    await expect
        .element(getByRole("heading", { name: "Markets" }))
        .toBeInTheDocument();
    await expect
        .element(getByRole("heading", { name: "Assumptions" }))
        .toBeInTheDocument();
    await expect
        .element(getByLabelText("Employee hourly rate"))
        .toBeInTheDocument();
    await expect
        .element(getByLabelText("Sales tax rate percent"))
        .toBeInTheDocument();
});

test("a sales-derived event without expenses offers Add expenses", async () => {
    const { getByRole, getByLabelText } = await renderEvents();

    // The Saturday event came from sales alone, so its expense cells are
    // collapsed into a single button.
    const addButton = getByRole("button", { name: "Add expenses" });
    await expect.element(addButton).toBeInTheDocument();

    await addButton.click();

    await expect
        .element(
            getByLabelText("Market fee for 2026-07-25 Grogan's Mill"),
        )
        .toBeInTheDocument();
});

test("editing an expense updates the event's contribution", async () => {
    const { getByText, getByLabelText } = await renderEvents();

    // Sunday: $10 gross − $5 food cost − $20 market fee = −$15. The figure
    // shows in the event row and the market rollup, so match the first.
    await expect.element(getByText("-$15.00").first()).toBeInTheDocument();

    const feeInput = getByLabelText("Market fee for 2026-07-19 New Caney");
    await expect.element(feeInput).toHaveValue(20);
    await feeInput.fill("2");

    // $10 − $5 − $2 = $3.
    await expect.element(getByText("$3.00").first()).toBeInTheDocument();
});

test("choosing a classification shows its badge", async () => {
    const { getByText, getByLabelText } = await renderEvents();

    const select = getByLabelText("Classification for Grogan's Mill");

    // Before choosing, "Probation" exists only as an <option> in each of the
    // three market Selects; choosing it adds the badge as a fourth match.
    expect(getByText("Probation").all()).toHaveLength(3);

    await select.selectOptions("Probation");
    await expect.element(select).toHaveValue("probation");
    expect(getByText("Probation").all()).toHaveLength(4);
});
