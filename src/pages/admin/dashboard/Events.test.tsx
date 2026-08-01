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
    const { rowsToSettings, settingsToRows } =
        await import("./persistence/rows.ts");
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
        .element(getByLabelText("Market fee for 2026-07-25 Grogan's Mill"))
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

test("employee hours entered as hours + minutes update labor cost", async () => {
    const { getByText, getByLabelText } = await renderEvents();

    // Sunday starts at $10 − $5 − $20 fee = −$15.
    await expect.element(getByText("-$15.00").first()).toBeInTheDocument();

    // 30 minutes at the global $10/hr adds $5 of labor → −$20.
    const minutes = getByLabelText(
        "Employee hours for 2026-07-19 New Caney min",
    );
    await minutes.fill("30");
    await expect.element(getByText("-$20.00").first()).toBeInTheDocument();

    // Bumping to 1 hr 30 min makes labor $15 → −$30.
    const hours = getByLabelText("Employee hours for 2026-07-19 New Caney hr");
    await hours.fill("1");
    await expect.element(getByText("-$30.00").first()).toBeInTheDocument();
});

test("a per-market hourly rate overrides the global rate for that market", async () => {
    const { getByText, getByLabelText } = await renderEvents();

    const hours = getByLabelText("Employee hours for 2026-07-19 New Caney hr");
    await hours.fill("1");
    // 1 hr × global $10 → $10 labor; −$15 − $10 = −$25.
    await expect.element(getByText("-$25.00").first()).toBeInTheDocument();

    await getByLabelText("Hourly rate for New Caney").fill("20");
    // 1 hr × market $20 → −$35.
    await expect.element(getByText("-$35.00").first()).toBeInTheDocument();
});

test("overriding a day's market moves its expense row along", async () => {
    const { getByLabelText } = await renderEvents();

    // The Sunday event's expense row is keyed (2026-07-19, new-caney).
    await expect
        .element(getByLabelText("Market fee for 2026-07-19 New Caney"))
        .toBeInTheDocument();

    const select = getByLabelText("Market for 2026-07-19");
    await select.selectOptions("Grogan's Mill");

    // Sales and the expense row now live under Grogan's Mill.
    await expect.element(select).toHaveValue("grogans-mill");
    await expect
        .element(getByLabelText("Market fee for 2026-07-19 Grogan's Mill"))
        .toBeInTheDocument();
});

test("purchases can be added and removed", async () => {
    const { getByRole, getByLabelText } = await renderEvents();

    await getByRole("button", { name: "Add purchase" }).click();
    await expect.element(getByLabelText("Purchase amount")).toBeInTheDocument();
    await getByLabelText("Purchase amount").fill("35");

    await getByRole("button", { name: "Remove", exact: true }).first().click();
    await expect
        .element(getByLabelText("Purchase amount"))
        .not.toBeInTheDocument();
});

test("a monthly processor fee can be added", async () => {
    const { getByRole, getByLabelText } = await renderEvents();

    const month = getByLabelText("Fee month");
    await month.fill("2026-07");
    await getByRole("button", { name: "Add month" }).click();

    await expect
        .element(getByLabelText("Processor fees for 2026-07"))
        .toBeInTheDocument();
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
