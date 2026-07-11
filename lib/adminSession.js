export const SESSION_COOKIE_NAME = "admin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function env(name) {
    return typeof process === "undefined" ? undefined : process.env[name];
}

export function bytesToBase64Url(bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlToBytes(value) {
    const padded = value
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

export function parseCookie(cookieHeader, name) {
    for (const part of cookieHeader.split(";")) {
        const separatorIndex = part.indexOf("=");
        if (separatorIndex === -1) continue;
        if (part.slice(0, separatorIndex).trim() === name) {
            return part.slice(separatorIndex + 1).trim();
        }
    }
    return null;
}

// Constant-time comparison so a mismatching password can't be brute-forced
// via response-time measurements.
export function timingSafeEqual(a, b) {
    const aBytes = new TextEncoder().encode(a);
    const bBytes = new TextEncoder().encode(b);
    const length = Math.max(aBytes.length, bBytes.length);
    let diff = aBytes.length === bBytes.length ? 0 : 1;
    for (let i = 0; i < length; i++) {
        diff |= (aBytes[i] || 0) ^ (bBytes[i] || 0);
    }
    return diff === 0;
}

async function importHmacKey(secret) {
    return crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"],
    );
}

export async function signPayload(payload, secret) {
    const key = await importHmacKey(secret);
    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(payload),
    );
    return bytesToBase64Url(new Uint8Array(signature));
}

export async function verifySignature(payload, signature, secret) {
    const key = await importHmacKey(secret);
    let signatureBytes;
    try {
        signatureBytes = base64UrlToBytes(signature);
    } catch {
        return false;
    }
    return crypto.subtle.verify(
        "HMAC",
        key,
        signatureBytes,
        new TextEncoder().encode(payload),
    );
}

export async function createSessionCookieHeader(
    secret,
    maxAgeSeconds = SESSION_MAX_AGE_SECONDS,
) {
    const payload = bytesToBase64Url(
        new TextEncoder().encode(
            JSON.stringify({
                exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
            }),
        ),
    );
    const signature = await signPayload(payload, secret);
    return `${SESSION_COOKIE_NAME}=${payload}.${signature}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Strict`;
}

export function expiredSessionCookieHeader() {
    return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export async function isValidSessionCookie(cookieValue, secret) {
    if (!secret) return false;

    const separatorIndex = cookieValue.lastIndexOf(".");
    if (separatorIndex === -1) return false;

    const payload = cookieValue.slice(0, separatorIndex);
    const signature = cookieValue.slice(separatorIndex + 1);

    if (!(await verifySignature(payload, signature, secret))) return false;

    try {
        const decoded = JSON.parse(
            new TextDecoder().decode(base64UrlToBytes(payload)),
        );
        return (
            typeof decoded.exp === "number" &&
            decoded.exp > Math.floor(Date.now() / 1000)
        );
    } catch {
        return false;
    }
}
