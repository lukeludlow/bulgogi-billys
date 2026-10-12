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
import Catering from "@/site/pages/catering/Catering.tsx";
import Blog from "@/site/pages/blog/Blog.tsx";
import BlogPost from "@/site/pages/blog/BlogPost.tsx";
import NotFound from "@/site/pages/not-found/NotFound.tsx";
import { posts } from "@/site/pages/blog/posts.ts";
import { SITE_IMAGES } from "@/site/images.ts";

test("home page renders with its title", async () => {
    await renderWithProviders(<Home />);
    await expect
        .poll(() => document.title)
        .toBe("Bulgogi Billy's | Korean Fusion Food Truck – Houston, TX");
});

test("the home hero is one eagerly loaded photo, not a carousel", async () => {
    const { getByRole, container } = await renderWithProviders(<Home />);
    const hero = getByRole("img", { name: SITE_IMAGES.bulgogiFries.alt });

    await expect.element(hero).toHaveAttribute("loading", "eager");
    await expect.element(hero).toHaveAttribute("fetchpriority", "high");
    expect(container.querySelectorAll('img[alt="carousel"]')).toHaveLength(0);
});

test("the home hero leads with locations, menu and catering", async () => {
    const { getByRole, getByText } = await renderWithProviders(<Home />);

    await expect
        .element(
            getByRole("heading", {
                level: 1,
                name: "Seoul food, Texas style.",
            }),
        )
        .toBeInTheDocument();
    await expect
        .element(getByText("Korean Fusion in Greater Houston."))
        .toBeInTheDocument();
    await expect
        .element(getByRole("link", { name: "This week's locations" }))
        .toHaveAttribute("href", "/schedule");
    await expect
        .element(getByRole("link", { name: "Menu", exact: true }).first())
        .toHaveAttribute("href", "/menu");
    await expect
        .element(getByRole("link", { name: "Catering & events" }).first())
        .toHaveAttribute("href", "/catering");
});

test("every home catering link goes to the catering page, not the contact form", async () => {
    const { getByRole } = await renderWithProviders(<Home />);
    const links = getByRole("link", { name: "Catering & events" });

    await expect.element(links.first()).toBeInTheDocument();
    // The hero button and the About section's catering card.
    expect(links.elements()).toHaveLength(2);
    for (const link of links.elements()) {
        expect(link.getAttribute("href")).toBe("/catering");
    }
});

test("catering page renders with its title", async () => {
    await renderWithProviders(<Catering />);
    await expect
        .poll(() => document.title)
        .toBe(
            "Catering | Bulgogi Billy's Korean Fusion – The Woodlands & Houston",
        );
});

test("the contact page points event planners to the catering page", async () => {
    const { getByRole } = await renderWithProviders(<Contact />);

    await expect
        .element(getByRole("link", { name: "Catering & events" }))
        .toHaveAttribute("href", "/catering");
});

test("menu page renders with its title", async () => {
    await renderWithProviders(<Menu />);
    await expect
        .poll(() => document.title)
        .toBe("Menu | Bulgogi Billy's Korean Fusion");
});

test("the menu sends visitors to the schedule, not the order-now dead end", async () => {
    const { getByRole, container } = await renderWithProviders(<Menu />);
    const ctas = getByRole("link", { name: "Find us this weekend" });

    await expect.element(ctas.first()).toBeInTheDocument();
    expect(ctas.elements()).toHaveLength(2);
    for (const cta of ctas.elements()) {
        expect(cta.getAttribute("href")).toBe("/schedule");
    }
    expect(container.querySelector('a[href="/order-now"]')).toBeNull();
});

test("schedule page renders with its title", async () => {
    await renderWithProviders(<Schedule />);
    await expect
        .poll(() => document.title)
        .toBe(
            "Find Us | Bulgogi Billy's – The Woodlands, Conroe & New Caney, TX",
        );
});

test("the schedule lists Grogan's Mill and New Caney, not the 1488 market", async () => {
    const { getByRole, container } = await renderWithProviders(<Schedule />);

    await expect
        .element(
            getByRole("heading", { name: "Grogan's Mill Farmer's Market" }),
        )
        .toBeInTheDocument();
    await expect
        .element(getByRole("heading", { name: "New Caney Community Market" }))
        .toBeInTheDocument();
    expect(container.textContent).toContain("9am-1pm");
    expect(container.textContent).not.toContain("1488");
    expect(
        document
            .querySelector('meta[name="description"]')
            ?.getAttribute("content"),
    ).not.toContain("1488");
});

test("the home page's market list matches the schedule", async () => {
    const { getByText, container } = await renderWithProviders(<Home />);

    await expect
        .element(getByText("Saturdays (9 AM – 1 PM)"))
        .toBeInTheDocument();
    expect(container.textContent).not.toContain("1488");
});

test("order-now page renders with its title", async () => {
    await renderWithProviders(<OrderNow />);
    await expect
        .poll(() => document.title)
        .toBe("Order Online | Bulgogi Billy's");
});

test("the order-now placeholder asks search engines not to index it", async () => {
    await renderWithProviders(<OrderNow />);
    await expect
        .poll(() =>
            document
                .querySelector('meta[name="robots"]')
                ?.getAttribute("content"),
        )
        .toBe("noindex");
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
});

test("contact page renders with its title", async () => {
    await renderWithProviders(<Contact />);
    await expect.poll(() => document.title).toBe("Contact | Bulgogi Billy's");
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
