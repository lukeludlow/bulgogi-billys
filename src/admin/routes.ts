import { lazy, type ComponentType } from "react";

export interface AdminRoute {
    /** Absolute URL, used directly by AdminTopNav links. */
    path: string;
    label: string;
    Component: ComponentType;
}

/**
 * Single source of truth for the admin dashboard pages, consumed by main.tsx
 * (route registration) and AdminTopNav (links). The components are lazy here
 * because main.tsx imports this manifest eagerly — the pages, and with them
 * recharts and supabase-js, must stay out of the public entry chunk
 * (verify.sh --dist asserts this).
 */
export const ADMIN_ROUTES: AdminRoute[] = [
    {
        path: "/admin",
        label: "Profit Calculator",
        Component: lazy(() => import("@/admin/pages/ProfitCalculator.tsx")),
    },
    {
        path: "/admin/transactions",
        label: "Transaction History",
        Component: lazy(() => import("@/admin/pages/TransactionHistory.tsx")),
    },
    {
        path: "/admin/events",
        label: "Events",
        Component: lazy(() => import("@/admin/pages/Events.tsx")),
    },
];
