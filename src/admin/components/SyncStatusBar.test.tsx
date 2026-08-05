import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Route } from "react-router";
import ProfitCalculator from "@/admin/pages/ProfitCalculator.tsx";
import { renderAdminPage } from "@/test/renderAdminPage.tsx";

// Never resolves: signing out ends with a hard `window.location.href` to clear
// in-memory state, which would navigate the test page away. Hanging here keeps
// the click observable without letting the redirect run. Hoisted because the
// vi.mock factory below is lifted above this file's other statements.
const { signOut } = vi.hoisted(() => ({
    signOut: vi.fn(() => new Promise(() => {})),
}));

vi.mock("@/admin/data/supabase.ts", () => ({
    supabase: { auth: { signOut } },
}));

vi.mock("@/admin/data/settingsRepo.ts", async () => {
    const { DEFAULT_SETTINGS } =
        await import("@/test/fixtures/defaultSettings.ts");
    const { rowsToSettings, settingsToRows } =
        await import("@/admin/data/rows.ts");
    return {
        fetchSettings: async () =>
            rowsToSettings(settingsToRows(DEFAULT_SETTINGS)),
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

beforeEach(() => {
    signOut.mockClear();
});

afterEach(() => {
    localStorage.removeItem("bb_admin_config_pending");
    localStorage.removeItem("bb_admin_records_pending");
});

function renderBar() {
    return renderAdminPage(
        "/admin",
        <Route index element={<ProfitCalculator />} />,
    );
}

test("settles on Saved once both engines have loaded", async () => {
    const { getByText } = await renderBar();

    await expect.element(getByText("Saved")).toBeInTheDocument();
});

test("an edit moves the bar off Saved and back", async () => {
    const { getByLabelText, getByText } = await renderBar();
    await expect.element(getByText("Saved")).toBeInTheDocument();

    await getByLabelText("Bulgogi Fries Small price").fill("13");

    // Dirty and saving both read "Saving…", so this covers the whole window
    // between the keystroke and the write landing.
    await expect.element(getByText("Saving…")).toBeInTheDocument();
    await expect.element(getByText("Saved")).toBeInTheDocument();
});

test("the protein selector writes the choice into the config", async () => {
    const { getByLabelText, getByRole } = await renderBar();

    // By role, not by label text: the select carries both an aria-label and a
    // htmlFor'd <label>, so getByLabelText("Protein") matches it twice.
    const protein = getByRole("combobox", { name: "Protein" });
    await expect.element(protein).toHaveValue("beef");

    await protein.selectOptions("Pork");
    await expect.element(protein).toHaveValue("pork");

    // Recipes priced through PROTEIN_INGREDIENT_ID follow the selection, which
    // is the whole point of the toggle living on the document.
    await expect
        .element(getByLabelText("Bulgogi Fries Small Protein (pork) amount lb"))
        .toBeInTheDocument();
});

test("logging out ends the Supabase session", async () => {
    const { getByRole } = await renderBar();

    await getByRole("button", { name: "Log out" }).click();

    expect(signOut).toHaveBeenCalledOnce();
});
