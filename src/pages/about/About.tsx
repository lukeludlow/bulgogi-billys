import { Heading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Divider } from "@/components/catalyst-ui-kit/divider.tsx";

export default function About() {
    return (
        <div className={"flex flex-col text-center gap-3"}>
            <Heading>About</Heading>
            <Divider />
        </div>
    );
}
