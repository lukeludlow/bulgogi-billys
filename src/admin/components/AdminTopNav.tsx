import { useLocation } from "react-router";
import {
    Navbar,
    NavbarItem,
    NavbarLabel,
    NavbarSection,
} from "@/shared/catalyst-ui-kit/navbar.tsx";
import { ADMIN_ROUTES } from "@/admin/routes.ts";

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
                    {ADMIN_ROUTES.map(({ label, path }) => (
                        <NavbarItem
                            key={path}
                            href={path}
                            current={isCurrent(pathname, path)}
                        >
                            <NavbarLabel>{label}</NavbarLabel>
                        </NavbarItem>
                    ))}
                </NavbarSection>
            </Navbar>
        </div>
    );
}
