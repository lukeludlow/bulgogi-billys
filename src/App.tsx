import "@/App.css";
import {
    Navbar,
    NavbarDivider,
    NavbarItem,
    NavbarSection,
    NavbarSpacer,
} from "@/components/catalyst-ui-kit/navbar.tsx";
import {
    Sidebar,
    SidebarBody,
    SidebarHeader,
    SidebarItem,
    SidebarSection,
} from "@/components/catalyst-ui-kit/sidebar.tsx";
import { StackedLayout } from "@/components/catalyst-ui-kit/stacked-layout.tsx";
import { Link, Outlet } from "react-router";
import DarkModeToggle from "@/components/dark-mode-toggle/DarkModeToggle.tsx";

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
                        <img
                            src={
                                "src/assets/Bulgogi Billy's Logo (Transparent PNG FINAL).png"
                            }
                            alt={"Bulgogi Billy's Logo"}
                            className={"w-25 h-10"}
                        />
                        {/*<Heading>Bulgogi Billy's</Heading>*/}
                    </Link>
                    <NavbarDivider className="max-lg:hidden" />
                    <NavbarSection className="max-lg:hidden">
                        {navItems.map(({ label, url }) => (
                            <NavbarItem key={label} href={url}>
                                {label}
                            </NavbarItem>
                        ))}
                    </NavbarSection>
                    <NavbarSpacer />
                    <NavbarSection>
                        <NavbarItem href={""}>
                            <DarkModeToggle />
                        </NavbarItem>
                    </NavbarSection>
                </Navbar>
            }
            sidebar={
                <Sidebar>
                    <SidebarHeader>
                        <img
                            src={
                                "src/assets/Bulgogi Billy's Logo (Transparent PNG FINAL).png"
                            }
                            alt={"Bulgogi Billy's Logo"}
                            className={"w-50 h-20"}
                        />
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
