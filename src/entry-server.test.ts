// @vitest-environment node
/**
 * Renders every prerendered page the way the build does — in Node, with no
 * DOM — so a page that touches window/localStorage during render fails here
 * rather than in `npm run build`.
 */
import { expect, test } from "vitest";
import { NOT_FOUND_PATH, PRERENDER_PATHS, render } from "@/entry-server.tsx";
import { posts } from "@/site/pages/blog/posts.ts";

test("prerenders each static page, each blog post and the 404 page", () => {
    expect(PRERENDER_PATHS).toEqual([
        "/",
        "/menu",
        "/schedule",
        "/order-now",
        "/catering",
        "/contact",
        "/blog",
        ...posts.map((post) => `/blog/${post.slug}`),
        NOT_FOUND_PATH,
    ]);
});

test.each(PRERENDER_PATHS)(
    "%s renders without a DOM, with its head tags split out",
    async (path) => {
        expect(typeof window).toBe("undefined");

        const { head, body } = await render(path);

        expect(head).toMatch(/<title>[^<]+<\/title>/);
        expect(head).toContain('<meta name="description"');
        expect(head).toContain('<meta property="og:title"');
        expect(head).toContain('<meta property="og:image"');
        expect(body).not.toContain("<title>");
        expect(body).toContain("<footer");
    },
);

test("the catering page ships its prices in the HTML itself", async () => {
    const { head, body } = await render("/catering");

    expect(head).toContain(
        '<link rel="canonical" href="https://www.bulgogibillys.com/catering"/>',
    );
    expect(body).toContain("From $17/person · 20-guest minimum");
    expect(body).toContain("$1,320 – $1,585");
    expect(body).toContain("Is there a vegetarian option?");
});

test("an unknown path renders the not-found page, marked noindex", async () => {
    const { head, body } = await render("/definitely-not-a-page");

    expect(head).toContain(
        "<title>Page Not Found | Bulgogi Billy&#x27;s</title>",
    );
    expect(head).toContain('<meta name="robots" content="noindex"/>');
    expect(head).not.toContain('rel="canonical"');
    expect(body).toContain("Page not found");
});

test("the theme switch renders off; the browser corrects it on hydration", async () => {
    const { body } = await render("/");
    expect(body).toMatch(/role="switch"[^>]*aria-checked="false"/);
});
