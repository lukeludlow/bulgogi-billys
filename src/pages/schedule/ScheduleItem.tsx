import { Text, TextLink } from "@/components/catalyst-ui-kit/text.tsx";
import { Subheading } from "@/components/catalyst-ui-kit/heading.tsx";

interface Props {
    days: string;
    place: string;
    time: string;
    address: string;
    mapsLink: string;
    placeLink: string;
}

export default function ScheduleItem({
    days,
    place,
    time,
    address,
    mapsLink,
    placeLink,
}: Props) {
    return (
        <div className={"flex flex-col"}>
            <Subheading className={"text-xl md:text-xl"}>{days}</Subheading>
            <TextLink href={placeLink} className={"text-lg md:text-lg"}>
                {place}
            </TextLink>
            <Text className={"text-lg md:text-lg"}>{time}</Text>
            <TextLink href={mapsLink} className={"text-lg md:text-lg"}>
                {address}
            </TextLink>
        </div>
    );
}
