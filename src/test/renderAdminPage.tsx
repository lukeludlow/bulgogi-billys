import type { ReactElement } from "react";
import { Route, Routes } from "react-router";
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
 */
export function renderAdminPage(route: string, children: ReactElement) {
    return renderWithProviders(
        <Routes>
            <Route path="/admin" element={<AdminLayout />}>
                {children}
            </Route>
        </Routes>,
        { route },
    );
}
