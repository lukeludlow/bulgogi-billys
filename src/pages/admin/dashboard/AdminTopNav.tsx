import { useLocation } from "react-router";
import {
    Navbar,
    NavbarItem,
    NavbarLabel,
    NavbarSection,
} from "@/components/catalyst-ui-kit/navbar.tsx";

const PAGES = [
    { label: "Profit Calculator", url: "/admin" },
    { label: "Transaction History", url: "/admin/transactions" },
    { label: "Events", url: "/admin/events" },
];

function isCurrent(pathname: string, url: string): boolean {
    return url === "/admin" ? pathname === "/admin" : pathname.startsWith(url);
}

/** Top nav between the admin pages, used on desktop and in the mobile header. */
export default function AdminTopNav() {
    const { pathname } = useLocation();
    return (
        // The three links are a hair wider than the smallest phones; let the
        // nav scroll within the header instead of stretching the page.
        <div className="min-w-0 overflow-x-auto">
            <Navbar>
                <NavbarSection>
                    {PAGES.map(({ label, url }) => (
                        <NavbarItem
                            key={url}
                            href={url}
                            current={isCurrent(pathname, url)}
                        >
                            <NavbarLabel>{label}</NavbarLabel>
                        </NavbarItem>
                    ))}
                </NavbarSection>
            </Navbar>
        </div>
    );
}
