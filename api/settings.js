import { get, put } from "@vercel/blob";
import { env, verifyAdminRequest } from "../lib/adminAuth.js";

export const config = { runtime: "nodejs" };

// Cloud sync for the admin calculator, guarded by a Supabase access token.
// To enable: in the Vercel dashboard create a *private* Blob store (Storage ->
// Create -> Blob, access: Private) and connect it to this project; Vercel then
// injects BLOB_READ_WRITE_TOKEN automatically. Without it, the dashboard still
// works fully from localStorage and only the Save/Load-to-cloud buttons error.
// Private stores require every read and write to pass access: "private" and
// reads to go through get() rather than a plain fetch() of the blob URL.

// A single, fixed blob holds the admin's customized calculator settings. The
// object is guarded by the admin auth check (below), so a stable pathname is
// fine; the pathname is never linked publicly.
const BLOB_PATHNAME = "settings.json";

function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
    });
}

export async function handler(request) {
    if (!(await verifyAdminRequest(request))) {
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

// Vercel's Node.js runtime only recognizes named per-method exports or the
// `fetch` Web Standard object as a function's entry point; a bare default
// export of a (request) => Response function is treated as the legacy Node
// (req, res) => void signature, so its return value is silently dropped and
// the request hangs until the function times out.
export default { fetch: handler };
