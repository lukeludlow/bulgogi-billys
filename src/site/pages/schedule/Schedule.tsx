import { Heading, Subheading } from "@/shared/catalyst-ui-kit/heading.tsx";
import { Divider } from "@/shared/catalyst-ui-kit/divider.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import { Link } from "@/shared/catalyst-ui-kit/link.tsx";
import InstagramIcon from "@/site/components/icons/InstagramIcon.tsx";
import FacebookIcon from "@/site/components/icons/FacebookIcon.tsx";
import ScheduleItem from "@/site/pages/schedule/ScheduleItem.tsx";
import PageMeta from "@/shared/PageMeta.tsx";

export default function Schedule() {
    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto px-4 py-6">
            <PageMeta
                title="Find Us | Bulgogi Billy's – The Woodlands, Conroe & New Caney, TX"
                description="Find Bulgogi Billy's Korean fusion food truck at Grogan's Mill (The Woodlands), Farmers Market at 1488 (Conroe), and New Caney Community Market every weekend."
                path="/schedule"
            />

            <div className="flex flex-col gap-3 text-center">
                <Heading>Schedule</Heading>
                <Divider />
                <Text className="text-lg md:text-lg">
                    Bulgogi Billy's is serving delicious Korean fusion every
                    weekend. Here's where you can find us.
                </Text>
            </div>

            <div className="rounded-lg overflow-hidden shadow-sm">
                <img
                    src="/images/fries_h_screen_small.png"
                    alt="Bulgogi Billy's fries"
                    className="w-full h-40 object-cover object-center"
                />
            </div>

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

            <div className="p-6 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-100 dark:border-orange-900/30 flex flex-col gap-4 text-center">
                <Subheading className="text-xl font-bold text-orange-800 dark:text-orange-300">
                    Check for Updates
                </Subheading>
                <Text className="text-base text-orange-700 dark:text-orange-400">
                    Schedules can change! Follow us on Instagram or Facebook for
                    the latest location updates and pop-up alerts.
                </Text>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <div className="flex items-center justify-center gap-2">
                        <InstagramIcon />
                        <Link
                            href={"https://www.instagram.com/bulgogibillys/"}
                            className={
                                "dark:text-white font-semibold text-base"
                            }
                        >
                            @bulgogibillys
                        </Link>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <FacebookIcon />
                        <Link
                            href={
                                "https://www.facebook.com/p/Bulgogi-Billys-LLC-61560725494736/"
                            }
                            className={
                                "dark:text-white font-semibold text-base"
                            }
                        >
                            Bulgogi Billy's LLC
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
