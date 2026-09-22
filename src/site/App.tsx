import "@/site/App.css";
import {
    Navbar,
    NavbarItem,
    NavbarSection,
} from "@/shared/catalyst-ui-kit/navbar.tsx";
import {
    Sidebar,
    SidebarBody,
    SidebarHeader,
    SidebarItem,
    SidebarSection,
} from "@/shared/catalyst-ui-kit/sidebar.tsx";
import { StackedLayout } from "@/shared/catalyst-ui-kit/stacked-layout.tsx";
import { Outlet } from "react-router";
import DarkModeToggle from "@/shared/dark-mode-toggle/DarkModeToggle.tsx";
import ResponsiveImage from "@/site/components/ResponsiveImage.tsx";
import SiteFooter from "@/site/components/SiteFooter.tsx";
import { SITE_IMAGES } from "@/site/images.ts";
import { NAV_ITEMS } from "@/site/navigation.ts";

function NavbarLogo() {
    return (
        <ResponsiveImage
            image={SITE_IMAGES.logo}
            sizes="108px"
            loading="eager"
            alt="Bulgogi Billy's home"
            className="h-10 w-auto"
        />
    );
}

export default function App() {
    return (
        <StackedLayout
            navbar={
                <Navbar>
                    {/* The logo column sizes to the logo, so the nav links
                        get the rest of the row even on narrow desktops. */}
                    <div
                        className={
                            "grid grid-cols-3 lg:grid-cols-[1fr_auto_1fr] grow"
                        }
                    >
                        <NavbarSection className="max-lg:hidden">
                            {NAV_ITEMS.map(({ label, url }) => (
                                <NavbarItem key={label} href={url}>
                                    {label}
                                </NavbarItem>
                            ))}
                        </NavbarSection>
                        <NavbarSection
                            className={"justify-center max-lg:hidden"}
                        >
                            <NavbarItem href={"/"}>
                                <NavbarLogo />
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
                                <NavbarLogo />
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
                        <ResponsiveImage
                            image={SITE_IMAGES.logo}
                            sizes="216px"
                            className={"h-20 w-auto self-start"}
                        />
                    </SidebarHeader>
                    <SidebarBody>
                        <SidebarSection>
                            {NAV_ITEMS.map(({ label, url }) => (
                                <SidebarItem key={label} href={url}>
                                    {label}
                                </SidebarItem>
                            ))}
                        </SidebarSection>
                    </SidebarBody>
                </Sidebar>
            }
            footer={<SiteFooter />}
        >
            <Outlet />
        </StackedLayout>
    );
}
