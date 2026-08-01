import { useEffect, useState } from "react";

/**
 * Tracks which of the given section ids is currently the most prominent one in
 * the viewport, for highlighting the matching sidebar link. Falls back to the
 * first id until an observation lands.
 */
export function useActiveSection(ids: string[]): string {
    const [active, setActive] = useState(ids[0] ?? "");

    // Join so the effect re-runs only when the set of ids actually changes.
    const key = ids.join("|");

    useEffect(() => {
        const sectionIds = key ? key.split("|") : [];
        const elements = sectionIds
            .map((id) => document.getElementById(id))
            .filter((el): el is HTMLElement => el !== null);
        if (elements.length === 0) return;

        // Track the ratio of each observed section; the top-most section with
        // the largest visible area wins.
        const ratios = new Map<string, number>();
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    ratios.set(entry.target.id, entry.intersectionRatio);
                }
                let best = "";
                let bestRatio = -1;
                for (const id of sectionIds) {
                    const ratio = ratios.get(id) ?? 0;
                    if (ratio > bestRatio) {
                        bestRatio = ratio;
                        best = id;
                    }
                }
                if (best) setActive(best);
            },
            {
                threshold: [0, 0.25, 0.5, 0.75, 1],
                rootMargin: "-80px 0px -55% 0px",
            },
        );

        for (const el of elements) observer.observe(el);
        return () => observer.disconnect();
    }, [key]);

    return active;
}
