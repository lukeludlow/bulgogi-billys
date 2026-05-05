import { Heading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Divider } from "@/components/catalyst-ui-kit/divider.tsx";
import MenuItem from "@/pages/menu/MenuItem.tsx";

export default function Menu() {
    return (
        <div className={"flex flex-col gap-3"}>
            <Heading>Menu</Heading>
            <Divider />
            <MenuItem
                name={"Bulgogi Fries"}
                image={"src/assets/fries_h_screen_small.png"}
                description={
                    "Bulgogi Billy's signature recipe sits atop crispy fries with delicious toppings. Recommended for first-timers!"
                }
            />
            <MenuItem
                name={"Bulgogi with Steamed Rice and Kimchi"}
                image={"src/assets/rice_h_screen_small.png"}
                description={
                    "A Korean classic. Try the Kimchi — You'll love it!"
                }
            />
            <MenuItem
                name={"Bulgogi Tacos"}
                image={"src/assets/tacos_h_screen_small.png"}
                description={"A match made in heaven."}
            />
        </div>
    );
}
