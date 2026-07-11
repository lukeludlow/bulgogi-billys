import { expect, test } from "vitest";
import EnterPassword from "./EnterPassword.tsx";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

test("shows an error and does not set the auth cookie when the password is wrong", async () => {
    const { getByPlaceholder, getByRole, getByText } =
        await renderWithProviders(<EnterPassword />);

    await getByPlaceholder("Password").fill("definitely-wrong");
    await getByRole("button", { name: "Head Inside" }).click();

    await expect
        .element(getByText("⚠️ Incorrect password. Try again."))
        .toBeInTheDocument();
    expect(document.cookie).not.toContain("site_auth_token");
});

test("clears the error message as soon as the user starts typing again", async () => {
    const { getByPlaceholder, getByRole, getByText } =
        await renderWithProviders(<EnterPassword />);

    await getByPlaceholder("Password").fill("definitely-wrong");
    await getByRole("button", { name: "Head Inside" }).click();
    await expect
        .element(getByText("⚠️ Incorrect password. Try again."))
        .toBeInTheDocument();

    await getByPlaceholder("Password").fill("definitely-wrong-2");

    await expect
        .element(getByText("⚠️ Incorrect password. Try again."))
        .not.toBeInTheDocument();
});

// Note: the correct-password path also does `window.location.href = "/"` to
// force a real navigation so the auth middleware picks up the new cookie.
// That's intentionally not covered here — triggering a real navigation
// inside the browser-mode test runner's iframe is unreliable and would make
// this suite flaky rather than useful.
