import type { ComponentType } from "react";
import Home from "@/site/pages/home/Home.tsx";
import Menu from "@/site/pages/menu/Menu.tsx";
import Schedule from "@/site/pages/schedule/Schedule.tsx";
import OrderNow from "@/site/pages/order-now/OrderNow.tsx";
import Contact from "@/site/pages/contact/Contact.tsx";
import Blog from "@/site/pages/blog/Blog.tsx";
import BlogPost from "@/site/pages/blog/BlogPost.tsx";
import NotFound from "@/site/pages/not-found/NotFound.tsx";

export interface SiteRoute {
    /** react-router path ("/" is the index route, "*" the 404 catch-all). */
    path: string;
    Component: ComponentType;
    /** Listed in sitemap.xml — static, indexable pages only. */
    indexable: boolean;
}

/**
 * Single source of truth for the public routes, consumed by main.tsx and the
 * sitemap test: a page missing here either doesn't render or fails the
 * sitemap check, so the route list and sitemap.xml cannot drift apart.
 */
export const SITE_ROUTES: SiteRoute[] = [
    { path: "/", Component: Home, indexable: true },
    { path: "/menu", Component: Menu, indexable: true },
    { path: "/schedule", Component: Schedule, indexable: true },
    { path: "/order-now", Component: OrderNow, indexable: true },
    { path: "/contact", Component: Contact, indexable: true },
    { path: "/blog", Component: Blog, indexable: true },
    // Individual posts are indexed via their own sitemap entries derived from
    // posts.ts, not this dynamic pattern.
    { path: "/blog/:slug", Component: BlogPost, indexable: false },
    { path: "*", Component: NotFound, indexable: false },
];
