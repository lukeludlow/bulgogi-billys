import { expect, test } from "vitest";
import sitemapXml from "../../public/sitemap.xml?raw";
import robotsTxt from "../../public/robots.txt?raw";
import { BASE_URL } from "@/shared/PageMeta.tsx";
import { posts } from "@/site/pages/blog/posts.ts";

function sitemapUrls(): string[] {
    const doc = new DOMParser().parseFromString(sitemapXml, "application/xml");
    expect(doc.querySelector("parsererror")).toBeNull();
    return Array.from(doc.querySelectorAll("url > loc")).map(
        (loc) => loc.textContent ?? "",
    );
}

test("every sitemap URL uses the www canonical domain", () => {
    const urls = sitemapUrls();
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
        expect(url).toMatch(new RegExp(`^${BASE_URL}(/|$)`));
    }
});

test("sitemap contains no apex-domain URLs", () => {
    expect(sitemapXml).not.toContain("https://bulgogibillys.com");
});

test("sitemap covers all indexable public routes", () => {
    const urls = sitemapUrls();
    const expectedPaths = [
        "/",
        "/schedule",
        "/menu",
        "/order-now",
        "/contact",
        "/blog",
        ...posts.map((post) => `/blog/${post.slug}`),
    ];
    for (const path of expectedPaths) {
        expect(urls).toContain(`${BASE_URL}${path}`);
    }
    expect(urls).toHaveLength(expectedPaths.length);
});

test("every sitemap entry has a valid lastmod date", () => {
    const doc = new DOMParser().parseFromString(sitemapXml, "application/xml");
    const entries = Array.from(doc.querySelectorAll("url"));
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
        const lastmod = entry.querySelector("lastmod")?.textContent;
        expect(lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
});

test("robots.txt references the www sitemap and blocks admin routes", () => {
    expect(robotsTxt).toContain(`Sitemap: ${BASE_URL}/sitemap.xml`);
    expect(robotsTxt).not.toContain("Sitemap: https://bulgogibillys.com");
    expect(robotsTxt).toContain("Disallow: /admin");
});
