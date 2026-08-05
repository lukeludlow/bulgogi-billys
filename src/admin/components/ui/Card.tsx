import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * The surface every admin panel sits on. One definition of the class string
 * that was previously repeated at 14 call sites, so a change to the dashboard's
 * card treatment is a one-line edit.
 *
 * Two padding sizes because that is all the dashboard uses: the default
 * `p-4 sm:p-5`, and the tighter `p-4` the stat tiles want so four of them fit
 * across a phone. Anything else (`overflow-hidden`, layout classes) rides in
 * through `className`.
 */
export default function Card({
    padding = "default",
    className,
    children,
}: {
    padding?: "default" | "tight";
    className?: string;
    children: ReactNode;
}) {
    return (
        <div
            className={clsx(
                "rounded-lg bg-white shadow-sm dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10",
                padding === "tight" ? "p-4" : "p-4 sm:p-5",
                className,
            )}
        >
            {children}
        </div>
    );
}
