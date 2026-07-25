import * as Headless from "@headlessui/react";
import clsx from "clsx";
import DarkModeToggle from "@/components/dark-mode-toggle/DarkModeToggle.tsx";
import {
    Sidebar,
    SidebarBody,
    SidebarHeader,
    SidebarHeading,
    SidebarSection,
} from "@/components/catalyst-ui-kit/sidebar.tsx";

export interface NavSection {
    id: string;
    label: string;
}

interface Props {
    title: string;
    sections: NavSection[];
    activeId: string;
}

function scrollToSection(id: string) {
    document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Sidebar contents for the calculator: a jump link per page section. Links use
 * `CloseButton` so tapping one on mobile scrolls to the section *and* closes the
 * drawer; on desktop (no drawer) it just scrolls.
 */
export default function DashboardNav({ title, sections, activeId }: Props) {
    return (
        <Sidebar>
            <SidebarHeader>
                <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-zinc-950 dark:text-white">
                        {title}
                    </div>
                    <DarkModeToggle />
                </div>
            </SidebarHeader>
            <SidebarBody>
                <SidebarSection>
                    <SidebarHeading>Jump to</SidebarHeading>
                    {sections.map((section) => {
                        const current = section.id === activeId;
                        return (
                            <Headless.CloseButton
                                key={section.id}
                                as="button"
                                onClick={() => scrollToSection(section.id)}
                                data-current={current ? "true" : undefined}
                                className={clsx(
                                    "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-base/6 font-medium sm:py-2 sm:text-sm/5",
                                    current
                                        ? "bg-zinc-950/5 text-zinc-950 dark:bg-white/5 dark:text-white"
                                        : "text-zinc-700 data-hover:bg-zinc-950/5 dark:text-zinc-300 dark:data-hover:bg-white/5",
                                )}
                            >
                                {section.label}
                            </Headless.CloseButton>
                        );
                    })}
                </SidebarSection>
            </SidebarBody>
        </Sidebar>
    );
}
