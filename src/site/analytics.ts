import { track } from "@vercel/analytics";
import type { ServiceStyleId } from "@/site/catering/pricing.ts";

/** Where a call/text link sits, so the events show which placement converts. */
export type ContactPlacement =
    | "footer"
    | "contact"
    | "catering_hero"
    | "catering_sticky"
    | "catering_success";

/**
 * The custom events the public site sends to Vercel Analytics
 * (WEBSITE_REVENUE_PLAN.md §3.3 and the §5 KPIs). Property values must be
 * strings, numbers or booleans.
 */
type SiteEvents = {
    catering_estimate_used: { style: ServiceStyleId };
    catering_inquiry_submitted: { style: ServiceStyleId; guests: number };
    click_to_call: { placement: ContactPlacement };
    click_to_text: { placement: ContactPlacement };
};

export type SiteEventName = keyof SiteEvents;

export function trackSiteEvent<N extends SiteEventName>(
    name: N,
    props: SiteEvents[N],
): void {
    track(name, { ...props });
}

/** onClick handlers for a tel: / sms: link pair. */
export function phoneClickHandlers(placement: ContactPlacement) {
    return {
        onCall: () => trackSiteEvent("click_to_call", { placement }),
        onText: () => trackSiteEvent("click_to_text", { placement }),
    };
}
