/**
 * Pure helpers for scripts/prerender.ts: where each page's HTML goes and how
 * the rendered markup is spliced into Vite's built index.html.
 */
import {
    PRERENDERED_HEAD_ATTR,
    PRERENDERED_PATH_ATTR,
} from "../src/ssrHtml.ts";

/** What dist-ssr/entry-server.js exports (src/entry-server.tsx). */
export interface ServerEntry {
    render(path: string): Promise<{ head: string; body: string }>;
    PRERENDER_PATHS: readonly string[];
    NOT_FOUND_PATH: string;
}

const EMPTY_ROOT = '<div id="root"></div>';

/**
 * The dist/ file a path is served from. Flat `<path>.html` files, which
 * Vercel's `cleanUrls` serves at the extensionless URL; the not-found page
 * becomes 404.html, which Vercel serves with a real 404 status.
 */
export function outputFileFor(route: string, notFoundPath: string): string {
    if (route === "/") return "index.html";
    if (route === notFoundPath) return "404.html";
    return `${route.replace(/^\/+|\/+$/g, "")}.html`;
}

/** Marks each prerendered head tag, so the browser can drop them if it won't hydrate. */
export function stampHeadTags(head: string): string {
    return head.replace(
        /<(title|meta|link)\b/g,
        `<$1 ${PRERENDERED_HEAD_ATTR}=""`,
    );
}

function escapeAttribute(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
}

/**
 * Splices a rendered page into the template: head tags before </head>, and
 * the markup into #root, stamped with the path it was rendered for.
 */
export function injectPage(
    template: string,
    page: { head: string; body: string; path: string },
): string {
    if (!template.includes(EMPTY_ROOT)) {
        throw new Error(
            `template has no empty ${EMPTY_ROOT} — has it already been prerendered?`,
        );
    }
    if (!template.includes("</head>")) {
        throw new Error("template has no </head>");
    }
    const root = `<div id="root" ${PRERENDERED_PATH_ATTR}="${escapeAttribute(page.path)}">${page.body}</div>`;
    // Replacer functions, so "$" in page text ("$17/person") stays literal.
    return template
        .replace("</head>", () => `${stampHeadTags(page.head)}</head>`)
        .replace(EMPTY_ROOT, () => root);
}
