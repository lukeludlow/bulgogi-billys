import clsx from "clsx";
import { useId, type ReactNode } from "react";
import { Subheading } from "@/shared/catalyst-ui-kit/heading.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";

interface Props {
    id?: string;
    title: string;
    intro?: ReactNode;
    className?: string;
    children: ReactNode;
}

/** A titled block of the catering page; `id` makes it a scroll target. */
export default function CateringSection({
    id,
    title,
    intro,
    className,
    children,
}: Props) {
    const generatedId = useId();
    const headingId = id ? `${id}-heading` : generatedId;
    return (
        <section
            id={id}
            aria-labelledby={headingId}
            // Focusable so scrollToSection can move keyboard focus here.
            tabIndex={id ? -1 : undefined}
            className={clsx(
                "flex scroll-mt-4 flex-col gap-4 focus:outline-none",
                className,
            )}
        >
            <div className="flex flex-col gap-1 text-center">
                <Subheading id={headingId} className="text-xl sm:text-2xl">
                    {title}
                </Subheading>
                {intro && (
                    <Text className="text-base sm:text-base">{intro}</Text>
                )}
            </div>
            {children}
        </section>
    );
}
