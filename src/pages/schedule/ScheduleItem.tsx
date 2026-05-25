import { Text, TextLink } from "@/components/catalyst-ui-kit/text.tsx";
import { Subheading } from "@/components/catalyst-ui-kit/heading.tsx";
import { CalendarIcon, MapPinIcon } from "@heroicons/react/16/solid";

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
        <div className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10 md:px-15">
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2 text-orange-600 dark:text-orange-400">
                        <div className={"flex flex-row items-center gap-1"}>
                            <CalendarIcon className="size-5 shrink-0" />
                            <Subheading className="text-xl md:text-xl font-bold tracking-tight text-orange-600 dark:text-orange-400">
                                {days}
                            </Subheading>
                        </div>
                        <Text className="text-lg md:text-lg">{time}</Text>
                    </div>
                </div>

                <div className="flex flex-col gap-1 md:border-l md:border-gray-100 md:dark:border-white/5 md:pl-6">
                    <TextLink
                        href={placeLink}
                        className="text-lg font-semibold tracking-tight hover:text-orange-500"
                    >
                        {place}
                    </TextLink>
                    <div className="flex items-start gap-1.5 mt-1 justify-center">
                        <MapPinIcon className="size-6 shrink-0 mt-1 text-zinc-400 dark:text-zinc-500" />
                        <TextLink
                            href={mapsLink}
                            className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4 hover:text-orange-500"
                        >
                            {address}
                        </TextLink>
                    </div>
                </div>
            </div>
        </div>
    );
}
