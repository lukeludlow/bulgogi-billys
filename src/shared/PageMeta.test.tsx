import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import PageMeta, { BASE_URL, DEFAULT_OG_IMAGE } from "./PageMeta.tsx";

test("uses the www subdomain as the canonical base URL", () => {
    expect(BASE_URL).toBe("https://www.bulgogibillys.com");
});

test("renders the page title and meta description into the document head", async () => {
    render(
        <PageMeta
            title="Test Page | Bulgogi Billy's"
            description="A test description."
        />,
    );

    await expect.poll(() => document.title).toBe("Test Page | Bulgogi Billy's");
    await expect
        .poll(() =>
            document
                .querySelector('meta[name="description"]')
                ?.getAttribute("content"),
        )
        .toBe("A test description.");
});

test("renders a www canonical URL built from the path", async () => {
    render(<PageMeta title="Menu" description="The menu." path="/menu" />);

    await expect
        .poll(() =>
            document
                .querySelector('link[rel="canonical"]')
                ?.getAttribute("href"),
        )
        .toBe("https://www.bulgogibillys.com/menu");
});

test("omits the canonical link when no path is given", async () => {
    render(<PageMeta title="No Canonical" description="desc" />);

    await expect.poll(() => document.title).toBe("No Canonical");
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
});

test("renders a robots noindex meta tag when noindex is set", async () => {
    render(<PageMeta title="Admin" description="Internal." noindex />);

    await expect
        .poll(() =>
            document
                .querySelector('meta[name="robots"]')
                ?.getAttribute("content"),
        )
        .toBe("noindex");
});

test("omits the robots meta tag when noindex is not set", async () => {
    render(<PageMeta title="Public Page" description="Public." path="/" />);

    await expect.poll(() => document.title).toBe("Public Page");
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
});

function metaContent(selector: string): string | null | undefined {
    return document.querySelector(selector)?.getAttribute("content");
}

test("renders link-preview tags from the title and description", async () => {
    render(
        <PageMeta
            title="Catering | Bulgogi Billy's"
            description="Korean Fusion catering."
            path="/catering"
        />,
    );

    await expect
        .poll(() => metaContent('meta[property="og:title"]'))
        .toBe("Catering | Bulgogi Billy's");
    expect(metaContent('meta[property="og:description"]')).toBe(
        "Korean Fusion catering.",
    );
    expect(metaContent('meta[property="og:type"]')).toBe("website");
    expect(metaContent('meta[property="og:url"]')).toBe(
        "https://www.bulgogibillys.com/catering",
    );
    expect(metaContent('meta[property="og:image"]')).toBe(DEFAULT_OG_IMAGE);
    expect(metaContent('meta[name="twitter:card"]')).toBe(
        "summary_large_image",
    );
});

test("omits og:url when the page declares no canonical path", async () => {
    render(<PageMeta title="No URL" description="desc" />);

    await expect
        .poll(() => metaContent('meta[property="og:title"]'))
        .toBe("No URL");
    expect(document.querySelector('meta[property="og:url"]')).toBeNull();
});

test("uses a page's own preview image when given one", async () => {
    render(
        <PageMeta
            title="Tacos"
            description="desc"
            image="https://www.bulgogibillys.com/images/opt/tacos-og.jpg"
        />,
    );

    await expect
        .poll(() => metaContent('meta[property="og:image"]'))
        .toBe("https://www.bulgogibillys.com/images/opt/tacos-og.jpg");
});
