import clsx from "clsx";
import { Subheading } from "@/shared/catalyst-ui-kit/heading.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import ResponsiveImage from "@/site/components/ResponsiveImage.tsx";
import {
    CATERING_PRICING,
    SERVICE_STYLE_IDS,
    stylePriceLine,
    type ServiceStyleId,
} from "@/site/catering/pricing.ts";
import { SITE_IMAGES, type SiteImage } from "@/site/images.ts";
import CateringSection from "@/site/pages/catering/CateringSection.tsx";
import { CARD_CLASS } from "@/site/pages/catering/cardStyles.ts";

const STYLE_PHOTOS: Record<ServiceStyleId, SiteImage> = {
    dropoff: SITE_IMAGES.bulgogiRice,
    onsite: SITE_IMAGES.bulgogiFries,
    popup: SITE_IMAGES.bulgogiTacos,
};

export default function ServiceStyles() {
    return (
        <CateringSection
            title="Three ways to book"
            intro="From a tray drop-off for the office to the full tent at your party."
        >
            <ul className="grid gap-4 sm:grid-cols-3">
                {SERVICE_STYLE_IDS.map((id) => {
                    const style = CATERING_PRICING.styles[id];
                    return (
                        <li
                            key={id}
                            className={clsx(CARD_CLASS, "flex flex-col")}
                        >
                            <ResponsiveImage
                                image={STYLE_PHOTOS[id]}
                                sizes="(min-width: 640px) 33vw, 100vw"
                                className="h-auto w-full"
                            />
                            <div className="flex flex-col gap-2 p-4">
                                <Subheading
                                    level={3}
                                    className="text-lg sm:text-lg"
                                >
                                    {style.name}
                                </Subheading>
                                <p className="text-base/6 font-semibold text-orange-700 sm:text-sm/6 dark:text-orange-400">
                                    {stylePriceLine(id)}
                                </p>
                                <Text>{style.summary}</Text>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </CateringSection>
    );
}
