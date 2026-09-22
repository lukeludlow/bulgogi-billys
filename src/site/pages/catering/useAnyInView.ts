import { useEffect, useState } from "react";

/**
 * True while any element matching one of the selectors is on screen. Starts
 * false, so server-rendered markup and the first client render agree.
 */
export function useAnyInView(selectors: readonly string[]): boolean {
    const [inView, setInView] = useState(false);
    const key = selectors.join(",");

    useEffect(() => {
        if (typeof IntersectionObserver === "undefined") return;
        const targets = Array.from(document.querySelectorAll(key));
        if (targets.length === 0) return;

        const visible = new Set<Element>();
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) visible.add(entry.target);
                else visible.delete(entry.target);
            }
            setInView(visible.size > 0);
        });
        targets.forEach((target) => observer.observe(target));
        return () => observer.disconnect();
    }, [key]);

    return inView;
}
