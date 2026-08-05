import { Suspense, type ReactNode } from "react";
import { Outlet } from "react-router";
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
 * survive navigating between them. Each page renders its
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
