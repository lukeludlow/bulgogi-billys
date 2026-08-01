import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import { Subheading } from "@/shared/catalyst-ui-kit/heading.tsx";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
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
        <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
            <div className="flex items-center justify-between gap-4 px-6 py-4 bg-orange-50 dark:bg-orange-950/20 border-b border-orange-100 dark:border-orange-900/30">
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <CalendarIcon className="size-5 shrink-0" />
                    <Subheading className="text-xl md:text-2xl font-bold text-orange-700 dark:text-orange-400">
                        {days}
                    </Subheading>
                </div>
                <Text className="text-base font-semibold text-orange-700 dark:text-orange-400 whitespace-nowrap">
                    {time}
                </Text>
            </div>

            <div className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <Subheading className="text-lg md:text-xl font-bold">
                        {place}
                    </Subheading>
                    <div className="flex items-start gap-1.5">
                        <MapPinIcon className="size-5 shrink-0 mt-0.5 text-zinc-400 dark:text-zinc-500" />
                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                            {address}
                        </Text>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button href={mapsLink} color="orange">
                        Get Directions
                    </Button>
                    <Button href={placeLink} outline>
                        Visit Website
                    </Button>
                </div>
            </div>
        </div>
    );
}
