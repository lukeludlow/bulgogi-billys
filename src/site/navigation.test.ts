import { expect, test } from "vitest";
import { NAV_ITEMS } from "@/site/navigation.ts";
import { SITE_ROUTES } from "@/site/routes.ts";

test("every nav item points at an indexable public page", () => {
    const indexablePaths = SITE_ROUTES.filter((route) => route.indexable).map(
        (route) => route.path,
    );
    for (const { label, url } of NAV_ITEMS) {
        expect(indexablePaths, label).toContain(url);
    }
});

test("catering is reachable from the nav on every page", () => {
    expect(NAV_ITEMS.map(({ label }) => label)).toContain("Catering");
});

test("the blog stays out of the nav — it exists for search, not navigation", () => {
    expect(NAV_ITEMS.filter(({ url }) => url.startsWith("/blog"))).toEqual([]);
});

test("labels are unique, since they key the rendered nav lists", () => {
    const labels = NAV_ITEMS.map(({ label }) => label);
    expect(new Set(labels).size).toBe(labels.length);
});
