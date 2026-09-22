import type { ReactElement } from "react";
import { Route, Routes } from "react-router";
import { page } from "vitest/browser";
import AdminLayout from "@/admin/AdminLayout.tsx";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

/**
 * Render an admin page the way the app does: inside the /admin layout route,
 * which supplies the data providers and — since Phase 6 — the whole chrome
 * (sidebar, top nav, heading, sync bar) from the route manifest. Mounting a
 * page component on its own would render content with no chrome around it,
 * which is not a state the app can be in.
 *
 * `children` mirrors main.tsx's child routes; `route` is the URL to start at,
 * and is what selects the manifest entry the chrome is built from.
 *
 * Renders at a desktop viewport: tests load the real Tailwind CSS, and the
 * dashboard's sidebar (jump links, dark mode toggle) is hidden below `lg`.
 */
export async function renderAdminPage(route: string, children: ReactElement) {
    await page.viewport(1280, 900);
    return renderWithProviders(
        <Routes>
            <Route path="/admin" element={<AdminLayout />}>
                {children}
            </Route>
        </Routes>,
        { route },
    );
}
