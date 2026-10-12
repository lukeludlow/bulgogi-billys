/**
 * Screenshots the public site, in dark mode, into public/screens/ for the
 * video's device frames. Point BASE_URL at any build; the default is a local
 * `npm run build && npx vite preview` so the video shows the latest code.
 *
 *   BASE_URL=https://www.bulgogibillys.com npm run screens
 */
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4173";
const outDir = path.resolve(import.meta.dirname, "..", "public", "screens");
const brandDir = path.resolve(import.meta.dirname, "..", "public", "brand");
const siteImages = path.resolve(
    import.meta.dirname,
    "..",
    "..",
    "public",
    "images",
    "opt",
);

const shot = (name: string) => ({
    path: path.join(outDir, `${name}.jpg`),
    type: "jpeg" as const,
    quality: 90,
});

/** Load a page with every lazy image decoded, then return to the top. */
async function open(context: BrowserContext, route: string): Promise<Page> {
    const page = await context.newPage();
    await page.goto(new URL(route, BASE_URL).href, {
        waitUntil: "networkidle",
    });
    await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
            window.scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 60));
        }
        window.scrollTo(0, 0);
        // A lazy image that never started loading would keep decode()
        // pending forever, so load everything eagerly and cap the wait.
        const images = [...document.images];
        for (const img of images) img.loading = "eager";
        await Promise.race([
            Promise.all(images.map((img) => img.decode().catch(() => {}))),
            new Promise((resolve) => setTimeout(resolve, 5000)),
        ]);
    });
    await page.waitForTimeout(300);
    return page;
}

/** Fill the estimator the way a party planner would: 60 guests, on-site. */
async function fillEstimator(page: Page) {
    const estimate = page.locator("#estimate");
    await estimate.scrollIntoViewIfNeeded();
    await estimate.locator('input[type="number"]').fill("60");
    await estimate.locator('input[type="number"]').blur();
    await estimate.getByText("On-site Tent Service").click();
    await page.waitForTimeout(400);
}

// The site's own logo and food photos, for the opening and closing shots.
await mkdir(brandDir, { recursive: true });
for (const file of [
    "logo-648.webp",
    "bulgogi-fries-1024.webp",
    "bulgogi-tacos-1024.webp",
    "bulgogi-rice-1024.webp",
]) {
    await copyFile(path.join(siteImages, file), path.join(brandDir, file));
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();

const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
});
for (const [route, name] of [
    ["/", "home"],
    ["/menu", "menu"],
    ["/schedule", "schedule"],
    ["/catering", "catering"],
] as const) {
    const page = await open(mobile, route);
    await page.screenshot(shot(`mobile-${name}`));
    await page.screenshot({ ...shot(`mobile-${name}-full`), fullPage: true });
    if (name === "catering") {
        await fillEstimator(page);
        await page
            .getByTestId("estimate-range")
            .evaluate((el) =>
                el.scrollIntoView({ block: "center", behavior: "instant" }),
            );
        await page.waitForTimeout(200);
        await page.screenshot(shot("mobile-catering-estimate"));
    }
    await page.close();
}

const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
    colorScheme: "dark",
});
for (const [route, name] of [
    ["/", "home"],
    ["/menu", "menu"],
    ["/schedule", "schedule"],
    ["/catering", "catering"],
] as const) {
    const page = await open(desktop, route);
    await page.screenshot(shot(`desktop-${name}`));
    await page.screenshot({ ...shot(`desktop-${name}-full`), fullPage: true });
    if (name === "catering") {
        await fillEstimator(page);
        await page
            .locator("#estimate")
            .evaluate((el) =>
                el.scrollIntoView({ block: "start", behavior: "instant" }),
            );
        await page.waitForTimeout(200);
        await page.screenshot(shot("desktop-catering-estimate"));
    }
    await page.close();
}

await browser.close();
console.log(
    `Captured ${BASE_URL} into ${path.relative(process.cwd(), outDir)}`,
);
