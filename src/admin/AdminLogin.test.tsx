import { afterEach, expect, test, vi } from "vitest";
import { Route, Routes } from "react-router";
import AdminLogin from "@/admin/AdminLogin.tsx";
import { supabase } from "@/admin/data/supabase.ts";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

vi.mock("@/admin/data/supabase.ts", () => ({
    supabase: {
        auth: {
            getSession: vi.fn(async () => ({ data: { session: null } })),
            signInWithOtp: vi.fn(async () => ({ data: {}, error: null })),
        },
    },
}));

afterEach(() => {
    vi.clearAllMocks();
});

test("sends a magic link and shows the check-your-email state", async () => {
    const { getByLabelText, getByRole, getByText } = await renderWithProviders(
        <AdminLogin />,
    );

    await getByLabelText("Email").fill("billy@example.com");
    await getByRole("button", { name: "Send sign-in link" }).click();

    await expect.element(getByText("Check your email")).toBeInTheDocument();
    expect(vi.mocked(supabase.auth.signInWithOtp)).toHaveBeenCalledWith({
        email: "billy@example.com",
        options: {
            shouldCreateUser: false,
            emailRedirectTo: expect.stringContaining("/auth/callback"),
        },
    });
});

test("shows an error when Supabase rejects the email", async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValueOnce({
        data: {},
        error: { message: "Signups not allowed for otp" },
    } as never);

    const { getByLabelText, getByRole, getByText } = await renderWithProviders(
        <AdminLogin />,
    );

    await getByLabelText("Email").fill("stranger@example.com");
    await getByRole("button", { name: "Send sign-in link" }).click();

    await expect
        .element(getByText("Couldn't send the link", { exact: false }))
        .toBeInTheDocument();
});

test("shows an error when the request itself fails", async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockRejectedValueOnce(
        new Error("network down"),
    );

    const { getByLabelText, getByRole, getByText } = await renderWithProviders(
        <AdminLogin />,
    );

    await getByLabelText("Email").fill("billy@example.com");
    await getByRole("button", { name: "Send sign-in link" }).click();

    await expect
        .element(getByText("Couldn't send the link", { exact: false }))
        .toBeInTheDocument();
});

test("clears the error message as soon as the user starts typing again", async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValueOnce({
        data: {},
        error: { message: "rate limited" },
    } as never);

    const { getByLabelText, getByRole, getByText } = await renderWithProviders(
        <AdminLogin />,
    );

    await getByLabelText("Email").fill("billy@example.com");
    await getByRole("button", { name: "Send sign-in link" }).click();
    await expect
        .element(getByText("Couldn't send the link", { exact: false }))
        .toBeInTheDocument();

    await getByLabelText("Email").fill("billy2@example.com");

    await expect
        .element(getByText("Couldn't send the link", { exact: false }))
        .not.toBeInTheDocument();
});

test("redirects straight to the dashboard when already signed in", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: { access_token: "token" } },
    } as never);

    const { getByText } = await renderWithProviders(<AdminLoginRoutes />, {
        route: "/admin-login",
    });

    await expect.element(getByText("dashboard probe")).toBeInTheDocument();
});

test("renders a dark mode toggle", async () => {
    const { getByRole } = await renderWithProviders(<AdminLogin />);

    await expect.element(getByRole("switch")).toBeInTheDocument();
});

function AdminLoginRoutes() {
    return (
        <Routes>
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin" element={<div>dashboard probe</div>} />
        </Routes>
    );
}
