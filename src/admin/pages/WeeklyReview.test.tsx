import { afterEach, expect, test, vi } from "vitest";
import { Route } from "react-router";
import WeeklyReview from "@/admin/pages/WeeklyReview.tsx";
import { renderAdminPage } from "@/test/renderAdminPage.tsx";

// Resolve the providers' mount-loads instantly with fixture data. Simple
// rates keep the math exact: 0% tax, blended 50%, so a $10 sale that matches
// no menu price costs $5. The default review week is the most recent complete
// one — the week of Jul 20–26, holding only the $10 Saturday sale:
// pre-tax $10, contribution $5, transfers $0.30 (3%) and $0.20 (2%).
vi.mock("@/admin/data/settingsRepo.ts", async () => {
    const { DEFAULT_SETTINGS } =
        await import("@/test/fixtures/defaultSettings.ts");
    const { rowsToSettings, settingsToRows } =
        await import("@/admin/data/rows.ts");
    const fixture = () =>
        rowsToSettings(
            settingsToRows({
                ...DEFAULT_SETTINGS,
                blendedFoodCostPercent: 50,
                salesTaxRatePercent: 0,
                emergencyReservePercent: 3,
                expansionFundPercent: 2,
            }),
        );
    return {
        fetchSettings: async () => fixture(),
        applyConfig: async () => {},
    };
});

vi.mock("@/admin/data/recordsRepo.ts", async () => {
    const { DEFAULT_RECORDS } =
        await import("@/test/fixtures/defaultSettings.ts");
    const { recordsToRows, rowsToRecords } =
        await import("@/admin/data/recordsRows.ts");
    const fixture = () => rowsToRecords(recordsToRows(DEFAULT_RECORDS));
    return {
        fetchRecords: async () => fixture(),
        applyRecordsChangeSet: async () => {},
    };
});

vi.mock("@/admin/data/transactions.ts", () => {
    const sale = (
        id: string,
        year: number,
        month: number,
        day: number,
        amount: number,
    ) => ({
        id,
        date: new Date(year, month, day, 12).toISOString(),
        amount,
        type: "Sale",
        result: "Approved",
        method: "Tapped",
    });
    return {
        fetchAllTransactions: async () => [
            // 2026-07-25 is a Saturday: the week of Jul 20–26.
            sale("1", 2026, 6, 25, 10),
            // 2026-07-19 is a Sunday: the week BEFORE, Jul 13–19.
            sale("2", 2026, 6, 19, 20),
        ],
        importTransactions: async () => {},
    };
});

afterEach(() => {
    localStorage.removeItem("bb_admin_config_pending");
    localStorage.removeItem("bb_admin_records_pending");
});

function renderWeekly() {
    return renderAdminPage(
        "/admin/weekly",
        <Route path="weekly" element={<WeeklyReview />} />,
    );
}

test("renders the review sections with the manifest chrome", async () => {
    const { getByRole } = await renderWeekly();

    await expect
        .element(getByRole("heading", { level: 1, name: "Weekly Review" }))
        .toBeInTheDocument();
    await expect
        .element(getByRole("heading", { name: "Set aside & transfer" }))
        .toBeInTheDocument();
    await expect
        .element(getByRole("heading", { name: "Reserves" }))
        .toBeInTheDocument();
});

test("defaults to the last complete week and totals it", async () => {
    const { getByText, getByLabelText } = await renderWeekly();

    await expect
        .element(getByLabelText("Week to review"))
        .toHaveValue("2026-07-20");
    // Pre-tax sales $10 (stat) and its gross sub-line.
    await expect.element(getByText("$10.00").first()).toBeInTheDocument();
    // Contribution: $10 − $5 blended food cost.
    await expect.element(getByText("$5.00").first()).toBeInTheDocument();
    // The week's one event, tagged to its market.
    await expect.element(getByText("Grogan's Mill")).toBeInTheDocument();
});

test("switching weeks re-slices the report", async () => {
    const { getByText, getByLabelText } = await renderWeekly();

    await getByLabelText("Week to review").selectOptions(
        "Week of Jul 13 – Jul 19, 2026",
    );

    // That week holds the $20 Sunday sale: pre-tax $20, contribution $10.
    await expect.element(getByText("$20.00").first()).toBeInTheDocument();
    await expect.element(getByText("New Caney")).toBeInTheDocument();
});

test("shows the prescribed transfers and records them into the ledger", async () => {
    const { getByRole, getByText, getByLabelText } = await renderWeekly();

    // 3% and 2% of the $10 pre-tax week.
    await expect.element(getByText("$0.30")).toBeInTheDocument();
    await expect.element(getByText("$0.20")).toBeInTheDocument();

    const record = getByRole("button", { name: "Record both transfers" });
    await record.click();

    // Both deposits landed in the ledger table below…
    expect(getByLabelText("Transfer amount").all()).toHaveLength(2);
    // …the instructions show them recorded…
    expect(getByText(/recorded ✓/).all()).toHaveLength(2);
    // …and the button can't double-record.
    await expect
        .element(getByRole("button", { name: "Transfers recorded" }))
        .toBeDisabled();
});

test("a manual ledger row moves the balance", async () => {
    const { getByRole, getByText, getByLabelText } = await renderWeekly();

    await getByRole("button", { name: "Add transfer" }).click();
    await getByLabelText("Transfer amount").fill("500");

    // The emergency-reserve balance card reads $500, and the $500 starter
    // target is now met (its row shows "$500.00 / $500.00").
    await expect.element(getByText("$500.00").first()).toBeInTheDocument();
    await expect.element(getByText(/Starter reserve ✓/)).toBeInTheDocument();
});

test("editing a reserve rate reprices the week's transfer", async () => {
    const { getByText, getByLabelText } = await renderWeekly();

    await getByLabelText("Emergency reserve percent").fill("10");

    // 10% of the $10 pre-tax week.
    await expect.element(getByText("$1.00")).toBeInTheDocument();
});
