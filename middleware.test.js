import { afterEach, beforeEach, expect, test, vi } from "vitest";
import middleware from "./middleware.js";
import { createSessionCookieHeader } from "./lib/adminSession.js";

const ADMIN_SESSION_SECRET = "test-session-secret";

beforeEach(() => {
    vi.stubGlobal("process", {
        env: { ADMIN_SESSION_SECRET },
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

// A real browser's Request/Headers refuse to let script set the "Cookie"
// request header (it's a forbidden header name, reserved for the browser's
// own cookie jar), which would make it impossible to simulate an incoming
// request carrying a session cookie. Vercel's Edge Runtime has no such
// restriction on inbound requests, so a plain object implementing just the
// slice of the Request interface middleware.js actually uses is a more
// accurate stand-in here than a real Request instance.
function makeRequest(url, { cookie } = {}) {
    return {
        url,
        method: "GET",
        headers: {
            get: (name) => (name.toLowerCase() === "cookie" ? (cookie ?? null) : null),
        },
    };
}

function extractSessionValue(setCookieHeader) {
    return setCookieHeader.split(";")[0].split("=").slice(1).join("=");
}

test("GET /admin with no session cookie redirects to /admin-login", async () => {
    const response = await middleware(makeRequest("https://example.com/admin"));

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(
        "https://example.com/admin-login",
    );
});

test("GET /admin with a valid, unexpired session cookie passes through", async () => {
    const setCookie = await createSessionCookieHeader(ADMIN_SESSION_SECRET);
    const sessionValue = extractSessionValue(setCookie);

    const response = await middleware(
        makeRequest("https://example.com/admin", {
            cookie: `admin_session=${sessionValue}`,
        }),
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
});

test("GET /admin/:path* with a valid session cookie also passes through", async () => {
    const setCookie = await createSessionCookieHeader(ADMIN_SESSION_SECRET);
    const sessionValue = extractSessionValue(setCookie);

    const response = await middleware(
        makeRequest("https://example.com/admin/reports", {
            cookie: `admin_session=${sessionValue}`,
        }),
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
});

test("GET /admin with a tampered signature redirects to /admin-login", async () => {
    const setCookie = await createSessionCookieHeader(ADMIN_SESSION_SECRET);
    const sessionValue = extractSessionValue(setCookie);
    const tampered =
        sessionValue.slice(0, -1) + (sessionValue.at(-1) === "a" ? "b" : "a");

    const response = await middleware(
        makeRequest("https://example.com/admin", {
            cookie: `admin_session=${tampered}`,
        }),
    );

    expect(response.status).toBe(307);
});

test("GET /admin with a cookie signed under a different secret redirects to /admin-login", async () => {
    const setCookie = await createSessionCookieHeader("a-different-secret");
    const sessionValue = extractSessionValue(setCookie);

    const response = await middleware(
        makeRequest("https://example.com/admin", {
            cookie: `admin_session=${sessionValue}`,
        }),
    );

    expect(response.status).toBe(307);
});

test("GET /admin with a validly-signed but expired cookie redirects to /admin-login", async () => {
    const setCookie = await createSessionCookieHeader(ADMIN_SESSION_SECRET, -10);
    const sessionValue = extractSessionValue(setCookie);

    const response = await middleware(
        makeRequest("https://example.com/admin", {
            cookie: `admin_session=${sessionValue}`,
        }),
    );

    expect(response.status).toBe(307);
});
