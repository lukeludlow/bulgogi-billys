import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import ResponsiveImage from "@/site/components/ResponsiveImage.tsx";
import { imageSrcSet, SITE_IMAGES } from "@/site/images.ts";

const fries = SITE_IMAGES.bulgogiFries;

test("renders the registry's WebP srcset, intrinsic size and alt text", async () => {
    const { getByRole } = await render(
        <ResponsiveImage image={fries} sizes="100vw" />,
    );
    const img = getByRole("img", { name: fries.alt });

    await expect
        .element(img)
        .toHaveAttribute("src", "/images/opt/bulgogi-fries-1024.webp");
    await expect.element(img).toHaveAttribute("srcset", imageSrcSet(fries));
    await expect.element(img).toHaveAttribute("sizes", "100vw");
    await expect.element(img).toHaveAttribute("width", "1024");
    await expect.element(img).toHaveAttribute("height", "683");
});

test("loads lazily by default", async () => {
    const { getByRole } = await render(
        <ResponsiveImage image={fries} sizes="100vw" />,
    );
    const img = getByRole("img", { name: fries.alt });

    await expect.element(img).toHaveAttribute("loading", "lazy");
    await expect.element(img).not.toHaveAttribute("fetchpriority");
});

test("a priority image loads eagerly at high fetch priority", async () => {
    const { getByRole } = await render(
        <ResponsiveImage image={fries} sizes="100vw" priority />,
    );
    const img = getByRole("img", { name: fries.alt });

    await expect.element(img).toHaveAttribute("loading", "eager");
    await expect.element(img).toHaveAttribute("fetchpriority", "high");
});

test("callers can override the alt text and pass <img> props through", async () => {
    const { getByRole } = await render(
        <ResponsiveImage
            image={SITE_IMAGES.logo}
            sizes="108px"
            alt="Bulgogi Billy's home"
            loading="eager"
            className="h-10 w-auto"
        />,
    );
    const img = getByRole("img", { name: "Bulgogi Billy's home" });

    await expect.element(img).toHaveAttribute("loading", "eager");
    await expect.element(img).toHaveClass("h-10", "w-auto");
});
