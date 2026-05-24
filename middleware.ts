import { next, rewrite } from "@vercel/edge";

export const config = {
    // Run this middleware on all pages, but exclude static assets (images, css, etc.)
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};

const SITE_PASSWORD = process.env.SITE_PASSWORD;

// @ts-expect-error any is ok here
export default function middleware(request) {
    const url = new URL(request.url);

    // Allow access to the password screen itself so users can log in
    if (url.pathname === "/enter-password") {
        return next();
    }

    // Extract cookies from the incoming request headers
    const cookieHeader = request.headers.get("cookie") || "";
    const hasValidAuth = cookieHeader.includes(
        `site_auth_token=${SITE_PASSWORD}`,
    );

    // If they don't have the cookie, silently rewrite the view to the password page
    if (!hasValidAuth) {
        url.pathname = "/enter-password";
        return rewrite(url);
    }

    // If authorized, proceed normally
    return next();
}
