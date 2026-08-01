import { Suspense } from "react";
import { Outlet } from "react-router";
import { SettingsProvider } from "@/admin/SettingsContext.tsx";

/**
 * Layout route for /admin: shared settings state above the pages, so edits
 * survive navigating between them. Each page renders its own chrome via
 * DashboardShell.
 */
export default function AdminLayout() {
    return (
        <SettingsProvider>
            <Suspense fallback={null}>
                <Outlet />
            </Suspense>
        </SettingsProvider>
    );
}
