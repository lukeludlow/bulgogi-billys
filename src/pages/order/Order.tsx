import { Heading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Divider } from "@/components/catalyst-ui-kit/divider.tsx";
import { Button } from "@/components/catalyst-ui-kit/button.tsx";

export default function Order() {
    return (
        <div className={"flex flex-col gap-3 w-full justify-center"}>
            <Heading className={"text-center"}>Order Online</Heading>
            <Divider />
            <div className={"flex justify-center"}>
                <Button
                    href={"/order-now"}
                    color={"orange"}
                    className={"w-1/3"}
                >
                    Order Now
                </Button>
            </div>
        </div>
    );
}
