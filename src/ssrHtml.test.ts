import { expect, test } from "vitest";
import {
    removePrerenderedHead,
    shouldHydrate,
    splitHoistedHead,
} from "@/ssrHtml.ts";

test("splits React's leading hoisted tags from the page markup", () => {
    const head =
        '<title>Menu | Bulgogi Billy&#x27;s</title><meta name="description" content="Fries &amp; tacos"/><link rel="canonical" href="https://www.bulgogibillys.com/menu"/><meta property="og:title" content="Menu"/><link rel="preload" as="image" imageSrcSet="/a.webp 480w" imageSizes="100vw" fetchPriority="high"/>';
    const body =
        '<div class="isolate"><main><title>not hoisted</title></main></div>';

    expect(splitHoistedHead(head + body)).toEqual({ head, body });
});

test("leaves markup with no hoisted tags untouched", () => {
    expect(splitHoistedHead("<div>hi</div>")).toEqual({
        head: "",
        body: "<div>hi</div>",
    });
});

test("hydrates only markup prerendered for the current path", () => {
    expect(shouldHydrate("/menu", "/menu")).toBe(true);
    expect(shouldHydrate("/menu", "/menu/")).toBe(true);
    expect(shouldHydrate("/", "/")).toBe(true);
    // 404.html served at an unknown URL, the admin shell, the dev server.
    expect(shouldHydrate("/404", "/nope")).toBe(false);
    expect(shouldHydrate(undefined, "/admin")).toBe(false);
    expect(shouldHydrate("/", "/menu")).toBe(false);
});

test("removes only the prerendered head tags", () => {
    document.head.innerHTML =
        '<meta property="og:site_name" content="Bulgogi Billy\'s"><title data-prerender="">Old</title><meta data-prerender="" name="description" content="old">';

    removePrerenderedHead(document);

    expect(document.head.innerHTML).toBe(
        '<meta property="og:site_name" content="Bulgogi Billy\'s">',
    );
});
