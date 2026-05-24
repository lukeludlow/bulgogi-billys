import { Button } from "@/components/catalyst-ui-kit/button.tsx";
import { useEffect, useState } from "react";
import { Link } from "@/components/catalyst-ui-kit/link.tsx";

export default function Home() {
    const images = [
        "/images/fries_h_screen_small.png",
        "/images/rice_h_screen_small.png",
        "/images/tacos_h_screen_small.png",
    ];

    const [currentIndex, setCurrentIndex] = useState(0);

    // ... inside your component
    useEffect(() => {
        const nextSlide = () => {
            setCurrentIndex((prev) =>
                prev === images.length - 1 ? 0 : prev + 1,
            );
        };
        const interval = setInterval(() => {
            nextSlide();
        }, 5000);

        // Cleanup: clear the interval if the component unmounts
        return () => clearInterval(interval);
    }, [currentIndex, images.length]);

    return (
        <div className="bg-white dark:bg-gray-900">
            <div className="relative isolate overflow-hidden pt-14">
                {/* Images Container */}
                <div
                    className="absolute -z-20 inset-0 flex transition-transform duration-700 ease-in-out size-full"
                    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                    {images.map((src, index) => (
                        <img
                            key={index}
                            src={src}
                            alt="carousel"
                            className="size-full object-cover shrink-0"
                        />
                    ))}
                </div>

                {/* Indicator Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, i) => (
                        <div
                            key={i}
                            className={`size-2 transition-colors ${i === currentIndex ? "bg-white" : "bg-white/30"} rounded-lg`}
                        />
                    ))}
                </div>
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
                            <p className="mt-8 text-lg font-medium text-pretty text-gray-900 sm:text-xl/8 dark:text-gray-100">
                                <Link
                                    href={
                                        "https://www.tiktok.com/@davidspov_/video/7568650366590504247"
                                    }
                                >
                                    As seen on TikTok!
                                </Link>
                            </p>
                            <div className="mt-10 flex items-center justify-center gap-x-6">
                                <Button href={"/menu"} color={"orange"}>
                                    Menu
                                </Button>
                                <Button href={"/about"} outline>
                                    About
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
        </div>
    );
}
