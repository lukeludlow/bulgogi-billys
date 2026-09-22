/**
 * Build-time prerender entry (the server-side counterpart of main.tsx).
 * `vite build --ssr` bundles it into dist-ssr/, and scripts/prerender.ts
 * renders every path in PRERENDER_PATHS into its own HTML file — so crawlers,
 * link previews and AI assistants get real content without running
 * JavaScript, and the browser hydrates it.
 */
import { renderToString } from "react-dom/server";
import {
    createStaticHandler,
    createStaticRouter,
    StaticRouterProvider,
} from "react-router";
import AppRoot from "@/AppRoot.tsx";
import { BASE_URL } from "@/shared/PageMeta.tsx";
import { posts } from "@/site/pages/blog/posts.ts";
import { SITE_ROUTE_TREE } from "@/site/router.ts";
import { SITE_ROUTES } from "@/site/routes.ts";
import { splitHoistedHead } from "@/ssrHtml.ts";

/** Matches no route, so it renders the not-found page — written to 404.html. */
export const NOT_FOUND_PATH = "/404";

/**
 * Every static public page (noindex ones too — they still deserve real
 * HTML), each blog post, and the not-found page.
 */
export const PRERENDER_PATHS: readonly string[] = [
    ...SITE_ROUTES.map(({ path }) => path).filter(
        (path) => path !== "*" && !path.includes(":"),
    ),
    ...posts.map((post) => `/blog/${post.slug}`),
    NOT_FOUND_PATH,
];

// Only the public tree: admin routes are client-only and never prerendered.
const handler = createStaticHandler([SITE_ROUTE_TREE]);

export async function render(
    path: string,
): Promise<{ head: string; body: string }> {
    const context = await handler.query(new Request(`${BASE_URL}${path}`));
    if (context instanceof Response) {
        throw new Error(`${path} answered with a ${context.status} response`);
    }
    const router = createStaticRouter(handler.dataRoutes, context);
    // hydrate={false}: the site has no loaders, so there's no router data to
    // ship — and without the script, the tree ends in `null` just like the
    // browser's RouterProvider, which keeps useId ids aligned.
    const html = renderToString(
        <AppRoot>
            <StaticRouterProvider
                router={router}
                context={context}
                hydrate={false}
            />
        </AppRoot>,
    );
    return splitHoistedHead(html);
}
