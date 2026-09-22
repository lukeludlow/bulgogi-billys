import { createElement } from "react";
import type { RouteObject } from "react-router";
import App from "@/site/App.tsx";
import { SITE_ROUTES } from "@/site/routes.ts";

/**
 * The public site's route tree — the App layout with one child per
 * SITE_ROUTES page. The browser router (main.tsx) and the build-time
 * prerenderer (entry-server.tsx) both use it, so the HTML a page is
 * prerendered with is exactly what hydrates.
 */
export const SITE_ROUTE_TREE: RouteObject = {
    path: "/",
    element: createElement(App),
    children: SITE_ROUTES.map(({ path, Component }) =>
        path === "/"
            ? { index: true, element: createElement(Component) }
            : { path, element: createElement(Component) },
    ),
};
