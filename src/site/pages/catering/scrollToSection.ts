/**
 * Scrolls a page section into view and moves keyboard focus into it. The
 * catering CTAs use this instead of hash links: Catalyst's Link routes every
 * href through react-router, which changes the URL but doesn't scroll.
 */
export function scrollToSection(id: string, focusSelector?: string): void {
    const section = document.getElementById(id);
    if (!section) return;

    const reduceMotion = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
    ).matches;
    section.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
    });

    const target = focusSelector
        ? section.querySelector<HTMLElement>(focusSelector)
        : section;
    target?.focus({ preventScroll: true });
}
