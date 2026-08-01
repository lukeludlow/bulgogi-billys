/**
 * Smoke tests for every routed public page: each must render and hoist its
 * PageMeta title into the document head. This is the characterization pin
 * for the Phase 1 boundary restructure (REFACTOR_PLAN §5.4) — a page that
 * stops rendering or changes its title fails here.
 */
import { expect, test } from "vitest";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";
import Home from "@/site/pages/home/Home.tsx";
import Menu from "@/site/pages/menu/Menu.tsx";
import Schedule from "@/site/pages/schedule/Schedule.tsx";
import OrderNow from "@/site/pages/order-now/OrderNow.tsx";
import Contact from "@/site/pages/contact/Contact.tsx";
import Blog from "@/site/pages/blog/Blog.tsx";
import BlogPost from "@/site/pages/blog/BlogPost.tsx";
import NotFound from "@/site/pages/not-found/NotFound.tsx";
import { posts } from "@/site/pages/blog/posts.ts";

test("home page renders with its title", async () => {
    await renderWithProviders(<Home />);
    await expect
        .poll(() => document.title)
        .toBe("Bulgogi Billy's | Korean Fusion Food Truck – Houston, TX");
});

test("menu page renders with its title", async () => {
    await renderWithProviders(<Menu />);
    await expect
        .poll(() => document.title)
        .toBe("Menu | Bulgogi Billy's Korean Fusion");
});

test("schedule page renders with its title", async () => {
    await renderWithProviders(<Schedule />);
    await expect
        .poll(() => document.title)
        .toBe(
            "Find Us | Bulgogi Billy's – The Woodlands, Conroe & New Caney, TX",
        );
});

test("order-now page renders with its title", async () => {
    await renderWithProviders(<OrderNow />);
    await expect
        .poll(() => document.title)
        .toBe("Order Online | Bulgogi Billy's");
});

test("contact page renders with its title", async () => {
    await renderWithProviders(<Contact />);
    await expect
        .poll(() => document.title)
        .toBe("Contact & Catering | Bulgogi Billy's");
});

test("blog index renders with its title", async () => {
    await renderWithProviders(<Blog />);
    await expect
        .poll(() => document.title)
        .toBe("Blog | Bulgogi Billy's Korean Fusion");
});

test("a blog post renders with the post's title", async () => {
    const post = posts[0];
    await renderWithProviders(
        <Routes>
            <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>,
        { route: `/blog/${post.slug}` },
    );
    await expect
        .poll(() => document.title)
        .toBe(`${post.title} | Bulgogi Billy's`);
});

test("an unknown blog slug renders the post-not-found title", async () => {
    await renderWithProviders(
        <Routes>
            <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>,
        { route: "/blog/not-a-real-post" },
    );
    await expect
        .poll(() => document.title)
        .toBe("Post Not Found | Bulgogi Billy's");
});

test("the 404 page renders with its title", async () => {
    await renderWithProviders(<NotFound />);
    await expect
        .poll(() => document.title)
        .toBe("Page Not Found | Bulgogi Billy's");
});
