import { Heading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Divider } from "@/components/catalyst-ui-kit/divider.tsx";
import { Text } from "@/components/catalyst-ui-kit/text.tsx";
import { Link } from "@/components/catalyst-ui-kit/link.tsx";

export default function Schedule() {
    return (
        <div className={"flex flex-col gap-3 text-center"}>
            <Heading>Schedule</Heading>
            <Divider />
            <Text>
                Check Instagram to find out where Bulgogi Billy will be!
                Schedule and updates are posted weekly.
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
