import { Heading, Subheading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Divider } from "@/components/catalyst-ui-kit/divider.tsx";
import { Text } from "@/components/catalyst-ui-kit/text.tsx";

export default function About() {
    return (
        <div className="space-y-3">
            <div className="text-center">
                <Heading>About</Heading>
                <Divider className="mt-3" />
            </div>

            {/* Parent container allowing text flow */}
            <div className="text-center clearfix p-5 pb-20">
                <img
                    src="src/assets/billy-and-mom.jpeg"
                    className="h-80 block mx-auto mb-4 sm:inline sm:float-right sm:ml-4 sm:mr-0 sm:mb-2"
                    alt="billy-and-mom"
                />

                <Text className="text-lg md:text-lg">
                    Welcome to Bulgogi Billy’s, where we serve up Seoul food,
                    Texas style!
                </Text>

                <Text className="text-lg md:text-lg">
                    Our story starts with family. In 2023, Billy founded Bulgogi
                    Billy’s to share his Mom’s legendary, secret recipe. After
                    leaving North Korea to build a new life in America, she
                    brought with her a passion for cooking that we now share
                    with Lone Star State foodies every single weekend.
                </Text>

                <Text className="text-lg md:text-lg">
                    What exactly is bulgogi? It literally translates to "fire
                    meat." We take premium ribeye beef or tender pork, marinate
                    it in Mom’s authentic blend, and flame-grill it to absolute
                    perfection.
                </Text>

                <Text className="text-lg md:text-lg">
                    Because we’re in Texas, we couldn't resist putting a local,
                    fusion twist on tradition. Whether you are craving comfort
                    food or looking for a bold new flavor profile, our menu hits
                    the spot:
                </Text>

                <ul>
                    <li>
                        <Text className="text-lg md:text-lg">
                            Bulgogi Fries: A mountain of crispy French fries
                            piled high with your choice of beef or pork bulgogi,
                            melted cheddar-jack cheese, sour cream, Sriracha,
                            and our signature Seoul Sauce—a house-made aioli
                            with a Texas-sized kick. (Our top recommendation for
                            first-timers!)
                        </Text>
                    </li>
                    <li>
                        <Text className="text-lg md:text-lg">
                            Bulgogi Tacos: The ultimate Korean-Texan handshake.
                            Authentic bulgogi served on a corn tortilla, topped
                            with a bright crunch of kimchi and pickled red
                            cabbage, cheddar-jack cheese, Sriracha, and Seoul
                            Sauce.
                        </Text>
                    </li>
                    <li>
                        <Text className="text-lg md:text-lg">
                            Bulgogi with Steamed Rice & Kimchi: Keep it classic
                            with a comforting bowl of steamed white rice, our
                            signature meat, and a side of traditional, spicy
                            Korean pickled cabbage.
                        </Text>
                    </li>
                </ul>

                <Subheading className="text-lg md:text-lg">
                    Catch Us on the Road
                </Subheading>

                <Text className="text-lg md:text-lg">
                    You might have already seen us on your feed! Bulgogi Billy’s
                    went viral after a customer caught Billy working his magic
                    on a hidden smart-glasses camera, racking up over 24 million
                    views on TikTok and Instagram.
                </Text>

                <Text className="text-lg md:text-lg">
                    But you don't have to watch us through a screen—come get a
                    taste in real life. We roll out every weekend across the
                    greater Houston area:
                </Text>

                <ul>
                    <li>
                        <Text className="text-lg md:text-lg">
                            Saturdays (9 AM – 1 PM): Grogan's Mill Farmer's
                            Market (7 Switchbud Pl, The Woodlands, TX)
                        </Text>
                    </li>
                    <li>
                        <Text className="text-lg md:text-lg">
                            1st & 3rd Sundays (11 AM – 3 PM): New Caney
                            Community Market (21586 Market Place #200, New
                            Caney, TX)
                        </Text>
                    </li>
                    <li>
                        <Text className="text-lg md:text-lg">
                            Other Sundays (10 AM – 2 PM): Farmers Market at 1488
                            (16051 Old Conroe Rd, Conroe, TX — right next to the
                            Xscape Movie Theater)
                        </Text>
                    </li>
                </ul>

                <Text className="text-lg md:text-lg">
                    Pro Tip: Schedules can change! Make sure to follow us on
                    Instagram and Facebook for our latest location updates and
                    pop-up alerts.
                </Text>

                <Subheading className="text-lg md:text-lg">
                    Bring the Fire to Your Next Event
                </Subheading>

                <Text className="text-lg md:text-lg">
                    From small backyard gatherings to massive Texas-sized
                    celebrations, Bulgogi Billy's brings the flavor. We offer
                    catering that your guests will be talking about for weeks.
                    Reach out today for custom rates and availability!
                </Text>

                <img
                    src="src/assets/cartoon-billy.jpeg"
                    className="h-80 float-left mr-4 my-2"
                    alt="cartoon-billy"
                />
            </div>
        </div>
    );
}
