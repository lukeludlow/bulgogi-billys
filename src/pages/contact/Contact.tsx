import { Heading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Divider } from "@/components/catalyst-ui-kit/divider.tsx";
import { Text } from "@/components/catalyst-ui-kit/text.tsx";
import { Link } from "@/components/catalyst-ui-kit/link.tsx";

export default function Contact() {
    return (
        <div className={"flex flex-col gap-3 text-center"}>
            <Heading>Contact</Heading>
            <Divider />
            <Text>
                Bulgogi Billy's business contact information can be found on
                Instagram.
            </Text>
            <Link
                href={"https://www.instagram.com/bulgogibillys/"}
                className={"dark:text-white"}
            >
                @bulgogibillys
            </Link>
        </div>
    );
}
