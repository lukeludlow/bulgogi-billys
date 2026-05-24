import { next, rewrite } from "@vercel/edge";

export const config = {
    // Run this middleware on all pages, but exclude static assets (images, css, etc.)
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};

const SITE_PASSWORD = process.env.VITE_SITE_PASSWORD;

export default function middleware(request) {
    const url = new URL(request.url);

    const cookieHeader = request.headers.get("cookie") || "";
    console.log(`--- Middleware Run for: ${url.pathname} ---`);
    console.log(`Raw Cookie Header: "${cookieHeader}"`);
    console.log(
        `Expected Password Token: "site_auth_token=${process.env.VITE_SITE_PASSWORD || "mySecretApp2026"}"`,
    );

    // Allow access to the password screen itself so users can log in
    if (url.pathname === "/enter-password") {
        return next();
    }

    // Extract cookies from the incoming request headers
    // const cookieHeader = request.headers.get("cookie") || "";
    const hasValidAuth = cookieHeader.includes(
        `site_auth_token=${SITE_PASSWORD}`,
    );

    console.log(`Is Authenticated: ${hasValidAuth}`);

    // If they don't have the cookie, silently rewrite the view to the password page
    if (!hasValidAuth) {
        url.pathname = "/enter-password";
        return rewrite(url);
    }

    console.log("proceed normally");

    // If authorized, proceed normally
    return next();
}
