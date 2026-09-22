/**
 * Postbuild step of `npm run build`: renders every public page to static HTML
 * (WEBSITE_REVENUE_PLAN.md Phase 1, fixing T1/T2).
 *
 * Reads Vite's dist/index.html as the template and keeps an untouched copy as
 * dist/spa.html — the shell vercel.json rewrites the client-only admin routes
 * to. Then, with the SSR bundle from `vite build --ssr src/entry-server.tsx`,
 * writes dist/index.html, dist/<path>.html per page, and dist/404.html.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
    injectPage,
    outputFileFor,
    type ServerEntry,
} from "./prerenderHtml.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

const template = await readFile(path.join(dist, "index.html"), "utf8");
await writeFile(path.join(dist, "spa.html"), template);

const entryUrl = pathToFileURL(path.join(root, "dist-ssr", "entry-server.js"));
const { render, PRERENDER_PATHS, NOT_FOUND_PATH } = (await import(
    entryUrl.href
)) as ServerEntry;

for (const route of PRERENDER_PATHS) {
    const page = await render(route);
    const file = path.join(dist, outputFileFor(route, NOT_FOUND_PATH));
    await mkdir(path.dirname(file), { recursive: true });
    const html = injectPage(template, { ...page, path: route });
    await writeFile(file, html);
    console.log(
        `${route.padEnd(56)} → ${path.relative(root, file)}  ${Math.round(html.length / 1024)} KB`,
    );
}
