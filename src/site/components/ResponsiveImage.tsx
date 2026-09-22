import type { ComponentPropsWithoutRef } from "react";
import { imageSrcSet, imageUrl, type SiteImage } from "@/site/images.ts";

interface Props extends Omit<
    ComponentPropsWithoutRef<"img">,
    "src" | "srcSet" | "sizes" | "width" | "height"
> {
    image: SiteImage;
    /** Rendered width per breakpoint, so the browser can pick the smallest file that stays sharp. */
    sizes: string;
    /** The page's largest above-the-fold image: fetch it first instead of lazily. */
    priority?: boolean;
}

/**
 * An <img> backed by the SITE_IMAGES derivatives: WebP srcset, intrinsic
 * width/height (no layout shift), registry alt text, and lazy loading unless
 * the image is the page's priority image. `alt` and `loading` can still be
 * overridden per use.
 */
export default function ResponsiveImage({
    image,
    sizes,
    priority = false,
    ...rest
}: Props) {
    return (
        <img
            src={imageUrl(image, image.widths[image.widths.length - 1])}
            srcSet={imageSrcSet(image)}
            sizes={sizes}
            width={image.width}
            height={image.height}
            alt={image.alt}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            {...rest}
        />
    );
}
