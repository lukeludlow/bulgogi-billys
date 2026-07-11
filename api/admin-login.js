import {
    createSessionCookieHeader,
    env,
    timingSafeEqual,
} from "../lib/adminSession.js";

export const config = { runtime: "edge" };

export default async function handler(request) {
    if (request.method !== "POST") {
        return new Response(null, { status: 405 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: "Malformed request body" }), {
            status: 400,
            headers: { "content-type": "application/json" },
        });
    }

    const submitted = typeof body?.password === "string" ? body.password : "";
    const adminPassword = env("ADMIN_PASSWORD") || "";
    const sessionSecret = env("ADMIN_SESSION_SECRET") || "";

    if (
        !adminPassword ||
        !sessionSecret ||
        !timingSafeEqual(submitted, adminPassword)
    ) {
        return new Response(JSON.stringify({ error: "Incorrect password" }), {
            status: 401,
            headers: { "content-type": "application/json" },
        });
    }

    const setCookie = await createSessionCookieHeader(sessionSecret);
    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json", "Set-Cookie": setCookie },
    });
}
