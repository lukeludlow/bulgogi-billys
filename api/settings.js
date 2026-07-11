import { list, put } from "@vercel/blob";
import {
    SESSION_COOKIE_NAME,
    env,
    isValidSessionCookie,
    parseCookie,
} from "../lib/adminSession.js";

export const config = { runtime: "nodejs" };

// Cloud sync for the admin calculator, guarded by the admin session cookie.
// To enable: in the Vercel dashboard create a Blob store (Storage -> Create ->
// Blob) and connect it to this project; Vercel then injects
// BLOB_READ_WRITE_TOKEN automatically. Without it, the dashboard still works
// fully from localStorage and only the Save/Load-to-cloud buttons error.

// A single, fixed blob holds the admin's customized calculator settings. The
// object is guarded by the admin session (below), so a stable pathname is fine;
// the pathname is never linked publicly.
const BLOB_PATHNAME = "settings.json";

function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
    });
}

async function isAuthorized(request) {
    const cookieHeader = request.headers?.get?.("cookie") || "";
    const cookieValue = parseCookie(cookieHeader, SESSION_COOKIE_NAME);
    if (!cookieValue) return false;
    const secret = env("ADMIN_SESSION_SECRET") || "";
    return isValidSessionCookie(cookieValue, secret);
}

export default async function handler(request) {
    if (!(await isAuthorized(request))) {
        return json({ error: "Unauthorized" }, 401);
    }

    const token = env("BLOB_READ_WRITE_TOKEN");

    if (request.method === "GET") {
        try {
            const { blobs } = await list({ prefix: BLOB_PATHNAME, token });
            if (!blobs || blobs.length === 0) return json({});
            const response = await fetch(blobs[0].url, { cache: "no-store" });
            if (!response.ok) return json({});
            return json(await response.json());
        } catch (error) {
            return json({ error: `Could not read settings: ${error.message}` }, 500);
        }
    }

    if (request.method === "PUT" || request.method === "POST") {
        let raw;
        try {
            raw = await request.text();
            JSON.parse(raw); // validate it is well-formed JSON
        } catch {
            return json({ error: "Malformed request body" }, 400);
        }
        try {
            await put(BLOB_PATHNAME, raw, {
                access: "public",
                addRandomSuffix: false,
                allowOverwrite: true,
                contentType: "application/json",
                token,
            });
            return json({ ok: true });
        } catch (error) {
            return json({ error: `Could not save settings: ${error.message}` }, 500);
        }
    }

    return json({ error: "Method not allowed" }, 405);
}
