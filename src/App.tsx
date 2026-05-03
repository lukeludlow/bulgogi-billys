import "@/App.css";
import {
    Navbar,
    NavbarDivider,
    NavbarItem,
    NavbarSection,
} from "@/components/catalyst-ui-kit/navbar.tsx";
import {
    Sidebar,
    SidebarBody,
    SidebarHeader,
    SidebarItem,
    SidebarSection,
} from "@/components/catalyst-ui-kit/sidebar.tsx";
import { StackedLayout } from "@/components/catalyst-ui-kit/stacked-layout.tsx";
import { Heading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Link, Outlet } from "react-router";

const navItems = [
    { label: "Home", url: "/" },
    { label: "Menu", url: "/menu" },
    { label: "Schedule", url: "/schedule" },
    { label: "Contact", url: "/contact" },
    { label: "About", url: "/about" },
];

export default function App() {
    return (
        <StackedLayout
            navbar={
                <Navbar>
                    <Link to={"/"}>
                        <Heading>Bulgogi Billy's</Heading>
                    </Link>
                    <NavbarDivider className="max-lg:hidden" />
                    <NavbarSection className="max-lg:hidden">
                        {navItems.map(({ label, url }) => (
                            <NavbarItem key={label} href={url}>
                                {label}
                            </NavbarItem>
                        ))}
                    </NavbarSection>
                </Navbar>
            }
            sidebar={
                <Sidebar>
                    <SidebarHeader>
                        <Heading>Bulgogi Billy's</Heading>
                    </SidebarHeader>
                    <SidebarBody>
                        <SidebarSection>
                            {navItems.map(({ label, url }) => (
                                <SidebarItem key={label} href={url}>
                                    {label}
                                </SidebarItem>
                            ))}
                        </SidebarSection>
                    </SidebarBody>
                </Sidebar>
            }
        >
            <Outlet />
        </StackedLayout>
    );
}
