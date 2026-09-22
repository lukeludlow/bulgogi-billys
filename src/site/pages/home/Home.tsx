import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import About from "@/site/pages/about/About.tsx";
import { TextLink } from "@/shared/catalyst-ui-kit/text.tsx";
import PageMeta from "@/shared/PageMeta.tsx";
import RestaurantStructuredData from "@/site/components/RestaurantStructuredData.tsx";
import ResponsiveImage from "@/site/components/ResponsiveImage.tsx";
import { SITE_IMAGES } from "@/site/images.ts";
import { VIRAL_VIDEO } from "@/site/business.ts";

// Outline buttons are transparent; over the hero photo they need a backing.
const HERO_OUTLINE_BUTTON =
    "bg-white/85 backdrop-blur-sm data-hover:bg-white dark:bg-zinc-900/75 dark:data-hover:bg-zinc-900";

export default function Home() {
    return (
        <div className="bg-white dark:bg-zinc-900">
            <PageMeta
                title="Bulgogi Billy's | Korean Fusion Food Truck – Houston, TX"
                description="Bulgogi Billy's serves Korean-American fusion food every weekend at farmers markets in The Woodlands, Conroe, and New Caney, TX. Try our signature bulgogi fries, tacos, and rice bowls!"
                path="/"
            />
            <RestaurantStructuredData />
            <div className="relative isolate overflow-hidden pt-14">
                <ResponsiveImage
                    image={SITE_IMAGES.bulgogiFries}
                    sizes="100vw"
                    priority
                    className="absolute inset-0 -z-20 size-full object-cover"
                />
                <div className="absolute inset-0 -z-15 bg-white/20 dark:bg-black/40"></div>
                <div
                    aria-hidden="true"
                    className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
                >
                    <div
                        style={{
                            clipPath:
                                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
                        }}
                        className="relative left-[calc(50%-11rem)] aspect-1155/678 w-144.5 -translate-x-1/2 rotate-30 bg-linear-to-tr from-[orange] to-[red] opacity-20 sm:left-[calc(50%-30rem)] sm:w-288.75"
                    />
                </div>
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
                        <div className="text-center">
                            <h1 className="text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-7xl dark:text-white">
                                Seoul food, Texas style.
                            </h1>
                            <p className="mt-6 text-xl font-medium text-gray-800 sm:text-2xl dark:text-gray-100">
                                Korean Fusion in Greater Houston.
                            </p>
                            <div className={"mt-4"}>
                                <TextLink
                                    href={VIRAL_VIDEO.url}
                                    className={"text-lg md:text-lg"}
                                >
                                    As seen on TikTok!
                                </TextLink>
                            </div>
                            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-x-4">
                                <Button href={"/schedule"} color={"orange"}>
                                    This week's locations
                                </Button>
                                <Button
                                    href={"/menu"}
                                    outline
                                    className={HERO_OUTLINE_BUTTON}
                                >
                                    Menu
                                </Button>
                                <Button
                                    href={"/catering"}
                                    outline
                                    className={HERO_OUTLINE_BUTTON}
                                >
                                    Catering &amp; events
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
                >
                    <div
                        style={{
                            clipPath:
                                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
                        }}
                        className="relative left-[calc(50%+3rem)] aspect-1155/678 w-144.5 -translate-x-1/2 bg-linear-to-tr from-[orange] to-[red] opacity-20 sm:left-[calc(50%+36rem)] sm:w-288.75"
                    />
                </div>
            </div>
            <About />
        </div>
    );
}
