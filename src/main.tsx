import { lazy, Suspense } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
// @ts-expect-error inter is CSS only
import "@fontsource-variable/inter";
import "@/index.css";
import {
    createBrowserRouter,
    RouterProvider,
    type RouteObject,
} from "react-router";
import AppRoot from "@/AppRoot.tsx";
import { captureAttribution } from "@/site/attribution.ts";
import { SITE_ROUTE_TREE } from "@/site/router.ts";
import { ADMIN_ROUTES } from "@/admin/routes.ts";
import { removePrerenderedHead, shouldHydrate } from "@/ssrHtml.ts";

// Lazy-loaded so the admin code (and through ADMIN_ROUTES' own lazy pages,
// recharts and the Supabase client) only ships to the admin routes, keeping
// the public site bundle small.
const AdminLogin = lazy(() => import("@/admin/AdminLogin.tsx"));
const AuthCallback = lazy(() => import("@/admin/AuthCallback.tsx"));
const RequireAdmin = lazy(() => import("@/admin/RequireAdmin.tsx"));
const AdminLayout = lazy(() => import("@/admin/AdminLayout.tsx"));

// "/admin" itself is the index page; the others register by their segment.
const adminChildren: RouteObject[] = ADMIN_ROUTES.map(({ path, Component }) =>
    path === "/admin"
        ? { index: true, element: <Component /> }
        : { path: path.slice("/admin/".length), element: <Component /> },
);

// First-touch UTM tags from printed and posted links (tent QR, flyers, …),
// kept for the session so a catering inquiry can say where it came from.
captureAttribution(window.location.href);

const router = createBrowserRouter([
    SITE_ROUTE_TREE,
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

const container = document.getElementById("root")!;
const app = (
    <AppRoot>
        <RouterProvider router={router} />
    </AppRoot>
);

// Public pages are prerendered at build time (scripts/prerender.ts); hydrate
// them. Anything else — the admin shell, 404.html served at an unknown URL,
// the dev server — renders from scratch.
if (shouldHydrate(container.dataset.prerendered, window.location.pathname)) {
    hydrateRoot(container, app);
} else {
    removePrerenderedHead(document);
    container.replaceChildren();
    createRoot(container).render(app);
}
