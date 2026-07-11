import { get, put } from "@vercel/blob";
import {
    SESSION_COOKIE_NAME,
    env,
    isValidSessionCookie,
    parseCookie,
} from "../lib/adminSession.js";

export const config = { runtime: "nodejs" };

// Cloud sync for the admin calculator, guarded by the admin session cookie.
// To enable: in the Vercel dashboard create a *private* Blob store (Storage ->
// Create -> Blob, access: Private) and connect it to this project; Vercel then
// injects BLOB_READ_WRITE_TOKEN automatically. Without it, the dashboard still
// works fully from localStorage and only the Save/Load-to-cloud buttons error.
// Private stores require every read and write to pass access: "private" and
// reads to go through get() rather than a plain fetch() of the blob URL.

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
            const result = await get(BLOB_PATHNAME, { access: "private", token });
            if (!result || result.statusCode !== 200) return json({});
            return json(await new Response(result.stream).json());
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
                access: "private",
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
