import { StrictMode } from "react";
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
import Order from "@/pages/order/Order.tsx";
import OrderNow from "@/pages/order-now/OrderNow.tsx";
import Contact from "@/pages/contact/Contact.tsx";
import About from "@/pages/about/About.tsx";
import EnterPassword from "@/pages/enter-password/EnterPassword.tsx";

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
                path: "/order",
                element: <Order />,
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
                path: "/about",
                element: <About />,
            },
            {
                path: "/enter-password",
                element: <EnterPassword />,
            },
            {
                path: "*",
                element: <NotFound />,
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
