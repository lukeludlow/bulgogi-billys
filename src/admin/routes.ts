import { lazy, type ComponentType } from "react";

/** A jump-link target: one `<Section id>` on the page. */
export interface NavSection {
    id: string;
    label: string;
}

export interface AdminRoute {
    /** Absolute URL, used directly by AdminTopNav links. */
    path: string;
    /** Top-nav link text, and the sidebar's header. */
    label: string;
    /** The page's H1. The document title is derived as `Admin | <heading>`. */
    heading: string;
    /** One-line intro under the heading. */
    intro: string;
    /** Meta description for the (noindex) page. */
    description: string;
    /** Jump-link targets for this page's sidebar. */
    sections: NavSection[];
    Component: ComponentType;
}

/**
 * Single source of truth for the admin dashboard pages: main.tsx registers the
 * routes, AdminTopNav renders the links, and AdminLayout builds the whole
 * chrome — sidebar, heading, intro, PageMeta — from these entries, so adding a
 * page is one entry plus a content component.
 *
 * The components are lazy here because main.tsx imports this manifest eagerly —
 * the pages, and with them recharts and supabase-js, must stay out of the
 * public entry chunk (verify.sh --dist asserts this). Everything else in an
 * entry is plain data for the same reason.
 */
export const ADMIN_ROUTES: AdminRoute[] = [
    {
        path: "/admin",
        label: "Profit Calculator",
        heading: "Profit Margin Calculator",
        intro: "Bulgogi Billy's — model your menu economics. Edits save automatically.",
        description: "Bulgogi Billy's internal profit margin calculator.",
        sections: [
            { id: "visualizations", label: "Visualizations" },
            { id: "this-week", label: "This Week" },
            { id: "menu-items", label: "Menu Items" },
            { id: "ingredients", label: "Ingredients" },
            { id: "other-costs", label: "Other Costs" },
        ],
        Component: lazy(() => import("@/admin/pages/ProfitCalculator.tsx")),
    },
    {
        path: "/admin/transactions",
        label: "Transaction History",
        heading: "Transaction History",
        intro: "Real sales, imported from your processor — revenue, profit, and price-point performance over time.",
        description: "Bulgogi Billy's internal sales history and analytics.",
        sections: [
            { id: "sales-over-time", label: "Sales Over Time" },
            { id: "price-points", label: "Price Points" },
            { id: "transactions", label: "Transactions" },
            { id: "import-data", label: "Import Data" },
            { id: "assumptions", label: "Assumptions" },
        ],
        Component: lazy(() => import("@/admin/pages/TransactionHistory.tsx")),
    },
    {
        path: "/admin/weekly",
        label: "Weekly Review",
        heading: "Weekly Review",
        intro: "The Monday routine in one place — last week's events, the tax to set aside, and the reserve transfers, as dollar amounts.",
        description: "Bulgogi Billy's internal weekly financial review.",
        sections: [
            { id: "week", label: "The Week" },
            { id: "events", label: "Events" },
            { id: "set-aside", label: "Set Aside & Transfer" },
            { id: "reserves", label: "Reserves" },
            { id: "assumptions", label: "Assumptions" },
        ],
        Component: lazy(() => import("@/admin/pages/WeeklyReview.tsx")),
    },
    {
        path: "/admin/events",
        label: "Events",
        heading: "Events",
        intro: "Cash contribution per market event — every sale assigned to its market automatically, minus food cost and the direct costs you record here.",
        description: "Bulgogi Billy's internal event contribution report.",
        sections: [
            { id: "market-rollups", label: "Markets" },
            { id: "events", label: "Events" },
            { id: "purchases", label: "Purchases" },
            { id: "assumptions", label: "Assumptions" },
        ],
        Component: lazy(() => import("@/admin/pages/Events.tsx")),
    },
];

/** The manifest entry for a pathname, longest match first (/admin is last). */
export function routeFor(pathname: string): AdminRoute {
    const match = [...ADMIN_ROUTES]
        .sort((a, b) => b.path.length - a.path.length)
        .find(
            (route) =>
                pathname === route.path ||
                pathname.startsWith(`${route.path}/`),
        );
    // The layout only renders under /admin, so the index page is the only
    // sensible fallback for an unrecognised child path.
    return match ?? ADMIN_ROUTES[0];
}
