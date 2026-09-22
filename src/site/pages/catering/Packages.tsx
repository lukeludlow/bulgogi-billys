import clsx from "clsx";
import { Badge } from "@/shared/catalyst-ui-kit/badge.tsx";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import { Subheading } from "@/shared/catalyst-ui-kit/heading.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import {
    CATERING_PACKAGES,
    CATERING_PRICING,
    estimateCateringQuote,
    formatEstimate,
    packageDependsOnDay,
    packageInput,
    type CateringPackage,
} from "@/site/catering/pricing.ts";
import CateringSection from "@/site/pages/catering/CateringSection.tsx";
import { CARD_CLASS } from "@/site/pages/catering/cardStyles.ts";

interface Props {
    /** Loads the package into the estimator. */
    onChoose: (pkg: CateringPackage) => void;
}

/** Example ranges, priced by the estimator itself so the two always agree. */
export default function Packages({ onChoose }: Props) {
    return (
        <CateringSection
            title="Packages"
            intro="Where typical events land. Every quote is tailored to yours."
        >
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {CATERING_PACKAGES.map((pkg) => {
                    const estimate = estimateCateringQuote(packageInput(pkg));
                    return (
                        <li
                            key={pkg.name}
                            className={clsx(
                                CARD_CLASS,
                                "flex flex-col gap-3 p-4",
                            )}
                        >
                            <div>
                                <Subheading
                                    level={3}
                                    className="text-lg sm:text-lg"
                                >
                                    {pkg.name}
                                </Subheading>
                                <Text>
                                    {pkg.guests} guests ·{" "}
                                    {CATERING_PRICING.styles[pkg.style].name}
                                </Text>
                            </div>
                            <p className="text-2xl/8 font-semibold text-zinc-950 dark:text-white">
                                {formatEstimate(estimate)}
                            </p>
                            {packageDependsOnDay(pkg) && (
                                <Badge color="zinc" className="self-start">
                                    {CATERING_PRICING.days[pkg.day]} pricing
                                </Badge>
                            )}
                            <Text className="grow">{pkg.blurb}</Text>
                            <Button
                                outline
                                onClick={() => onChoose(pkg)}
                                aria-label={`Start with this: ${pkg.name} package`}
                            >
                                Start with this
                            </Button>
                        </li>
                    );
                })}
            </ul>
        </CateringSection>
    );
}
