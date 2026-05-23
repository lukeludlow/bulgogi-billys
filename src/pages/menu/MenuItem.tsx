import { Heading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Text } from "@/components/catalyst-ui-kit/text";
import { Divider } from "@/components/catalyst-ui-kit/divider.tsx";

interface Props {
    name: string;
    image: string;
    description: string;
}

export default function MenuItem({ name, image, description }: Props) {
    return (
        <>
            <div className="sm:hidden divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
                <div className="px-4 py-5 sm:px-6">
                    <Heading>{name}</Heading>
                    <Text>(Beef or Pork)</Text>
                </div>
                <div className="px-4 py-5 sm:p-6">
                    <img src={image} alt={"Bulgogi Fries"} />
                </div>
                <div className="px-4 py-4 sm:px-6">
                    <Text>{description}</Text>
                </div>
            </div>
            <div className="max-sm:hidden divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
                <div className={"grid grid-cols-2"}>
                    <div className="px-4 py-5 sm:p-6">
                        <img src={image} alt={"Bulgogi Fries"} />
                    </div>
                    <div className={"flex flex-col"}>
                        <div className="px-4 py-5 sm:px-6 flex flex-row  items-center gap-2">
                            <Heading className={"md:text-2xl"}>{name}</Heading>
                            <Text>(Beef or Pork)</Text>
                        </div>
                        <Divider />
                        <div className="px-4 py-4 sm:px-6">
                            <Text className={"md:text-lg"}>{description}</Text>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
