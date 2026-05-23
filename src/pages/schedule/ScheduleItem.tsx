import { Text } from "@/components/catalyst-ui-kit/text.tsx";
import { Subheading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Link } from "@/components/catalyst-ui-kit/link.tsx";

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
            <Text className={"text-lg md:text-lg"}>
                <Link href={placeLink}>{place}</Link>
            </Text>
            <Text className={"text-lg md:text-lg"}>{time}</Text>
            <Link href={mapsLink}>
                <Text className={"text-lg md:text-lg"}>{address}</Text>
            </Link>
        </div>
    );
}
