import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
// @ts-expect-error inter is CSS only
import "@fontsource-variable/inter";
import "@/index.css";
import {
    createBrowserRouter,
    RouterProvider,
    type RouteObject,
} from "react-router";
import { Analytics } from "@vercel/analytics/react";
import App from "@/site/App.tsx";
import { SITE_ROUTES } from "@/site/routes.ts";
import { ADMIN_ROUTES } from "@/admin/routes.ts";

// Lazy-loaded so the admin code (and through ADMIN_ROUTES' own lazy pages,
// recharts and the Supabase client) only ships to the admin routes, keeping
// the public site bundle small.
const AdminLogin = lazy(() => import("@/admin/AdminLogin.tsx"));
const AuthCallback = lazy(() => import("@/admin/AuthCallback.tsx"));
const RequireAdmin = lazy(() => import("@/admin/RequireAdmin.tsx"));
const AdminLayout = lazy(() => import("@/admin/AdminLayout.tsx"));

const siteChildren: RouteObject[] = SITE_ROUTES.map(({ path, Component }) =>
    path === "/"
        ? { index: true, element: <Component /> }
        : { path, element: <Component /> },
);

// "/admin" itself is the index page; the others register by their segment.
const adminChildren: RouteObject[] = ADMIN_ROUTES.map(({ path, Component }) =>
    path === "/admin"
        ? { index: true, element: <Component /> }
        : { path: path.slice("/admin/".length), element: <Component /> },
);

const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: siteChildren,
    },
    {
        path: "/admin-login",
        element: (
            <Suspense fallback={null}>
                <AdminLogin />
            </Suspense>
        ),
    },
    {
        path: "/auth/callback",
        element: (
            <Suspense fallback={null}>
                <AuthCallback />
            </Suspense>
        ),
    },
    {
        path: "/admin",
        element: (
            <Suspense fallback={null}>
                <RequireAdmin>
                    <AdminLayout />
                </RequireAdmin>
            </Suspense>
        ),
        children: adminChildren,
    },
]);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <RouterProvider router={router} />
        <Analytics />
    </StrictMode>,
);
