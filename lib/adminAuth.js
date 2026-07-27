import { createLocalJWKSet, jwtVerify } from "jose";

export function env(name) {
    return typeof process === "undefined" ? undefined : process.env[name];
}

// The JWKS (Supabase's public signing keys) is fetched once per runtime and
// cached for the life of the function instance. A local key set over a plain
// fetch — rather than jose's createRemoteJWKSet — so tests can stub fetch.
let jwksCache = null; // { url, keySet }

export function _resetJwksCacheForTests() {
    jwksCache = null;
}

async function getKeySet(supabaseUrl) {
    const url = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
    if (jwksCache?.url !== url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`JWKS fetch failed (${response.status})`);
        }
        jwksCache = { url, keySet: createLocalJWKSet(await response.json()) };
    }
    return jwksCache.keySet;
}

function allowedEmails() {
    return (env("ADMIN_ALLOWED_EMAILS") || "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);
}

/**
 * Authorize an admin API request: verify the Supabase access token in the
 * Authorization header (signature via the project's JWKS, issuer, audience,
 * expiry) and require the token's email to be on the ADMIN_ALLOWED_EMAILS
 * allowlist. Fails closed: missing config or an empty allowlist rejects
 * everyone. Returns the verified admin email, or null when unauthorized.
 */
export async function verifyAdminRequest(request) {
    const supabaseUrl = env("VITE_SUPABASE_URL");
    const allowed = allowedEmails();
    const authHeader = request.headers?.get?.("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : null;
    if (!supabaseUrl || allowed.length === 0 || !token) return null;
    try {
        const { payload } = await jwtVerify(token, await getKeySet(supabaseUrl), {
            issuer: `${supabaseUrl}/auth/v1`,
            audience: "authenticated",
        });
        const email =
            typeof payload.email === "string" ? payload.email.toLowerCase() : "";
        return allowed.includes(email) ? email : null;
    } catch {
        return null;
    }
}
