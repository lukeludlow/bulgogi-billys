import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// @ts-expect-error inter is CSS only
import "@fontsource-variable/inter";
import "@/index.css";
import { createBrowserRouter, RouterProvider } from "react-router";
import App from "@/App.tsx";
import Menu from "@/pages/menu/Menu.tsx";
import Home from "@/pages/home/Home.tsx";
import NotFound from "@/pages/notfound/NotFound.tsx";
import Schedule from "@/pages/schedule/Schedule.tsx";
import { Analytics } from "@vercel/analytics/react";

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
