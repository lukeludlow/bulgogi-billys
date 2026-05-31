import { Heading, Subheading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Divider } from "@/components/catalyst-ui-kit/divider.tsx";
import { Text } from "@/components/catalyst-ui-kit/text.tsx";
import { Link } from "@/components/catalyst-ui-kit/link.tsx";
import InstagramIcon from "@/components/icons/InstagramIcon.tsx";
import FacebookIcon from "@/components/icons/FacebookIcon.tsx";
import ScheduleItem from "@/pages/schedule/ScheduleItem.tsx";

export default function Schedule() {
    return (
        <div className={"flex flex-col gap-3 text-center"}>
            <Heading>Schedule</Heading>
            <Divider />
            <Text className={"text-lg md:text-lg"}>
                Bulgogi Billy's is serving delicious Korean fusion every
                weekend. Here's where you can find us.
            </Text>
            <ScheduleItem
                days={"Saturdays"}
                place={"Grogan's Mill Farmer's Market"}
                time={"9am-12pm"}
                address={"7 Switchbud Pl, The Woodlands, TX 77380"}
                mapsLink={"https://maps.app.goo.gl/8wWytb9ojcdMv4d38"}
                placeLink={"https://www.grogansmill.org/fmabout"}
            />
            <ScheduleItem
                days={"1st and 3rd Sundays"}
                place={"New Caney Community Market"}
                time={"11am-3pm"}
                address={"21586 Market Place #200, New Caney, TX"}
                mapsLink={"https://maps.app.goo.gl/QganZZCBLv7AfqtH8"}
                placeLink={"https://www.newcaneymarket.com"}
            />
            <ScheduleItem
                days={"Other Sundays"}
                place={"Farmers Market at 1488"}
                time={"10am-2pm"}
                address={
                    "16051 Old Conroe Rd, Conroe, TX (Next to the Xscape Movie Theater)"
                }
                mapsLink={"https://maps.app.goo.gl/wXFQdr9vnM7CycVSA"}
                placeLink={"https://www.instagram.com/farmersmarketat1488/"}
            />
            <Divider />
            <div className={"pb-20"}>
                <Subheading className={"text-xl md:text-xl"}>
                    Check for updates
                </Subheading>
                <Text className={"text-lg md:text-lg"}>
                    For latest updates, check Instagram or Facebook to find out
                    where Bulgogi Billy will be!
                </Text>
                <div
                    className={
                        "flex flex-row justify-center gap-2 items-center"
                    }
                >
                    <InstagramIcon />
                    <Link
                        href={"https://www.instagram.com/bulgogibillys/"}
                        className={"dark:text-white text-lg md:text-lg"}
                    >
                        @bulgogibillys
                    </Link>
                </div>
                <div
                    className={
                        "flex flex-row justify-center gap-2 items-center"
                    }
                >
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
            </div>
        </div>
    );
}
