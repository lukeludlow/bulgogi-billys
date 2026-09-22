import { afterEach, beforeEach } from "vitest";

/**
 * Keeps tapped tel:/sms: links from handing off to the OS during a test file,
 * while still letting their onClick (the analytics event) run.
 *
 * The block listens in the bubble phase on document — after React's root
 * listener has run the link's onClick, before the browser's default action.
 * Blocking in the capture phase would silently skip that onClick: Headless
 * UI's merged handlers ignore events that are already defaultPrevented.
 */
export function blockPhoneLinkNavigation(): void {
    function block(event: MouseEvent) {
        const target = event.target as Element | null;
        if (target?.closest('a[href^="tel:"], a[href^="sms:"]')) {
            event.preventDefault();
        }
    }
    beforeEach(() => document.addEventListener("click", block));
    afterEach(() => document.removeEventListener("click", block));
}
