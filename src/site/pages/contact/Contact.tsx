import { Heading, Subheading } from "@/shared/catalyst-ui-kit/heading.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import { Link } from "@/shared/catalyst-ui-kit/link.tsx";
import InstagramIcon from "@/site/components/icons/InstagramIcon.tsx";
import EmailIcon from "@/site/components/icons/EmailIcon.tsx";
import FacebookIcon from "@/site/components/icons/FacebookIcon.tsx";
import ContactForm from "@/site/pages/contact/ContactForm.tsx";
import { Divider } from "@/shared/catalyst-ui-kit/divider.tsx";
import PageMeta from "@/shared/PageMeta.tsx";

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
                <EmailIcon />
                <Link
                    href={"mailto:bulgogibillys@gmail.com"}
                    className={"dark:text-white text-lg md:text-lg"}
                >
                    bulgogibillys@gmail.com
                </Link>
            </div>

            <div className={"flex flex-row justify-center gap-2 items-center"}>
                <InstagramIcon />
                <Link
                    href={"https://www.instagram.com/bulgogibillys/"}
                    className={"dark:text-white text-lg md:text-lg"}
                >
                    @bulgogibillys
                </Link>
            </div>
            <div className={"flex flex-row justify-center gap-2 items-center"}>
                <FacebookIcon />
                <Link
                    href={
                        "https://www.facebook.com/p/Bulgogi-Billys-LLC-61560725494736/"
                    }
                    className={"dark:text-white text-lg md:text-lg"}
                >
                    Bulgogi Billy's LLC
                </Link>
            </div>
            <div className={"flex justify-center"}>
                <img
                    src={"/images/bulgogi-billys-socials.png"}
                    className={"h-60"}
                    alt={"bulgogi-billys-socials"}
                />
            </div>
        </div>
    );
}
