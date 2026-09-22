/**
 * Guards vercel.json against the routing it has to agree with: the files
 * scripts/prerender.ts writes, and the routes main.tsx renders client-only.
 * (A rewrite to "/spa.html" once shipped: under cleanUrls that path only
 * redirects, so every admin URL answered 404.)
 */
import { expect, test } from "vitest";
import vercelJson from "../../vercel.json?raw";
import { SPA_SHELL_FILE } from "../../scripts/prerenderHtml.ts";
import { ADMIN_ROUTES } from "@/admin/routes.ts";

interface VercelConfig {
    cleanUrls?: boolean;
    trailingSlash?: boolean;
    rewrites: { source: string; destination: string }[];
}

const vercel: VercelConfig = JSON.parse(vercelJson);

// The routes main.tsx registers outside the prerendered public site.
const CLIENT_ONLY_PATHS = [
    ...ADMIN_ROUTES.map((route) => route.path),
    "/admin-login",
    "/auth/callback",
];

/** Vercel's source patterns, for the two shapes vercel.json uses. */
function sourceMatches(source: string, url: string): boolean {
    const pattern = source
        .replace(/\/:\w+\*/g, "(?:/.*)?")
        .replace(/:\w+/g, "[^/]+");
    return new RegExp(`^${pattern}$`).test(url);
}

const rewritten = (url: string) =>
    vercel.rewrites.some(({ source }) => sourceMatches(source, url));

test("prerendered <path>.html files are served at clean, slash-less URLs", () => {
    expect(vercel.cleanUrls).toBe(true);
    expect(vercel.trailingSlash).toBe(false);
});

test("rewrites reach the SPA shell by its clean URL, not its .html path", () => {
    const shellUrl = `/${SPA_SHELL_FILE.replace(/\.html$/, "")}`;
    for (const { destination } of vercel.rewrites) {
        expect(destination).toBe(shellUrl);
    }
});

test.each(CLIENT_ONLY_PATHS)("%s is rewritten to the SPA shell", (url) => {
    expect(rewritten(url)).toBe(true);
});

test("public pages and unknown URLs are never rewritten", () => {
    // Served from their prerendered files, or Vercel's 404.html.
    for (const url of ["/", "/catering", "/blog/a-post", "/nope"]) {
        expect(rewritten(url), url).toBe(false);
    }
});
