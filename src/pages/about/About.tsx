import { Heading, Subheading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Divider } from "@/components/catalyst-ui-kit/divider.tsx";
import { Text } from "@/components/catalyst-ui-kit/text.tsx";

export default function About() {
    const cardClass =
        "divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10";

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto px-4 py-6">
            {/* Header Section */}
            <div className="flex flex-col gap-3 text-center">
                <Heading className="md:text-2xl">About Us</Heading>
                <Divider />
            </div>

            {/* Our Story Card */}
            <div className={cardClass}>
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-6 flex flex-col gap-4 justify-center order-2 md:order-1">
                        <Text className="text-lg md:text-lg font-semibold text-orange-600 dark:text-orange-400">
                            Welcome to Bulgogi Billy’s, where we serve up Seoul
                            food, Texas style!
                        </Text>
                        <Text className="text-lg md:text-lg">
                            Our story starts with family. In 2023, Billy founded
                            Bulgogi Billy’s to share his Mom’s legendary, secret
                            recipe. After leaving North Korea to build a new
                            life in America, she brought with her a passion for
                            cooking that we now share with Lone Star State
                            foodies every single weekend.
                        </Text>
                    </div>
                    <div className="p-6 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/20 order-1 md:order-2">
                        <img
                            src="/images/billy-and-mom.jpeg"
                            className="rounded-lg object-cover h-auto w-auto shadow-sm"
                            alt="billy-and-mom"
                        />
                    </div>
                </div>
            </div>

            {/* Menu Twist Section */}
            <div className={cardClass}>
                <div className="p-6 flex flex-col gap-4">
                    <Subheading className="text-xl md:text-xl font-bold">
                        What exactly is bulgogi?
                    </Subheading>
                    <Text className="text-lg md:text-lg">
                        It literally translates to "fire meat." We take premium
                        ribeye beef or tender pork, marinate it in Mom’s
                        authentic blend, and flame-grill it to absolute
                        perfection.
                    </Text>
                    <Text className="text-lg md:text-lg">
                        Because we’re in Texas, we couldn't resist putting a
                        local, fusion twist on tradition. Whether you are
                        craving comfort food or looking for a bold new flavor
                        profile, our menu hits the spot:
                    </Text>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-white/5">
                            <Heading className="text-base mb-1">
                                Bulgogi Fries
                            </Heading>
                            <Text className="text-sm">
                                A mountain of crispy French fries piled high
                                with your choice of beef or pork bulgogi, melted
                                cheddar-jack cheese, sour cream, Sriracha, and
                                our signature Seoul Sauce.
                            </Text>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-white/5">
                            <Heading className="text-base mb-1">
                                Bulgogi Tacos
                            </Heading>
                            <Text className="text-sm">
                                Authentic bulgogi served on a corn tortilla,
                                topped with a bright crunch of kimchi and
                                pickled red cabbage, cheddar-jack cheese,
                                Sriracha, and Seoul Sauce.
                            </Text>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-white/5">
                            <Heading className="text-base mb-1">
                                Classic Rice Bowl
                            </Heading>
                            <Text className="text-sm">
                                Keep it classic with a comforting bowl of
                                steamed white rice, our signature meat, and a
                                side of traditional, spicy Korean pickled
                                cabbage.
                            </Text>
                        </div>
                    </div>
                </div>
            </div>

            {/* Schedule Section */}
            <div className={cardClass}>
                <div className="p-6 flex flex-col gap-4">
                    <Subheading className="text-xl md:text-xl font-bold">
                        Catch Us on the Road
                    </Subheading>
                    <Text className="text-lg md:text-lg">
                        You might have already seen us on your feed! Bulgogi
                        Billy’s went viral after a customer caught Billy working
                        his magic on a hidden smart-glasses camera, racking up
                        over 24 million views on TikTok and Instagram.
                    </Text>
                    <Text className="text-lg md:text-lg">
                        But you don't have to watch us through a screen—come get
                        a taste in real life. We roll out every weekend across
                        the greater Houston area:
                    </Text>

                    <div className="divide-y divide-gray-100 dark:divide-white/5 border-t border-gray-100 dark:border-white/5 mt-2">
                        <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
                            <span className="font-semibold dark:text-white text-base">
                                Saturdays (9 AM – 1 PM)
                            </span>
                            <Text className="text-base">
                                Grogan's Mill Farmer's Market (7 Switchbud Pl,
                                The Woodlands, TX)
                            </Text>
                        </div>
                        <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
                            <span className="font-semibold dark:text-white text-base">
                                1st & 3rd Sundays (11 AM – 3 PM)
                            </span>
                            <Text className="text-base">
                                New Caney Community Market (21586 Market Place
                                #200, New Caney, TX)
                            </Text>
                        </div>
                        <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
                            <span className="font-semibold dark:text-white text-base">
                                Other Sundays (10 AM – 2 PM)
                            </span>
                            <Text className="text-base">
                                Farmers Market at 1488 (16051 Old Conroe Rd,
                                Conroe, TX — right next to the Xscape Movie
                                Theater)
                            </Text>
                        </div>
                    </div>

                    <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-100 dark:border-orange-900/30">
                        <Text className="text-sm font-medium text-orange-800 dark:text-orange-300">
                            <strong>Pro Tip:</strong> Schedules can change! Make
                            sure to follow us on Instagram and Facebook for our
                            latest location updates and pop-up alerts.
                        </Text>
                    </div>
                </div>
            </div>

            {/* Catering Section */}
            <div className={cardClass}>
                <div className="grid grid-cols-1 md:grid-cols-3">
                    <div className="p-6 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/20 md:col-span-1">
                        <img
                            src="/images/cartoon-billy.jpeg"
                            className="rounded-lg object-contain max-h-48"
                            alt="cartoon-billy"
                        />
                    </div>
                    <div className="p-6 flex flex-col gap-4 justify-center md:col-span-2">
                        <Subheading className="text-xl md:text-xl font-bold">
                            Bring the Fire to Your Next Event
                        </Subheading>
                        <Text className="text-lg md:text-lg">
                            From small backyard gatherings to massive
                            Texas-sized celebrations, Bulgogi Billy's brings the
                            flavor. We offer catering that your guests will be
                            talking about for weeks. Reach out today for custom
                            rates and availability!
                        </Text>
                    </div>
                </div>
            </div>
        </div>
    );
}
