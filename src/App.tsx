import "@/App.css";
import { Navbar, NavbarItem, NavbarSection, } from "@/components/catalyst-ui-kit/navbar.tsx";
import {
    Sidebar,
    SidebarBody,
    SidebarHeader,
    SidebarItem,
    SidebarSection,
} from "@/components/catalyst-ui-kit/sidebar.tsx";
import { StackedLayout } from "@/components/catalyst-ui-kit/stacked-layout.tsx";
import { Outlet } from "react-router";
import DarkModeToggle from "@/components/dark-mode-toggle/DarkModeToggle.tsx";

const navItems = [
    { label: "Home", url: "/" },
    { label: "Menu", url: "/menu" },
    { label: "Order", url: "/order" },
    { label: "Schedule", url: "/schedule" },
    { label: "Contact", url: "/contact" },
    { label: "About", url: "/about" },
];

export default function App() {
    return (
        <StackedLayout
            navbar={
                <Navbar>
                    <div className={"grid grid-cols-3 grow"}>
                        <NavbarSection className="max-lg:hidden">
                            {navItems.map(({ label, url }) => (
                                <NavbarItem key={label} href={url}>
                                    {label}
                                </NavbarItem>
                            ))}
                        </NavbarSection>
                        <NavbarSection
                            className={"justify-center max-lg:hidden"}
                        >
                            <NavbarItem href={"/"}>
                                <img
                                    src={
                                        "src/assets/Bulgogi Billy's Logo (Transparent PNG FINAL).png"
                                    }
                                    alt={"Bulgogi Billy's Logo"}
                                    className={"w-25 h-10"}
                                />
                            </NavbarItem>
                        </NavbarSection>
                        <NavbarSection
                            className={"grid grid-cols-3 col-span-2 lg:hidden"}
                        >
                            <div></div>
                            <NavbarItem
                                href={"/"}
                                className={
                                    "flex flex-row col-span-2 justify-center max-sm:pr-2 md:pl-8"
                                }
                            >
                                <img
                                    src={
                                        "src/assets/Bulgogi Billy's Logo (Transparent PNG FINAL).png"
                                    }
                                    alt={"Bulgogi Billy's Logo"}
                                    className={"w-25 h-10"}
                                />
                            </NavbarItem>
                        </NavbarSection>
                        <NavbarSection className={"justify-end"}>
                            <NavbarItem href={"#"}>
                                <DarkModeToggle />
                            </NavbarItem>
                        </NavbarSection>
                    </div>
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
