import { Heading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Divider } from "@/components/catalyst-ui-kit/divider.tsx";
import { Text } from "@/components/catalyst-ui-kit/text";
import MenuItem from "@/pages/menu/MenuItem.tsx";
import { Button } from "@/components/catalyst-ui-kit/button.tsx";
import PageMeta from "@/components/PageMeta.tsx";

export default function Menu() {
    return (
        <div className={"flex flex-col gap-3"}>
            <PageMeta
                title="Menu | Bulgogi Billy's Korean Fusion"
                description="Bulgogi fries, tacos, and rice bowls made with flame-grilled ribeye or pork bulgogi. Serving The Woodlands, Conroe, and New Caney, TX every weekend."
            />
            <Heading className={"text-center md:text-2xl"}>Menu</Heading>
            <Text className={"text-center md:text-lg"}>
                What is "bulgogi?" Bulgogi literally means "fire meat" and is
                marinated ribeye beef using my Mom's own recipe.
            </Text>
            <Divider className={"hidden"} />
            <Button href={"/order-now"} color={"orange"}>
                Order
            </Button>
            <MenuItem
                name={"Bulgogi Fries"}
                image={"/images/fries_h_screen_small.png"}
                description={
                    "French fries topped with our signature bulgogi, shredded cheddar-jack cheese, Seoul sauce (our house aioli sauce with a little kick to it), Sriracha sauce, and sour cream. Recommended for first-timers!"
                }
            />
            <MenuItem
                name={"Bulgogi with Steamed Rice and Kimchi"}
                image={"/images/rice_h_screen_small.png"}
                description={
                    "Steamed white rice topped with our signature bulgogi and served with a side of kimchi (Korean spicy pickled cabbage)."
                }
            />
            <MenuItem
                name={"Bulgogi Tacos"}
                image={"/images/tacos_h_screen_small.png"}
                description={
                    "Our signature bulgogi served on a corn tortilla with kimchi (Korean spicy pickled cabbage), pickled red cabbage, Seoul sauce (our house aioli sauce with a little kick to it), Sriracha sauce, and shredded cheddar-jack cheese."
                }
            />
            <Button href={"/order-now"} color={"orange"} className={"mb-13"}>
                Order
            </Button>
        </div>
    );
}
