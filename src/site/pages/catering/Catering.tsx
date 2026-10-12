import { useRef, useState } from "react";
import {
    CalculatorIcon,
    ChatBubbleLeftEllipsisIcon,
    PhoneIcon,
} from "@heroicons/react/16/solid";
import { Badge } from "@/shared/catalyst-ui-kit/badge.tsx";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import PageMeta from "@/shared/PageMeta.tsx";
import ResponsiveImage from "@/site/components/ResponsiveImage.tsx";
import { phoneClickHandlers, trackSiteEvent } from "@/site/analytics.ts";
import {
    PHONE_CALL_HREF,
    PHONE_TEXT_HREF,
    VIRAL_VIDEO,
} from "@/site/business.ts";
import {
    DEFAULT_ESTIMATE_INPUT,
    packageInput,
    perPersonPrice,
    type EstimateInput,
} from "@/site/catering/pricing.ts";
import { SITE_IMAGES } from "@/site/images.ts";
import BookingDetails from "@/site/pages/catering/BookingDetails.tsx";
import CateringFaq from "@/site/pages/catering/CateringFaq.tsx";
import CateringInquiryForm from "@/site/pages/catering/CateringInquiryForm.tsx";
import Estimator from "@/site/pages/catering/Estimator.tsx";
import Packages from "@/site/pages/catering/Packages.tsx";
import ServiceStyles from "@/site/pages/catering/ServiceStyles.tsx";
import SocialProof from "@/site/pages/catering/SocialProof.tsx";
import StickyCtaBar from "@/site/pages/catering/StickyCtaBar.tsx";
import { scrollToSection } from "@/site/pages/catering/scrollToSection.ts";

const goToEstimate = () => scrollToSection("estimate");
const goToInquiry = () => scrollToSection("inquiry", 'input[name="name"]');

/**
 * /catering — the page that turns catering interest into qualified inquiries
 * (WEBSITE_REVENUE_PLAN.md §3): prices shown openly enough to set
 * expectations, with Billy still quoting every event.
 */
export default function Catering() {
    // One input shared by the estimator and the inquiry form.
    const [estimateInput, setEstimateInput] = useState<EstimateInput>(
        DEFAULT_ESTIMATE_INPUT,
    );
    // The packages follow the estimate only once the visitor has used it.
    const [estimateUsed, setEstimateUsed] = useState(false);
    const estimateTracked = useRef(false);
    const heroPhone = phoneClickHandlers("catering_hero");

    function changeEstimate(next: EstimateInput) {
        setEstimateInput(next);
        setEstimateUsed(true);
        if (!estimateTracked.current) {
            estimateTracked.current = true;
            trackSiteEvent("catering_estimate_used", { style: next.style });
        }
    }

    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-6 sm:gap-16 sm:py-10">
            <PageMeta
                title="Catering | Bulgogi Billy's Korean Fusion – The Woodlands & Houston"
                description={`Korean Fusion catering for offices, parties and events across The Woodlands, Conroe and Greater Houston. Drop-off from ${perPersonPrice("dropoff")}, on-site tent service from ${perPersonPrice("onsite")}. Get an instant estimate.`}
                path="/catering"
            />

            <section
                id="catering-hero"
                aria-labelledby="catering-hero-heading"
                className="grid items-center gap-8 lg:grid-cols-2"
            >
                <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
                    <Badge color="orange">Catering &amp; events</Badge>
                    <h1
                        id="catering-hero-heading"
                        className="text-3xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-5xl dark:text-white"
                    >
                        Korean Fusion catering for Houston-area offices, parties
                        &amp; events
                    </h1>
                    <Text className="text-lg sm:text-lg">
                        Mom's beef bulgogi, served your way: trays dropped off
                        for the office, or Billy's tent grilling on site.
                        Drop-off from {perPersonPrice("dropoff")}, on-site from{" "}
                        {perPersonPrice("onsite")}.
                    </Text>
                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                        <Button
                            color="orange"
                            onClick={goToEstimate}
                            className="whitespace-nowrap"
                        >
                            <CalculatorIcon data-slot="icon" />
                            Get a price estimate
                        </Button>
                        <div className="flex gap-3">
                            <Button
                                outline
                                href={PHONE_CALL_HREF}
                                onClick={heroPhone.onCall}
                                className="flex-1 whitespace-nowrap"
                            >
                                <PhoneIcon data-slot="icon" />
                                Call Billy
                            </Button>
                            <Button
                                outline
                                href={PHONE_TEXT_HREF}
                                onClick={heroPhone.onText}
                                className="flex-1 whitespace-nowrap"
                            >
                                <ChatBubbleLeftEllipsisIcon data-slot="icon" />
                                Text Billy
                            </Button>
                        </div>
                    </div>
                    <Text className="text-sm">
                        {VIRAL_VIDEO.views} views on TikTok • Mom's recipe since
                        2023 • We reply within 24 hours
                    </Text>
                </div>
                <ResponsiveImage
                    image={SITE_IMAGES.bulgogiTacos}
                    sizes="(min-width: 1024px) 30rem, 100vw"
                    priority
                    className="h-auto w-full rounded-lg shadow-sm"
                />
            </section>

            <ServiceStyles />
            <Packages
                estimate={estimateUsed ? estimateInput : null}
                onChoose={(pkg) => {
                    changeEstimate(packageInput(pkg));
                    goToEstimate();
                }}
            />
            <Estimator
                value={estimateInput}
                onChange={changeEstimate}
                onRequestQuote={goToInquiry}
            />
            <BookingDetails />
            <SocialProof />
            <CateringFaq />
            <CateringInquiryForm
                estimateInput={estimateInput}
                onEstimateInputChange={setEstimateInput}
            />
            <StickyCtaBar onEstimate={goToEstimate} />
        </div>
    );
}
