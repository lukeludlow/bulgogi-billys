import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { list, put } from "@vercel/blob";
import handler from "./settings.js";
import {
    createSessionCookieHeader,
    expiredSessionCookieHeader,
} from "../lib/adminSession.js";

// Mock the Vercel Blob SDK so no real network/store is touched.
vi.mock("@vercel/blob", () => ({
    list: vi.fn(async () => ({ blobs: [] })),
    put: vi.fn(async () => ({ url: "https://blob.example/settings.json" })),
}));

const ADMIN_SESSION_SECRET = "test-session-secret";
const BLOB_READ_WRITE_TOKEN = "test-blob-token";

beforeEach(() => {
    vi.stubGlobal("process", {
        env: { ADMIN_SESSION_SECRET, BLOB_READ_WRITE_TOKEN },
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

// Plain-object request stub — a real browser Response won't expose Set-Cookie
// and a browser Request forbids scripting the Cookie header, but Vercel's edge
// runtime has no such restriction. This mirrors api/admin-login.test.js.
function makeRequest({ method = "GET", cookie = "", body } = {}) {
    return {
        method,
        headers: { get: (name) => (name.toLowerCase() === "cookie" ? cookie : null) },
        text: async () => body,
    };
}

async function validCookie() {
    const header = await createSessionCookieHeader(ADMIN_SESSION_SECRET);
    return header.split(";")[0]; // "admin_session=payload.signature"
}

test("responds 401 when no session cookie is present", async () => {
    const response = await handler(makeRequest({ method: "GET" }));
    expect(response.status).toBe(401);
});

test("responds 401 for an expired/invalid session cookie", async () => {
    const cookie = expiredSessionCookieHeader().split(";")[0];
    const response = await handler(makeRequest({ method: "GET", cookie }));
    expect(response.status).toBe(401);
});

test("GET returns an empty object when nothing is stored yet", async () => {
    vi.mocked(list).mockResolvedValueOnce({ blobs: [] });
    const response = await handler(
        makeRequest({ method: "GET", cookie: await validCookie() }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({});
});

test("GET returns the stored settings blob", async () => {
    const stored = { version: 1, hello: "world" };
    vi.mocked(list).mockResolvedValueOnce({
        blobs: [{ url: "https://blob.example/settings.json" }],
    });
    vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(JSON.stringify(stored))),
    );
    const response = await handler(
        makeRequest({ method: "GET", cookie: await validCookie() }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(stored);
});

test("PUT persists a well-formed settings body to blob", async () => {
    const body = JSON.stringify({ version: 1, packagingCostPerOrder: 0.3 });
    const response = await handler(
        makeRequest({ method: "PUT", cookie: await validCookie(), body }),
    );
    expect(response.status).toBe(200);
    expect(vi.mocked(put)).toHaveBeenCalledWith(
        "settings.json",
        body,
        expect.objectContaining({ access: "public", allowOverwrite: true }),
    );
});

test("PUT rejects a malformed body with 400", async () => {
    const response = await handler(
        makeRequest({ method: "PUT", cookie: await validCookie(), body: "not json" }),
    );
    expect(response.status).toBe(400);
    expect(vi.mocked(put)).not.toHaveBeenCalled();
});

test("responds 405 for unsupported methods", async () => {
    const response = await handler(
        makeRequest({ method: "DELETE", cookie: await validCookie() }),
    );
    expect(response.status).toBe(405);
});
