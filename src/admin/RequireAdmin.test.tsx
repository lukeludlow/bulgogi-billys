import { afterEach, expect, test, vi } from "vitest";
import { Route, Routes } from "react-router";
import RequireAdmin from "@/admin/RequireAdmin.tsx";
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

function GuardedRoutes() {
    return (
        <Routes>
            <Route
                path="/admin"
                element={
                    <RequireAdmin>
                        <div>protected dashboard</div>
                    </RequireAdmin>
                }
            />
            <Route path="/admin-login" element={<div>login probe</div>} />
        </Routes>
    );
}

test("redirects anonymous visitors to the login page", async () => {
    const { getByText } = await renderWithProviders(<GuardedRoutes />, {
        route: "/admin",
    });

    await expect.element(getByText("login probe")).toBeInTheDocument();
});

test("renders the protected content for a signed-in admin", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: { access_token: "token" } },
    } as never);

    const { getByText } = await renderWithProviders(<GuardedRoutes />, {
        route: "/admin",
    });

    await expect.element(getByText("protected dashboard")).toBeInTheDocument();
});

test("bounces to login when the session ends", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: { access_token: "token" } },
    } as never);
    let fireAuthChange: (event: string, session: unknown) => void = () => {};
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementationOnce(((
        callback: (event: string, session: unknown) => void,
    ) => {
        fireAuthChange = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
    }) as never);

    const { getByText } = await renderWithProviders(<GuardedRoutes />, {
        route: "/admin",
    });
    await expect.element(getByText("protected dashboard")).toBeInTheDocument();

    fireAuthChange("SIGNED_OUT", null);

    await expect.element(getByText("login probe")).toBeInTheDocument();
});
