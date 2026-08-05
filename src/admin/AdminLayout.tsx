import { Suspense, type ReactNode } from "react";
import { Outlet } from "react-router";
import { SettingsProvider } from "@/admin/SettingsContext.tsx";
import {
    TransactionsGate,
    TransactionsProvider,
} from "@/admin/TransactionsContext.tsx";

/**
 * The admin data layer: settings and transactions load in parallel (the
 * provider order is what makes that true — TransactionsProvider doesn't
 * gate, so SettingsProvider's fetch starts immediately), and children only
 * render once both are here. Exported so page tests can compose the exact
 * provider stack the app uses.
 */
export function AdminDataProviders({ children }: { children: ReactNode }) {
    return (
        <TransactionsProvider>
            <SettingsProvider>
                <TransactionsGate>{children}</TransactionsGate>
            </SettingsProvider>
        </TransactionsProvider>
    );
}

/**
 * Layout route for /admin: shared settings and transaction state above the
 * pages, so edits survive navigating between them. Each page renders its
 * own chrome via DashboardShell.
 */
export default function AdminLayout() {
    return (
        <AdminDataProviders>
            <Suspense fallback={null}>
                <Outlet />
            </Suspense>
        </AdminDataProviders>
    );
}
