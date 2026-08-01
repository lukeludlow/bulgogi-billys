import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
// @ts-expect-error inter is CSS only
import "@fontsource-variable/inter";
import "@/index.css";
import { createBrowserRouter, RouterProvider } from "react-router";
import App from "@/site/App.tsx";
import Menu from "@/site/pages/menu/Menu.tsx";
import Home from "@/site/pages/home/Home.tsx";
import NotFound from "@/site/pages/not-found/NotFound.tsx";
import Schedule from "@/site/pages/schedule/Schedule.tsx";
import { Analytics } from "@vercel/analytics/react";
import OrderNow from "@/site/pages/order-now/OrderNow.tsx";
import Contact from "@/site/pages/contact/Contact.tsx";
import Blog from "@/site/pages/blog/Blog.tsx";
import BlogPost from "@/site/pages/blog/BlogPost.tsx";
// Lazy-loaded so the charting library (recharts) and the Supabase client only
// ship to the admin routes, keeping the public site bundle small.
const AdminLogin = lazy(() => import("@/admin/AdminLogin.tsx"));
const AuthCallback = lazy(() => import("@/admin/AuthCallback.tsx"));
const RequireAdmin = lazy(() => import("@/admin/RequireAdmin.tsx"));
const AdminLayout = lazy(() => import("@/admin/AdminLayout.tsx"));
const ProfitCalculator = lazy(
    () => import("@/admin/pages/ProfitCalculator.tsx"),
);
const TransactionHistory = lazy(
    () => import("@/admin/pages/TransactionHistory.tsx"),
);
const Events = lazy(() => import("@/admin/pages/Events.tsx"));

const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: [
            {
                index: true,
                element: <Home />,
            },
            {
                path: "/menu",
                element: <Menu />,
            },
            {
                path: "/schedule",
                element: <Schedule />,
            },
            {
                path: "/order-now",
                element: <OrderNow />,
            },
            {
                path: "/contact",
                element: <Contact />,
            },
            {
                path: "/blog",
                element: <Blog />,
            },
            {
                path: "/blog/:slug",
                element: <BlogPost />,
            },
            {
                path: "*",
                element: <NotFound />,
            },
        ],
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
        children: [
            {
                index: true,
                element: <ProfitCalculator />,
            },
            {
                path: "transactions",
                element: <TransactionHistory />,
            },
            {
                path: "events",
                element: <Events />,
            },
        ],
    },
]);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <RouterProvider router={router} />
        <Analytics />
    </StrictMode>,
);
