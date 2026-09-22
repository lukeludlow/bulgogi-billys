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
    { label: "Catering", url: "/catering" },
    { label: "Contact", url: "/contact" },
];
