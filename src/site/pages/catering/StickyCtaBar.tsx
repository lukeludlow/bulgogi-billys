import clsx from "clsx";
import {
    CalculatorIcon,
    ChatBubbleLeftEllipsisIcon,
    PhoneIcon,
} from "@heroicons/react/16/solid";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import { phoneClickHandlers } from "@/site/analytics.ts";
import { PHONE_CALL_HREF, PHONE_TEXT_HREF } from "@/site/business.ts";
import { useAnyInView } from "@/site/pages/catering/useAnyInView.ts";

// Where the same actions are already on screen, or where the bar would cover
// the form's submit button or the footer.
const COVERING_SECTIONS = [
    "#catering-hero",
    "#estimate",
    "#inquiry",
    "footer",
] as const;

/** Mobile-only bottom bar on /catering: estimate, call, text. */
export default function StickyCtaBar({
    onEstimate,
}: {
    onEstimate: () => void;
}) {
    const hidden = useAnyInView(COVERING_SECTIONS);
    const { onCall, onText } = phoneClickHandlers("catering_sticky");

    return (
        <div
            data-testid="sticky-cta-bar"
            inert={hidden}
            className={clsx(
                "fixed inset-x-0 bottom-0 z-20 border-t border-zinc-950/10 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-200 lg:hidden dark:border-white/10 dark:bg-zinc-900/95",
                hidden && "translate-y-full",
            )}
        >
            <div className="mx-auto flex max-w-md gap-3">
                <Button color="orange" className="flex-1" onClick={onEstimate}>
                    <CalculatorIcon data-slot="icon" />
                    Estimate
                </Button>
                <Button outline href={PHONE_CALL_HREF} onClick={onCall}>
                    <PhoneIcon data-slot="icon" />
                    Call
                </Button>
                <Button outline href={PHONE_TEXT_HREF} onClick={onText}>
                    <ChatBubbleLeftEllipsisIcon data-slot="icon" />
                    Text
                </Button>
            </div>
        </div>
    );
}
