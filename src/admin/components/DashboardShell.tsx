import type { ReactNode } from "react";
import PageMeta from "@/shared/PageMeta.tsx";
import { Heading } from "@/shared/catalyst-ui-kit/heading.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import { SidebarLayout } from "@/shared/catalyst-ui-kit/sidebar-layout.tsx";
import AdminTopNav from "@/admin/components/AdminTopNav.tsx";
import SyncStatusBar from "@/admin/components/SyncStatusBar.tsx";
import DashboardNav from "@/admin/components/DashboardNav.tsx";
import { useActiveSection } from "@/admin/components/useActiveSection.ts";
import type { AdminRoute } from "@/admin/routes.ts";

/**
 * Shared chrome for every admin page: page metadata, the jump-link sidebar
 * (drawer on mobile), the top nav between pages (in the mobile header / above
 * the heading on desktop), the heading and intro, and the cloud-sync bar.
 *
 * Rendered once by AdminLayout from the route manifest, so the pages
 * underneath are content only.
 */
export default function DashboardShell({
    route,
    children,
}: {
    route: AdminRoute;
    children: ReactNode;
}) {
    const activeId = useActiveSection(
        route.sections.map((section) => section.id),
    );

    return (
        <SidebarLayout
            sidebar={
                <DashboardNav
                    title={route.label}
                    sections={route.sections}
                    activeId={activeId}
                />
            }
            navbar={<AdminTopNav />}
        >
            <PageMeta
                title={`Admin | ${route.heading}`}
                description={route.description}
                noindex
            />

            {/* Desktop top nav — mobile gets it in the header above. Full-bleed
                strip across the content card. */}
            <div className="-mx-10 -mt-6 mb-8 border-b border-zinc-950/5 px-10 max-lg:hidden dark:border-white/10">
                <AdminTopNav />
            </div>

            <Heading level={1} className="text-2xl sm:text-3xl">
                {route.heading}
            </Heading>
            <Text className="mt-1">{route.intro}</Text>

            <div className="mt-6">
                <SyncStatusBar />
            </div>

            {children}
        </SidebarLayout>
    );
}
