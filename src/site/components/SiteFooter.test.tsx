import { expect, test } from "vitest";
import SiteFooter from "@/site/components/SiteFooter.tsx";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

test("offers tap-to-call and tap-to-text with the business number", async () => {
    const { getByRole } = await renderWithProviders(<SiteFooter />);

    await expect
        .element(getByRole("link", { name: "(936) 900-2705" }))
        .toHaveAttribute("href", "tel:+19369002705");
    await expect
        .element(getByRole("link", { name: "Call", exact: true }))
        .toHaveAttribute("href", "tel:+19369002705");
    await expect
        .element(getByRole("link", { name: "Text", exact: true }))
        .toHaveAttribute("href", "sms:+19369002705");
});

test("links the email inbox and both social profiles", async () => {
    const { getByRole } = await renderWithProviders(<SiteFooter />);

    await expect
        .element(getByRole("link", { name: "bulgogibillys@gmail.com" }))
        .toHaveAttribute("href", "mailto:bulgogibillys@gmail.com");
    await expect
        .element(getByRole("link", { name: "Bulgogi Billy's on Instagram" }))
        .toHaveAttribute("href", "https://www.instagram.com/bulgogibillys/");
    await expect
        .element(getByRole("link", { name: "Bulgogi Billy's on Facebook" }))
        .toHaveAttribute(
            "href",
            "https://www.facebook.com/p/Bulgogi-Billys-LLC-61560725494736/",
        );
});

test("links catering but never the blog", async () => {
    const { getByRole, container } = await renderWithProviders(<SiteFooter />);

    await expect
        .element(getByRole("link", { name: "Catering", exact: true }))
        .toHaveAttribute("href", "/contact");
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) =>
        a.getAttribute("href"),
    );
    expect(hrefs.filter((href) => href?.startsWith("/blog"))).toEqual([]);
});

test("names the service area in Korean Fusion terms", async () => {
    const { getByRole } = await renderWithProviders(<SiteFooter />);

    await expect
        .element(getByRole("contentinfo"))
        .toHaveTextContent(
            "Korean Fusion catering & weekend markets — The Woodlands • Conroe • New Caney • Greater Houston",
        );
});
