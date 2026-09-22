import { describe, expect, test } from "vitest";
import {
    imageSrcSet,
    imageUrl,
    ogImageUrl,
    SITE_IMAGES,
    type SiteImage,
} from "@/site/images.ts";

const images: [string, SiteImage][] = Object.entries(SITE_IMAGES);

test("imageUrl points at the WebP derivative for a width", () => {
    expect(imageUrl(SITE_IMAGES.bulgogiFries, 480)).toBe(
        "/images/opt/bulgogi-fries-480.webp",
    );
});

test("ogImageUrl points at the link-preview JPEG", () => {
    expect(ogImageUrl(SITE_IMAGES.bulgogiFries)).toBe(
        "/images/opt/bulgogi-fries-og.jpg",
    );
});

test("imageSrcSet lists every derivative with its width descriptor", () => {
    expect(imageSrcSet(SITE_IMAGES.cartoonBilly)).toBe(
        "/images/opt/cartoon-billy-256.webp 256w, /images/opt/cartoon-billy-384.webp 384w",
    );
});

test("derivative names are unique, so no two images overwrite each other", () => {
    const names = images.map(([, image]) => image.name);
    expect(new Set(names).size).toBe(names.length);
});

describe.each(images)("%s", (_, image) => {
    test("widths ascend and never upscale the master", () => {
        expect(image.widths.length).toBeGreaterThan(0);
        expect([...image.widths].sort((a, b) => a - b)).toEqual([
            ...image.widths,
        ]);
        expect(Math.max(...image.widths)).toBeLessThanOrEqual(image.width);
    });

    test("alt text describes the image instead of naming the file", () => {
        expect(image.alt.trim().length).toBeGreaterThan(10);
        expect(image.alt).not.toMatch(/^[\w-]+$/);
        expect(image.alt).not.toMatch(/carousel|\.(png|jpe?g|webp)/i);
    });
});
