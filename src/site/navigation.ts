export interface NavItem {
    label: string;
    url: string;
}

/**
 * The public nav, shared by the navbar, the mobile sidebar, and the footer.
 * The blog stays out on purpose: it exists for search, not navigation.
 */
export const NAV_ITEMS: NavItem[] = [
    { label: "Home", url: "/" },
    { label: "Menu", url: "/menu" },
    { label: "Schedule", url: "/schedule" },
    // The contact form doubles as the catering inquiry until the dedicated
    // /catering page ships (WEBSITE_REVENUE_PLAN.md Phase 1).
    { label: "Catering", url: "/contact" },
    { label: "Contact", url: "/contact" },
];
