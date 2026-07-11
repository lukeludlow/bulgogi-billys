import { next } from "@vercel/edge";
import {
    SESSION_COOKIE_NAME,
    env,
    isValidSessionCookie,
    parseCookie,
} from "./lib/adminSession.js";

export const config = {
    matcher: ["/admin", "/admin/:path*"],
};

export default async function middleware(request) {
    const url = new URL(request.url);

    const cookieValue = parseCookie(
        request.headers.get("cookie") || "",
        SESSION_COOKIE_NAME,
    );
    const sessionSecret = env("ADMIN_SESSION_SECRET") || "";
    const authorized = cookieValue
        ? await isValidSessionCookie(cookieValue, sessionSecret)
        : false;

    if (!authorized) {
        url.pathname = "/admin-login";
        return Response.redirect(url, 307);
    }

    return next();
}
