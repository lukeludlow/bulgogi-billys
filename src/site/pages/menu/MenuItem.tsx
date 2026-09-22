import { Heading } from "@/shared/catalyst-ui-kit/heading.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text";
import { Divider } from "@/shared/catalyst-ui-kit/divider.tsx";
import MostPopularBadge from "@/site/pages/menu/MostPopularBadge.tsx";
import ResponsiveImage from "@/site/components/ResponsiveImage.tsx";
import type { SiteImage } from "@/site/images.ts";

interface Props {
    name: string;
    image: SiteImage;
    description: string;
    /** Set on the first item, whose photo is the menu page's largest above-the-fold image. */
    priority?: boolean;
}

// Full card width on phones, half of it beside the text from `sm` up. Both
// layouts below share this, so the browser picks one file for both copies.
const IMAGE_SIZES = "(min-width: 640px) 50vw, 100vw";

export default function MenuItem({
    name,
    image,
    description,
    priority = false,
}: Props) {
    return (
        <>
            <div className="sm:hidden divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
                <div className="px-4 py-5 sm:px-6">
                    <div className={"flex flex-row justify-between"}>
                        <Heading>{name}</Heading>
                        {name === "Bulgogi Fries" && <MostPopularBadge />}
                    </div>
                </div>
                <div className="px-4 py-5 sm:p-6">
                    <ResponsiveImage
                        image={image}
                        sizes={IMAGE_SIZES}
                        priority={priority}
                    />
                </div>
                <div className="px-4 py-4 sm:px-6">
                    <Text>{description}</Text>
                </div>
            </div>
            <div className="max-sm:hidden divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
                <div className={"grid grid-cols-2"}>
                    <div className="px-4 py-5 sm:p-6">
                        <ResponsiveImage
                            image={image}
                            sizes={IMAGE_SIZES}
                            priority={priority}
                        />
                    </div>
                    <div className={"flex flex-col"}>
                        <div className="px-4 py-5 sm:px-6 flex flex-row items-center gap-2">
                            <Heading className={"md:text-2xl"}>{name}</Heading>
                            {name === "Bulgogi Fries" && <MostPopularBadge />}
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
