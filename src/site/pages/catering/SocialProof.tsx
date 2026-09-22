import clsx from "clsx";
import { PlayCircleIcon } from "@heroicons/react/20/solid";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import { Subheading } from "@/shared/catalyst-ui-kit/heading.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import { VIRAL_VIDEO } from "@/site/business.ts";
import { CARD_CLASS } from "@/site/pages/catering/cardStyles.ts";

/**
 * The viral video, credited to its creator. Testimonials join this section
 * once real, permitted quotes exist — never invented ones.
 */
export default function SocialProof() {
    return (
        <section
            aria-labelledby="social-proof-heading"
            className={clsx(
                CARD_CLASS,
                "flex flex-col items-center gap-3 bg-linear-to-br from-orange-50 to-white p-6 text-center dark:from-orange-950/30 dark:to-zinc-800/50",
            )}
        >
            <Subheading
                id="social-proof-heading"
                className="text-xl sm:text-2xl"
            >
                Yep, we're <em>that</em> bulgogi guy
            </Subheading>
            <Text className="max-w-xl text-base sm:text-base">
                A customer caught Billy at the grill on a smart-glasses camera,
                and the video passed {VIRAL_VIDEO.views} views. Bring that same
                grill to your event.
            </Text>
            <Button outline href={VIRAL_VIDEO.url}>
                <PlayCircleIcon data-slot="icon" />
                Watch the video on TikTok
            </Button>
            <Text className="text-sm">Video by {VIRAL_VIDEO.creator}</Text>
        </section>
    );
}
