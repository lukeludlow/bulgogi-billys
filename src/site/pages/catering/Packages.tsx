import { useId } from "react";
import clsx from "clsx";
import { CheckIcon } from "@heroicons/react/16/solid";
import { Badge } from "@/shared/catalyst-ui-kit/badge.tsx";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import { Subheading } from "@/shared/catalyst-ui-kit/heading.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import {
    CATERING_PACKAGES,
    CATERING_PRICING,
    estimateCateringQuote,
    formatEstimate,
    matchingPackage,
    packageDependsOnDay,
    packageInput,
    type CateringPackage,
    type EstimateInput,
} from "@/site/catering/pricing.ts";
import CateringSection from "@/site/pages/catering/CateringSection.tsx";
import { CARD_CLASS } from "@/site/pages/catering/cardStyles.ts";

interface Props {
    /**
     * The estimator's answers once the visitor has used it; the package they
     * fall into is selected and the rest dim. Null leaves every card plain.
     */
    estimate: EstimateInput | null;
    /** Loads the package into the estimator. */
    onChoose: (pkg: CateringPackage) => void;
}

/** Example ranges, priced by the estimator itself so the two always agree. */
export default function Packages({ estimate, onChoose }: Props) {
    const match = estimate && matchingPackage(estimate);
    return (
        <CateringSection
            title="Packages"
            intro="Where typical events land. Every quote is tailored to yours."
        >
            <ul className="grid gap-4 lg:grid-cols-3">
                {CATERING_PACKAGES.map((pkg) => (
                    <PackageCard
                        key={pkg.id}
                        pkg={pkg}
                        selected={estimate !== null && pkg === match}
                        dimmed={estimate !== null && pkg !== match}
                        onChoose={onChoose}
                    />
                ))}
            </ul>
        </CateringSection>
    );
}

interface CardProps {
    pkg: CateringPackage;
    selected: boolean;
    dimmed: boolean;
    onChoose: (pkg: CateringPackage) => void;
}

function PackageCard({ pkg, selected, dimmed, onChoose }: CardProps) {
    const headingId = useId();
    const estimate = estimateCateringQuote(packageInput(pkg));
    return (
        <li
            aria-labelledby={headingId}
            data-selected={selected || undefined}
            data-dimmed={dimmed || undefined}
            className={clsx(
                CARD_CLASS,
                "flex flex-col gap-3 p-4 transition-opacity motion-reduce:transition-none",
                "data-selected:ring-2 data-selected:ring-orange-500",
                "data-dimmed:opacity-60 data-dimmed:focus-within:opacity-100 data-dimmed:hover:opacity-100",
            )}
        >
            <div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Subheading
                        id={headingId}
                        level={3}
                        className="text-lg sm:text-lg"
                    >
                        {pkg.name}
                    </Subheading>
                    {selected && (
                        <Badge color="orange">Matches your estimate</Badge>
                    )}
                </div>
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
            <Text>{pkg.blurb}</Text>
            <ul
                aria-label="Includes"
                className="flex grow flex-col gap-2 text-base/6 text-zinc-600 sm:text-sm/6 dark:text-zinc-300"
            >
                {pkg.includes.map((item) => (
                    <li key={item} className="flex gap-2">
                        <CheckIcon
                            aria-hidden="true"
                            className="mt-1 size-4 shrink-0 fill-orange-600 sm:mt-0.5 dark:fill-orange-400"
                        />
                        {item}
                    </li>
                ))}
            </ul>
            <Button
                outline
                onClick={() => onChoose(pkg)}
                aria-label={`Start with this: ${pkg.name} package`}
            >
                Start with this
            </Button>
        </li>
    );
}
