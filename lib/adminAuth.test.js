import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { _resetJwksCacheForTests, verifyAdminRequest } from "./adminAuth.js";

const SUPABASE_URL = "https://test-project.supabase.co";
const ADMIN_ALLOWED_EMAILS = "admin@example.com, second@example.com";

// Real ES256 keys, generated in the browser via WebCrypto — the same
// algorithm Supabase uses for its asymmetric JWT signing keys.
const { publicKey, privateKey } = await generateKeyPair("ES256", {
    extractable: true,
});
const jwk = { ...(await exportJWK(publicKey)), kid: "test-key", alg: "ES256" };

beforeEach(() => {
    _resetJwksCacheForTests();
    vi.stubGlobal("process", {
        env: { VITE_SUPABASE_URL: SUPABASE_URL, ADMIN_ALLOWED_EMAILS },
    });
    vi.stubGlobal(
        "fetch",
        vi.fn(async () => Response.json({ keys: [jwk] })),
    );
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

function makeRequest(token) {
    return {
        headers: {
            get: (name) =>
                name.toLowerCase() === "authorization" && token
                    ? `Bearer ${token}`
                    : null,
        },
    };
}

async function signToken({
    email = "admin@example.com",
    issuer = `${SUPABASE_URL}/auth/v1`,
    audience = "authenticated",
    expiresIn = "1h",
    key = privateKey,
} = {}) {
    return new SignJWT({ email })
        .setProtectedHeader({ alg: "ES256", kid: "test-key" })
        .setIssuedAt()
        .setIssuer(issuer)
        .setAudience(audience)
        .setExpirationTime(expiresIn)
        .sign(key);
}

test("accepts a valid token for an allowlisted email", async () => {
    const token = await signToken();
    await expect(verifyAdminRequest(makeRequest(token))).resolves.toBe(
        "admin@example.com",
    );
});

test("matches allowlist emails case-insensitively", async () => {
    const token = await signToken({ email: "Admin@Example.COM" });
    await expect(verifyAdminRequest(makeRequest(token))).resolves.toBe(
        "admin@example.com",
    );
});

test("rejects a request with no Authorization header", async () => {
    await expect(verifyAdminRequest(makeRequest(null))).resolves.toBeNull();
});

test("rejects a malformed token", async () => {
    await expect(
        verifyAdminRequest(makeRequest("not-a-jwt")),
    ).resolves.toBeNull();
});

test("rejects a token signed with the wrong key", async () => {
    const { privateKey: wrongKey } = await generateKeyPair("ES256", {
        extractable: true,
    });
    const token = await signToken({ key: wrongKey });
    await expect(verifyAdminRequest(makeRequest(token))).resolves.toBeNull();
});

test("rejects a token from a different issuer", async () => {
    const token = await signToken({
        issuer: "https://other-project.supabase.co/auth/v1",
    });
    await expect(verifyAdminRequest(makeRequest(token))).resolves.toBeNull();
});

test("rejects a token with the wrong audience", async () => {
    const token = await signToken({ audience: "anon" });
    await expect(verifyAdminRequest(makeRequest(token))).resolves.toBeNull();
});

test("rejects an expired token", async () => {
    const token = await signToken({ expiresIn: "-1h" });
    await expect(verifyAdminRequest(makeRequest(token))).resolves.toBeNull();
});

test("rejects a valid token whose email is not on the allowlist", async () => {
    const token = await signToken({ email: "stranger@example.com" });
    await expect(verifyAdminRequest(makeRequest(token))).resolves.toBeNull();
});

test("fails closed when the allowlist is empty", async () => {
    vi.stubGlobal("process", {
        env: { VITE_SUPABASE_URL: SUPABASE_URL, ADMIN_ALLOWED_EMAILS: "" },
    });
    const token = await signToken();
    await expect(verifyAdminRequest(makeRequest(token))).resolves.toBeNull();
});

test("fails closed when the Supabase URL is not configured", async () => {
    vi.stubGlobal("process", { env: { ADMIN_ALLOWED_EMAILS } });
    const token = await signToken();
    await expect(verifyAdminRequest(makeRequest(token))).resolves.toBeNull();
});

test("fetches the JWKS only once across verifications", async () => {
    await verifyAdminRequest(makeRequest(await signToken()));
    await verifyAdminRequest(makeRequest(await signToken()));
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
});
