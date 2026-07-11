import { expiredSessionCookieHeader } from "../lib/adminSession.js";

export const config = { runtime: "edge" };

export default async function handler(request) {
    if (request.method !== "POST") {
        return new Response(null, { status: 405 });
    }

    return new Response(null, {
        status: 204,
        headers: { "Set-Cookie": expiredSessionCookieHeader() },
    });
}
