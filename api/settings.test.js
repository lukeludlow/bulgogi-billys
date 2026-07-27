import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { get, put } from "@vercel/blob";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { handler } from "./settings.js";
import { _resetJwksCacheForTests } from "../lib/adminAuth.js";

// Mock the Vercel Blob SDK so no real network/store is touched.
vi.mock("@vercel/blob", () => ({
    get: vi.fn(async () => null),
    put: vi.fn(async () => ({ url: "https://blob.example/settings.json" })),
}));

const SUPABASE_URL = "https://test-project.supabase.co";
const ADMIN_ALLOWED_EMAILS = "admin@example.com";
const BLOB_READ_WRITE_TOKEN = "test-blob-token";

// Real ES256 keys stand in for Supabase's asymmetric JWT signing keys; the
// stubbed fetch below serves the matching JWKS.
const { publicKey, privateKey } = await generateKeyPair("ES256", {
    extractable: true,
});
const jwk = { ...(await exportJWK(publicKey)), kid: "test-key", alg: "ES256" };

beforeEach(() => {
    _resetJwksCacheForTests();
    vi.stubGlobal("process", {
        env: {
            VITE_SUPABASE_URL: SUPABASE_URL,
            ADMIN_ALLOWED_EMAILS,
            BLOB_READ_WRITE_TOKEN,
        },
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

// Plain-object request stub — mirrors the Vercel runtime's Request without
// browser Request restrictions. Same pattern as lib/adminAuth.test.js.
function makeRequest({ method = "GET", token = "", body } = {}) {
    return {
        method,
        headers: {
            get: (name) =>
                name.toLowerCase() === "authorization" && token
                    ? `Bearer ${token}`
                    : null,
        },
        text: async () => body,
    };
}

async function validToken(email = "admin@example.com") {
    return new SignJWT({ email })
        .setProtectedHeader({ alg: "ES256", kid: "test-key" })
        .setIssuedAt()
        .setIssuer(`${SUPABASE_URL}/auth/v1`)
        .setAudience("authenticated")
        .setExpirationTime("1h")
        .sign(privateKey);
}

test("responds 401 when no bearer token is present", async () => {
    const response = await handler(makeRequest({ method: "GET" }));
    expect(response.status).toBe(401);
});

test("responds 401 for a garbage token", async () => {
    const response = await handler(
        makeRequest({ method: "GET", token: "not-a-jwt" }),
    );
    expect(response.status).toBe(401);
});

test("responds 401 for a valid token whose email is not allowlisted", async () => {
    const response = await handler(
        makeRequest({ method: "GET", token: await validToken("nope@example.com") }),
    );
    expect(response.status).toBe(401);
});

test("GET returns an empty object when nothing is stored yet", async () => {
    vi.mocked(get).mockResolvedValueOnce(null);
    const response = await handler(
        makeRequest({ method: "GET", token: await validToken() }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({});
});

test("GET returns the stored settings blob", async () => {
    const stored = { version: 1, hello: "world" };
    vi.mocked(get).mockResolvedValueOnce({
        statusCode: 200,
        stream: new Response(JSON.stringify(stored)).body,
        headers: new Headers(),
        blob: {
            url: "https://blob.example/settings.json",
            downloadUrl: "https://blob.example/settings.json",
            pathname: "settings.json",
            contentDisposition: "",
            cacheControl: "",
            uploadedAt: new Date(),
            etag: "etag",
            contentType: "application/json",
            size: JSON.stringify(stored).length,
        },
    });
    const response = await handler(
        makeRequest({ method: "GET", token: await validToken() }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(stored);
});

test("PUT persists a well-formed settings body to blob", async () => {
    const body = JSON.stringify({ version: 1, packagingCostPerOrder: 0.3 });
    const response = await handler(
        makeRequest({ method: "PUT", token: await validToken(), body }),
    );
    expect(response.status).toBe(200);
    expect(vi.mocked(put)).toHaveBeenCalledWith(
        "settings.json",
        body,
        expect.objectContaining({ access: "private", allowOverwrite: true }),
    );
});

test("PUT rejects a malformed body with 400", async () => {
    const response = await handler(
        makeRequest({ method: "PUT", token: await validToken(), body: "not json" }),
    );
    expect(response.status).toBe(400);
    expect(vi.mocked(put)).not.toHaveBeenCalled();
});

test("responds 405 for unsupported methods", async () => {
    const response = await handler(
        makeRequest({ method: "DELETE", token: await validToken() }),
    );
    expect(response.status).toBe(405);
});
