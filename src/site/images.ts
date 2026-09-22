/**
 * Registry of the public site's photos and graphics — the single source for
 * their optimized file paths, intrinsic dimensions, and alt text.
 *
 * `npm run images` (scripts/optimize-images.ts) reads this registry and
 * writes one WebP derivative per width from each master into
 * public/images/opt/. The masters stay in public/images/ so URLs that already
 * point at them (og:image, JSON-LD, old shares) keep working; the pages only
 * ever request the derivatives, through ResponsiveImage.
 */
export interface SiteImage {
    /** Master file the derivatives are generated from, relative to the repo root. */
    source: string;
    /** Derivative basename: public/images/opt/<name>-<width>.webp. */
    name: string;
    /** Intrinsic size of the master; sets the aspect ratio that prevents layout shift. */
    width: number;
    height: number;
    /** Derivative widths in px, ascending and never wider than the master. */
    widths: readonly number[];
    alt: string;
}

export const IMAGE_DIR = "/images/opt";

const MENU_PHOTO_WIDTHS = [480, 768, 1024] as const;

export const SITE_IMAGES = {
    bulgogiFries: {
        source: "public/images/fries_h_screen_small.png",
        name: "bulgogi-fries",
        width: 1024,
        height: 683,
        widths: MENU_PHOTO_WIDTHS,
        alt: "Bulgogi fries topped with beef bulgogi, cheddar-jack cheese, Seoul sauce, Sriracha and sour cream",
    },
    bulgogiRice: {
        source: "public/images/rice_h_screen_small.png",
        name: "bulgogi-rice",
        width: 1024,
        height: 683,
        widths: MENU_PHOTO_WIDTHS,
        alt: "Beef bulgogi with steamed white rice and a side of kimchi",
    },
    bulgogiTacos: {
        source: "public/images/tacos_h_screen_small.png",
        name: "bulgogi-tacos",
        width: 1024,
        height: 683,
        widths: MENU_PHOTO_WIDTHS,
        alt: "Three bulgogi tacos on corn tortillas topped with pickled red cabbage, kimchi, Seoul sauce and Sriracha",
    },
    billyAndMom: {
        source: "public/images/billy-and-mom.jpeg",
        name: "billy-and-mom",
        width: 1080,
        height: 1440,
        widths: [480, 800],
        alt: "Billy and his mom smiling together at home",
    },
    cartoonBilly: {
        source: "public/images/cartoon-billy.jpeg",
        name: "cartoon-billy",
        width: 1024,
        height: 1536,
        widths: [256, 384],
        alt: "Cartoon of Billy smiling in a Bulgogi Billy's T-shirt",
    },
    socials: {
        source: "public/images/bulgogi-billys-socials.png",
        name: "socials",
        width: 1536,
        height: 1024,
        widths: [480, 720, 1080],
        alt: "Bulgogi Billy's logo — established in 2023 — @bulgogibillys on Facebook and Instagram",
    },
    logo: {
        source: "public/images/Bulgogi Billy's Logo (Transparent PNG FINAL).png",
        name: "logo",
        width: 1451,
        height: 536,
        widths: [216, 432, 648],
        alt: "Bulgogi Billy's",
    },
} as const satisfies Record<string, SiteImage>;

export function imageUrl(image: SiteImage, width: number): string {
    return `${IMAGE_DIR}/${image.name}-${width}.webp`;
}

export function imageSrcSet(image: SiteImage): string {
    return image.widths
        .map((width) => `${imageUrl(image, width)} ${width}w`)
        .join(", ");
}
