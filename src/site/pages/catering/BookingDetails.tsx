import clsx from "clsx";
import { Subheading } from "@/shared/catalyst-ui-kit/heading.tsx";
import {
    CATERING_PRICING,
    FREE_TRAVEL_MILES,
    MAX_TRAVEL_MILES,
} from "@/site/catering/pricing.ts";
import { CARD_CLASS } from "@/site/pages/catering/cardStyles.ts";

const DEPOSIT_PERCENT = Math.round(CATERING_PRICING.depositShare * 100);

const PRICE_FACTORS = [
    "Menu choices and add-ons",
    "Headcount",
    `Day and time — on-site events have a higher minimum ${CATERING_PRICING.days.weekend}`,
    "Service hours for on-site events",
    `Travel — free within ${FREE_TRAVEL_MILES} miles of The Woodlands and Conroe, quoted up to ${MAX_TRAVEL_MILES} miles`,
];

const BOOKING_STEPS = [
    "Send an inquiry. We reply with a quote within 24 hours.",
    `A ${DEPOSIT_PERCENT}% deposit holds your date. It comes as a Square Invoice you can pay online.`,
    "Your final headcount is due 7 days before the event.",
    "The balance is due 3 days before the event.",
    "Cancellation terms are spelled out in plain language in your quote.",
];

const LIST_TEXT = "text-base/6 text-zinc-600 sm:text-sm/6 dark:text-zinc-300";

/** "What affects your price" and "How booking works" (§3.1 items 5–6). */
export default function BookingDetails() {
    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <section
                aria-labelledby="price-factors-heading"
                className={clsx(CARD_CLASS, "flex flex-col gap-3 p-4 sm:p-6")}
            >
                <Subheading
                    id="price-factors-heading"
                    className="text-lg sm:text-lg"
                >
                    What affects your price
                </Subheading>
                <ul className={clsx(LIST_TEXT, "list-disc space-y-2 pl-5")}>
                    {PRICE_FACTORS.map((factor) => (
                        <li key={factor}>{factor}</li>
                    ))}
                </ul>
            </section>
            <section
                aria-labelledby="booking-steps-heading"
                className={clsx(CARD_CLASS, "flex flex-col gap-3 p-4 sm:p-6")}
            >
                <Subheading
                    id="booking-steps-heading"
                    className="text-lg sm:text-lg"
                >
                    How booking works
                </Subheading>
                <ol className={clsx(LIST_TEXT, "list-decimal space-y-2 pl-5")}>
                    {BOOKING_STEPS.map((step) => (
                        <li key={step}>{step}</li>
                    ))}
                </ol>
            </section>
        </div>
    );
}
