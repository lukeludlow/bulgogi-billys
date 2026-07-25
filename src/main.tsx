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
import AdminLogin from "@/pages/admin/AdminLogin.tsx";
// Lazy-loaded so the charting library (recharts) only ships to the admin
// routes, keeping the public site bundle small.
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
        element: <AdminLogin />,
    },
    {
        path: "/admin",
        element: (
            <Suspense fallback={null}>
                <AdminLayout />
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
