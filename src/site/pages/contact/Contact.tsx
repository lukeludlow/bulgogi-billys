import { Heading, Subheading } from "@/shared/catalyst-ui-kit/heading.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import { Link } from "@/shared/catalyst-ui-kit/link.tsx";
import InstagramIcon from "@/site/components/icons/InstagramIcon.tsx";
import EmailIcon from "@/site/components/icons/EmailIcon.tsx";
import FacebookIcon from "@/site/components/icons/FacebookIcon.tsx";
import ContactForm from "@/site/pages/contact/ContactForm.tsx";
import { Divider } from "@/shared/catalyst-ui-kit/divider.tsx";
import PageMeta from "@/shared/PageMeta.tsx";
import ResponsiveImage from "@/site/components/ResponsiveImage.tsx";
import { SITE_IMAGES } from "@/site/images.ts";
import {
    BUSINESS,
    EMAIL_HREF,
    PHONE_CALL_HREF,
    PHONE_TEXT_HREF,
} from "@/site/business.ts";
import { PhoneIcon } from "@heroicons/react/24/outline";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import { phoneClickHandlers } from "@/site/analytics.ts";

export default function Contact() {
    const { onCall, onText } = phoneClickHandlers("contact");

    return (
        <div className={"flex flex-col gap-3 text-center"}>
            <PageMeta
                title="Contact | Bulgogi Billy's"
                description="Call, text, email or message Bulgogi Billy's, the Korean Fusion food vendor serving The Woodlands, Conroe, New Caney and Greater Houston."
                path="/contact"
            />
            <Heading>Contact</Heading>
            <Divider />
            <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-xl bg-orange-50 p-6 dark:bg-orange-950/20">
                <Subheading className={"text-xl md:text-xl"}>
                    Planning an event?
                </Subheading>
                <Text className={"text-lg md:text-lg"}>
                    See catering packages, get an instant price estimate, and
                    send the details Billy needs to quote.
                </Text>
                <Button href="/catering" color="orange">
                    Catering &amp; events
                </Button>
            </div>
            <Text className={"text-lg md:text-lg"}>
                Anything else? Send us a message.
            </Text>
            <div>
                <ContactForm />
            </div>
            <div className={"flex flex-row justify-center gap-2 items-center"}>
                <PhoneIcon className="size-6 shrink-0 dark:text-white" />
                <Link
                    href={PHONE_CALL_HREF}
                    onClick={onCall}
                    className={"dark:text-white text-lg md:text-lg"}
                >
                    {BUSINESS.phone.display}
                </Link>
                <Text className={"text-lg md:text-lg"}>
                    (call or{" "}
                    <Link
                        href={PHONE_TEXT_HREF}
                        onClick={onText}
                        className={"underline"}
                    >
                        text
                    </Link>
                    )
                </Text>
            </div>
            <div className={"flex flex-row justify-center gap-2 items-center"}>
                <EmailIcon />
                <Link
                    href={EMAIL_HREF}
                    className={"dark:text-white text-lg md:text-lg"}
                >
                    {BUSINESS.email}
                </Link>
            </div>

            <div className={"flex flex-row justify-center gap-2 items-center"}>
                <InstagramIcon />
                <Link
                    href={BUSINESS.instagram.url}
                    className={"dark:text-white text-lg md:text-lg"}
                >
                    {BUSINESS.instagram.handle}
                </Link>
            </div>
            <div className={"flex flex-row justify-center gap-2 items-center"}>
                <FacebookIcon />
                <Link
                    href={BUSINESS.facebook.url}
                    className={"dark:text-white text-lg md:text-lg"}
                >
                    {BUSINESS.facebook.name}
                </Link>
            </div>
            <div className={"flex justify-center"}>
                <ResponsiveImage
                    image={SITE_IMAGES.socials}
                    sizes="360px"
                    className={"h-60 w-auto"}
                />
            </div>
        </div>
    );
}
