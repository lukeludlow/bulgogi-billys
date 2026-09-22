import { expect, test } from "vitest";
import { page } from "vitest/browser";
import App from "@/site/App.tsx";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

test("every page gets the site footer", async () => {
    const { getByRole } = await renderWithProviders(<App />);

    await expect.element(getByRole("contentinfo")).toBeInTheDocument();
    await expect
        .element(getByRole("main"))
        .not.toContainElement(getByRole("contentinfo").element());
});

test("the mobile menu lists Catering, pointing at the catering page", async () => {
    const { getByRole } = await renderWithProviders(<App />);

    await getByRole("button", { name: "Open navigation" }).click();
    // The sidebar renders in a portal outside the render container.
    await expect
        .element(
            page
                .getByRole("dialog")
                .getByRole("link", { name: "Catering", exact: true }),
        )
        .toHaveAttribute("href", "/catering");
});
