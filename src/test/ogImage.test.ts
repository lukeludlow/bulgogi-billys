import { expect, test } from "vitest";
import { BASE_URL, DEFAULT_OG_IMAGE } from "@/shared/PageMeta.tsx";
import { ogImageUrl, SITE_IMAGES } from "@/site/images.ts";

// shared/ can't import the site's image registry, so PageMeta spells its
// default link-preview path out; this keeps the two from drifting.
test("PageMeta's default link-preview image is the fries photo's OG derivative", () => {
    expect(SITE_IMAGES.bulgogiFries.og).toBe(true);
    expect(DEFAULT_OG_IMAGE).toBe(
        `${BASE_URL}${ogImageUrl(SITE_IMAGES.bulgogiFries)}`,
    );
});
