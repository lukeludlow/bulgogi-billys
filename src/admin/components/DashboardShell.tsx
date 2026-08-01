import type { ReactNode } from "react";
import { Heading } from "@/shared/catalyst-ui-kit/heading.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import { SidebarLayout } from "@/shared/catalyst-ui-kit/sidebar-layout.tsx";
import AdminTopNav from "@/admin/components/AdminTopNav.tsx";
import SyncStatusBar from "@/admin/components/SyncStatusBar.tsx";
import DashboardNav, {
    type NavSection,
} from "@/admin/components/DashboardNav.tsx";
import { useActiveSection } from "@/admin/components/useActiveSection.ts";

interface Props {
    /** Sidebar header title, e.g. the page name. */
    title: string;
    /** The page's H1. */
    heading: string;
    /** One-line intro under the heading. */
    intro: string;
    /** Jump-link targets for this page's sidebar. */
    sections: NavSection[];
    children: ReactNode;
}

/**
 * Shared chrome for every admin page: the jump-link sidebar (drawer on
 * mobile), the top nav between pages (in the mobile header / above the
 * heading on desktop), and the cloud-sync bar.
 */
export default function DashboardShell({
    title,
    heading,
    intro,
    sections,
    children,
}: Props) {
    const activeId = useActiveSection(sections.map((section) => section.id));

    return (
        <SidebarLayout
            sidebar={
                <DashboardNav
                    title={title}
                    sections={sections}
                    activeId={activeId}
                />
            }
            navbar={<AdminTopNav />}
        >
            {/* Desktop top nav — mobile gets it in the header above. Full-bleed
                strip across the content card. */}
            <div className="-mx-10 -mt-6 mb-8 border-b border-zinc-950/5 px-10 max-lg:hidden dark:border-white/10">
                <AdminTopNav />
            </div>

            <Heading level={1} className="text-2xl sm:text-3xl">
                {heading}
            </Heading>
            <Text className="mt-1">{intro}</Text>

            <div className="mt-6">
                <SyncStatusBar />
            </div>

            {children}
        </SidebarLayout>
    );
}
