import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { IMAGE_DIR, imageUrl, SITE_IMAGES } from "@/site/images.ts";

// A market-day visitor is on LTE: no single image should cost more than this.
const MAX_BYTES = 150 * 1024;

const publicDir = path.resolve(__dirname, "../public");

const derivatives = Object.values(SITE_IMAGES).flatMap((image) =>
    image.widths.map((width) => imageUrl(image, width)),
);

test("every registered derivative has been generated (npm run images)", () => {
    for (const url of derivatives) {
        expect(existsSync(path.join(publicDir, url)), url).toBe(true);
    }
});

test("every derivative fits the per-image byte budget", () => {
    for (const url of derivatives) {
        expect(
            statSync(path.join(publicDir, url)).size,
            url,
        ).toBeLessThanOrEqual(MAX_BYTES);
    }
});

test("the derivative directory holds no orphans", () => {
    const files = readdirSync(path.join(publicDir, IMAGE_DIR)).map(
        (file) => `${IMAGE_DIR}/${file}`,
    );
    expect(files.sort()).toEqual([...derivatives].sort());
});

test("every master named in the registry exists", () => {
    for (const image of Object.values(SITE_IMAGES)) {
        expect(
            existsSync(path.resolve(__dirname, "..", image.source)),
            image.source,
        ).toBe(true);
    }
});
