/**
 * The contract between the build-time prerenderer (scripts/prerender.ts) and
 * the browser entry (main.tsx). Plain TypeScript with no path aliases, so the
 * Node script can import it directly.
 */

/** On `<div id="root">`: the path its prerendered markup was rendered for. */
export const PRERENDERED_PATH_ATTR = "data-prerendered";

/** On each prerendered head tag, so the browser can drop them if it won't hydrate. */
export const PRERENDERED_HEAD_ATTR = "data-prerender";

// React escapes "<" in text and ">" in attributes, so neither can occur
// inside one of these tags.
const HOISTED_TAG = /^(?:<title>[^<]*<\/title>|<meta\b[^>]*>|<link\b[^>]*>)/;

/**
 * React 19's renderToString emits a partial tree's hoisted <title>, <meta>
 * and <link> tags (PageMeta, image preloads) ahead of its markup. This splits
 * them off so they can go into <head>.
 */
export function splitHoistedHead(html: string): { head: string; body: string } {
    let body = html;
    let head = "";
    for (
        let match = HOISTED_TAG.exec(body);
        match;
        match = HOISTED_TAG.exec(body)
    ) {
        head += match[0];
        body = body.slice(match[0].length);
    }
    return { head, body };
}

function normalizePath(path: string): string {
    return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

/**
 * Hydrate only markup prerendered for this very URL. 404.html is served at
 * whatever unknown URL was requested, and the admin shell is empty — both
 * render from scratch instead.
 */
export function shouldHydrate(
    prerenderedPath: string | undefined,
    pathname: string,
): boolean {
    return (
        prerenderedPath !== undefined &&
        normalizePath(prerenderedPath) === normalizePath(pathname)
    );
}

/**
 * Drops prerendered head tags that a from-scratch render would duplicate.
 * Typed structurally (it's given `document`) because the Node prerender
 * script shares this module and has no DOM types.
 */
export function removePrerenderedHead(root: {
    querySelectorAll(selector: string): ArrayLike<{ remove(): void }>;
}): void {
    for (const tag of Array.from(
        root.querySelectorAll(`[${PRERENDERED_HEAD_ATTR}]`),
    )) {
        tag.remove();
    }
}
