import { expect, test } from "vitest";
import { injectPage, outputFileFor, stampHeadTags } from "./prerenderHtml.ts";

const TEMPLATE =
    '<html><head><meta charset="UTF-8" /></head><body><div id="root"></div><script src="/assets/index.js"></script></body></html>';

test("maps each route to a flat HTML file for Vercel's cleanUrls", () => {
    expect(outputFileFor("/", "/404")).toBe("index.html");
    expect(outputFileFor("/catering", "/404")).toBe("catering.html");
    expect(outputFileFor("/blog/some-post", "/404")).toBe(
        "blog/some-post.html",
    );
    expect(outputFileFor("/404", "/404")).toBe("404.html");
});

test("stamps every head tag so the browser can find them", () => {
    expect(
        stampHeadTags(
            '<title>T</title><meta name="description" content="d"/><link rel="canonical" href="h"/>',
        ),
    ).toBe(
        '<title data-prerender="">T</title><meta data-prerender="" name="description" content="d"/><link data-prerender="" rel="canonical" href="h"/>',
    );
});

test("puts head tags before </head> and the markup into a stamped #root", () => {
    const html = injectPage(TEMPLATE, {
        head: "<title>Menu</title>",
        body: "<main>Menu</main>",
        path: "/menu",
    });

    expect(html).toBe(
        '<html><head><meta charset="UTF-8" /><title data-prerender="">Menu</title></head><body><div id="root" data-prerendered="/menu"><main>Menu</main></div><script src="/assets/index.js"></script></body></html>',
    );
});

test("keeps dollar signs in page text literal", () => {
    const html = injectPage(TEMPLATE, {
        head: "",
        body: "<p>From $17/person, $& more $' $1</p>",
        path: "/catering",
    });
    expect(html).toContain("<p>From $17/person, $& more $' $1</p>");
});

test("refuses a template that was already prerendered", () => {
    const once = injectPage(TEMPLATE, { head: "", body: "x", path: "/" });
    expect(() => injectPage(once, { head: "", body: "x", path: "/" })).toThrow(
        /already been prerendered/,
    );
});
