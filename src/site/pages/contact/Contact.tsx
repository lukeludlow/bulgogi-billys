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

export default function Contact() {
    return (
        <div className={"flex flex-col gap-3 text-center"}>
            <PageMeta
                title="Contact & Catering | Bulgogi Billy's"
                description="Book Bulgogi Billy's for your next event. We offer Korean fusion catering for gatherings of any size across the greater Houston, TX area."
                path="/contact"
            />
            <Heading>Contact</Heading>
            <Divider />
            <Subheading className={"text-xl md:text-xl"}>
                Let us cater your next event!
            </Subheading>
            <Text className={"text-lg md:text-lg"}>
                From small gatherings to large celebrations, Bulgogi Billy's
                brings the flavor. Reach out today for rates and availability.
            </Text>
            <div>
                <ContactForm />
            </div>
            <div className={"flex flex-row justify-center gap-2 items-center"}>
                <PhoneIcon className="size-6 shrink-0 dark:text-white" />
                <Link
                    href={PHONE_CALL_HREF}
                    className={"dark:text-white text-lg md:text-lg"}
                >
                    {BUSINESS.phone.display}
                </Link>
                <Text className={"text-lg md:text-lg"}>
                    (call or{" "}
                    <Link href={PHONE_TEXT_HREF} className={"underline"}>
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
