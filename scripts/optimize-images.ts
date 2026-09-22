/**
 * Regenerates public/images/opt/ from the SITE_IMAGES registry: one WebP per
 * registered width, resized from the image's master, plus a link-preview JPEG
 * for images flagged `og`. Run `npm run images`
 * after adding or replacing a photo in the registry, then commit the output —
 * scripts/optimize-images.test.ts fails while a derivative is missing, stale
 * or over budget.
 */
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
    IMAGE_DIR,
    OG_IMAGE_SIZE,
    SITE_IMAGES,
    imageUrl,
    ogImageUrl,
    type SiteImage,
} from "../src/site/images.ts";

const WEBP_QUALITY = 80;
const JPEG_QUALITY = 80;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", IMAGE_DIR);

// Start clean so images dropped from the registry don't linger as orphans.
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const image of Object.values(SITE_IMAGES) as SiteImage[]) {
    const source = path.join(root, image.source);
    const { width, height } = await sharp(source).metadata();
    if (width !== image.width || height !== image.height) {
        throw new Error(
            `${image.source} is ${width}×${height}, but SITE_IMAGES says ${image.width}×${image.height}`,
        );
    }
    for (const targetWidth of image.widths) {
        if (targetWidth > width) {
            throw new Error(
                `${image.name}: ${targetWidth}px is wider than its ${width}px master`,
            );
        }
        const out = path.join(root, "public", imageUrl(image, targetWidth));
        const info = await sharp(source)
            .resize({ width: targetWidth })
            .webp({ quality: WEBP_QUALITY })
            .toFile(out);
        console.log(
            `${path.relative(root, out)}  ${info.width}×${info.height}  ${Math.round(info.size / 1024)} KB`,
        );
    }
    if (image.og) {
        const out = path.join(root, "public", ogImageUrl(image));
        const info = await sharp(source)
            .resize({ ...OG_IMAGE_SIZE, fit: "cover" })
            .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
            .toFile(out);
        console.log(
            `${path.relative(root, out)}  ${info.width}×${info.height}  ${Math.round(info.size / 1024)} KB`,
        );
    }
}
