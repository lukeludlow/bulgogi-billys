import type { ReactNode } from "react";
import { Subheading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Text } from "@/components/catalyst-ui-kit/text.tsx";
import { Divider } from "@/components/catalyst-ui-kit/divider.tsx";

/** A titled page section that the sidebar "Jump to" links can scroll to. */
export default function Section({
    id,
    title,
    description,
    children,
}: {
    id: string;
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section id={id} className="mt-10 scroll-mt-24">
            <Subheading>{title}</Subheading>
            {description && <Text className="mt-1 text-sm">{description}</Text>}
            <Divider className="mt-3 mb-5" />
            {children}
        </section>
    );
}
