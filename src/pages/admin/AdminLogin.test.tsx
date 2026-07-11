import { afterEach, expect, test, vi } from "vitest";
import AdminLogin from "./AdminLogin.tsx";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

test("shows an error when the server rejects the password", async () => {
    vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    const { getByLabelText, getByRole, getByText } =
        await renderWithProviders(<AdminLogin />);

    await getByLabelText("Password").fill("definitely-wrong");
    await getByRole("button", { name: "Sign in" }).click();

    await expect
        .element(getByText("Incorrect password. Try again."))
        .toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
        "/api/admin-login",
        expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: "definitely-wrong" }),
        }),
    );
});

test("clears the error message as soon as the user starts typing again", async () => {
    vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    const { getByLabelText, getByRole, getByText } =
        await renderWithProviders(<AdminLogin />);

    await getByLabelText("Password").fill("definitely-wrong");
    await getByRole("button", { name: "Sign in" }).click();
    await expect
        .element(getByText("Incorrect password. Try again."))
        .toBeInTheDocument();

    await getByLabelText("Password").fill("definitely-wrong-2");

    await expect
        .element(getByText("Incorrect password. Try again."))
        .not.toBeInTheDocument();
});

test("renders a dark mode toggle", async () => {
    const { getByRole } = await renderWithProviders(<AdminLogin />);

    await expect.element(getByRole("switch")).toBeInTheDocument();
});

test("shows an error when the login request itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { getByLabelText, getByRole, getByText } =
        await renderWithProviders(<AdminLogin />);

    await getByLabelText("Password").fill("some-password");
    await getByRole("button", { name: "Sign in" }).click();

    await expect
        .element(getByText("Incorrect password. Try again."))
        .toBeInTheDocument();
});

// Note: on success the component does window.location.href = "/admin" to
// force a real navigation so edge middleware re-validates the freshly-issued
// HttpOnly session cookie. There's no way to assert "no error is shown" on
// the success path without also triggering that real navigation, which
// crashes the browser-mode test runner's iframe (it's mid-teardown by the
// time the assertion would run). That's intentionally not covered here, same
// limitation documented in EnterPassword.test.tsx.
