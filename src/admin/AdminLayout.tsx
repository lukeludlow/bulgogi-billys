import { Suspense, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router";
import DashboardShell from "@/admin/components/DashboardShell.tsx";
import { routeFor } from "@/admin/routes.ts";
import { RecordsGate, RecordsProvider } from "@/admin/RecordsContext.tsx";
import { SettingsProvider } from "@/admin/SettingsContext.tsx";
import {
    TransactionsGate,
    TransactionsProvider,
} from "@/admin/TransactionsContext.tsx";

/**
 * The admin data layer: settings, transactions, and operational records all
 * load in parallel (the provider order is what makes that true — only
 * SettingsProvider gates, so the outer two fetches are already in flight when
 * it starts its own), and children only render once all three are here.
 * Exported so page tests can compose the exact provider stack the app uses.
 */
export function AdminDataProviders({ children }: { children: ReactNode }) {
    return (
        <TransactionsProvider>
            <RecordsProvider>
                <SettingsProvider>
                    <TransactionsGate>
                        <RecordsGate>{children}</RecordsGate>
                    </TransactionsGate>
                </SettingsProvider>
            </RecordsProvider>
        </TransactionsProvider>
    );
}

/**
 * Layout route for /admin: shared dashboard state above the pages, so edits
 * survive navigating between them, plus the chrome every page wears — built
 * from the route manifest rather than repeated per page. The shell sits inside
 * the providers because its sync bar reads them.
 */
export default function AdminLayout() {
    const route = routeFor(useLocation().pathname);

    return (
        <AdminDataProviders>
            <DashboardShell route={route}>
                <Suspense fallback={null}>
                    <Outlet />
                </Suspense>
            </DashboardShell>
        </AdminDataProviders>
    );
}
