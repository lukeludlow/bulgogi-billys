import clsx from "clsx";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import { CATERING_FAQ } from "@/site/catering/faq.ts";
import CateringSection from "@/site/pages/catering/CateringSection.tsx";
import { CARD_CLASS } from "@/site/pages/catering/cardStyles.ts";

/** Native <details> disclosures: keyboard-accessible, and crawlable when prerendered. */
export default function CateringFaq() {
    return (
        <CateringSection id="faq" title="Questions we hear a lot">
            <div
                className={clsx(
                    CARD_CLASS,
                    "divide-y divide-zinc-950/5 dark:divide-white/10",
                )}
            >
                {CATERING_FAQ.map(({ question, answer }) => (
                    <details key={question} className="group px-4 py-3 sm:px-6">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-1 text-base/6 font-medium text-zinc-950 dark:text-white [&::-webkit-details-marker]:hidden">
                            {question}
                            <ChevronDownIcon
                                aria-hidden="true"
                                className="size-5 shrink-0 fill-zinc-500 transition-transform group-open:rotate-180 dark:fill-zinc-400"
                            />
                        </summary>
                        <Text className="mt-2 pb-1">{answer}</Text>
                    </details>
                ))}
            </div>
        </CateringSection>
    );
}
