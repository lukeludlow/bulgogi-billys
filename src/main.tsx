import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
// @ts-expect-error inter is CSS only
import "@fontsource-variable/inter";
import "@/index.css";
import { createBrowserRouter, RouterProvider } from "react-router";
import App from "@/App.tsx";
import Menu from "@/pages/menu/Menu.tsx";
import Home from "@/pages/home/Home.tsx";
import NotFound from "@/pages/not-found/NotFound.tsx";
import Schedule from "@/pages/schedule/Schedule.tsx";
import { Analytics } from "@vercel/analytics/react";
import OrderNow from "@/pages/order-now/OrderNow.tsx";
import Contact from "@/pages/contact/Contact.tsx";
import EnterPassword from "@/pages/enter-password/EnterPassword.tsx";
import Blog from "@/pages/blog/Blog.tsx";
import BlogPost from "@/pages/blog/BlogPost.tsx";
// Lazy-loaded so the charting library (recharts) and the Supabase client only
// ship to the admin routes, keeping the public site bundle small.
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin.tsx"));
const AuthCallback = lazy(() => import("@/pages/admin/AuthCallback.tsx"));
const RequireAdmin = lazy(() => import("@/pages/admin/RequireAdmin.tsx"));
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout.tsx"));
const ProfitCalculator = lazy(
    () => import("@/pages/admin/dashboard/ProfitCalculator.tsx"),
);
const TransactionHistory = lazy(
    () => import("@/pages/admin/dashboard/TransactionHistory.tsx"),
);

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
                path: "/enter-password",
                element: <EnterPassword />,
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
        ],
    },
]);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <RouterProvider router={router} />
        <Analytics />
    </StrictMode>,
);
