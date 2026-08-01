import { afterEach, expect, test, vi } from "vitest";
import { Route, Routes } from "react-router";
import AuthCallback from "@/admin/AuthCallback.tsx";
import { supabase } from "@/admin/data/supabase.ts";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

vi.mock("@/admin/data/supabase.ts", () => ({
    supabase: {
        auth: {
            getSession: vi.fn(async () => ({ data: { session: null } })),
            onAuthStateChange: vi.fn(() => ({
                data: { subscription: { unsubscribe: vi.fn() } },
            })),
        },
    },
}));

afterEach(() => {
    vi.clearAllMocks();
});

function CallbackRoutes() {
    return (
        <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/admin" element={<div>dashboard probe</div>} />
        </Routes>
    );
}

test("redirects to the dashboard once a session exists", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: { access_token: "token" } },
    } as never);

    const { getByText } = await renderWithProviders(<CallbackRoutes />, {
        route: "/auth/callback?code=abc123",
    });

    await expect.element(getByText("dashboard probe")).toBeInTheDocument();
});

test("redirects when the auth state change delivers the session", async () => {
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementationOnce(((
        callback: (event: string, session: unknown) => void,
    ) => {
        callback("SIGNED_IN", { access_token: "token" });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
    }) as never);

    const { getByText } = await renderWithProviders(<CallbackRoutes />, {
        route: "/auth/callback?code=abc123",
    });

    await expect.element(getByText("dashboard probe")).toBeInTheDocument();
});

test("shows a waiting message while the code exchange is in flight", async () => {
    const { getByText } = await renderWithProviders(<CallbackRoutes />, {
        route: "/auth/callback?code=abc123",
    });

    await expect.element(getByText("Signing you in…")).toBeInTheDocument();
});

test("shows the expired-link message when Supabase reports an error", async () => {
    const { getByText } = await renderWithProviders(<CallbackRoutes />, {
        route: "/auth/callback?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
    });

    await expect.element(getByText("Sign-in link expired")).toBeInTheDocument();
    expect(vi.mocked(supabase.auth.onAuthStateChange)).not.toHaveBeenCalled();
});
