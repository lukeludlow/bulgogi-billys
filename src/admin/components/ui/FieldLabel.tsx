import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * The caption above a dashboard input. Deliberately not Catalyst's
 * `Field`/`Label`: those render a different type scale and spacing, so adopting
 * them would be a visual change rather than a consolidation. This is the class
 * string the dashboard already uses, in one place.
 *
 * Most callers label an input that carries its own `aria-label`, so `htmlFor`
 * is optional.
 */
export default function FieldLabel({
    htmlFor,
    className,
    children,
}: {
    htmlFor?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <label
            htmlFor={htmlFor}
            className={clsx(
                "text-sm font-medium text-zinc-700 dark:text-zinc-300",
                className,
            )}
        >
            {children}
        </label>
    );
}
