import { expect, test } from "vitest";
import AdminDashboard from "./AdminDashboard.tsx";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

test("renders a dark mode toggle", async () => {
    const { getByRole } = await renderWithProviders(<AdminDashboard />);

    await expect.element(getByRole("switch")).toBeInTheDocument();
});
