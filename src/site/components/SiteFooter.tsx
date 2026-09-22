import {
    ChatBubbleLeftEllipsisIcon,
    EnvelopeIcon,
    PhoneIcon,
} from "@heroicons/react/16/solid";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import { Subheading } from "@/shared/catalyst-ui-kit/heading.tsx";
import { Link } from "@/shared/catalyst-ui-kit/link.tsx";
import { Text, TextLink } from "@/shared/catalyst-ui-kit/text.tsx";
import {
    BUSINESS,
    EMAIL_HREF,
    PHONE_CALL_HREF,
    PHONE_TEXT_HREF,
} from "@/site/business.ts";
import { NAV_ITEMS } from "@/site/navigation.ts";
import InstagramIcon from "@/site/components/icons/InstagramIcon.tsx";
import FacebookIcon from "@/site/components/icons/FacebookIcon.tsx";

const FOOTER_LINKS = NAV_ITEMS.filter(({ url }) => url !== "/");

/**
 * Site-wide footer: the phone number (tap to call or text) on every page,
 * since catering buyers — office managers, party planners — call or text
 * before they fill in a form.
 */
export default function SiteFooter() {
    return (
        <footer className="border-t border-zinc-950/5 bg-white px-6 py-10 dark:border-white/10 dark:bg-zinc-900">
            <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                    <Subheading className="text-lg sm:text-base">
                        {BUSINESS.name}
                    </Subheading>
                    <Text>Seoul food, Texas style.</Text>
                    <Text>
                        Korean Fusion catering & weekend markets —{" "}
                        {BUSINESS.serviceArea.join(" • ")}
                    </Text>
                </div>

                <div className="flex flex-col gap-3">
                    <Subheading className="text-lg sm:text-base">
                        Call or text
                    </Subheading>
                    <TextLink
                        href={PHONE_CALL_HREF}
                        className="text-lg font-semibold"
                    >
                        {BUSINESS.phone.display}
                    </TextLink>
                    <div className="flex gap-3">
                        <Button href={PHONE_CALL_HREF} color="orange">
                            <PhoneIcon data-slot="icon" />
                            Call
                        </Button>
                        <Button href={PHONE_TEXT_HREF} outline>
                            <ChatBubbleLeftEllipsisIcon data-slot="icon" />
                            Text
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <EnvelopeIcon className="size-4 shrink-0 fill-zinc-500 dark:fill-zinc-400" />
                        <TextLink href={EMAIL_HREF} className="text-sm">
                            {BUSINESS.email}
                        </TextLink>
                    </div>
                </div>

                <nav aria-label="Footer" className="flex flex-col gap-3">
                    <Subheading className="text-lg sm:text-base">
                        Explore
                    </Subheading>
                    <ul className="flex flex-col gap-2">
                        {FOOTER_LINKS.map(({ label, url }) => (
                            <li key={label}>
                                <Link
                                    href={url}
                                    className="text-base text-zinc-600 hover:text-zinc-950 sm:text-sm dark:text-zinc-400 dark:hover:text-white"
                                >
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <div className="flex gap-4">
                        <Link
                            href={BUSINESS.instagram.url}
                            aria-label={`${BUSINESS.name} on Instagram`}
                        >
                            <InstagramIcon />
                        </Link>
                        <Link
                            href={BUSINESS.facebook.url}
                            aria-label={`${BUSINESS.name} on Facebook`}
                        >
                            <FacebookIcon />
                        </Link>
                    </div>
                </nav>
            </div>
            <Text className="mt-10 text-center text-sm">
                © {new Date().getFullYear()} {BUSINESS.legalName}
            </Text>
        </footer>
    );
}
