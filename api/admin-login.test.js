import { afterEach, beforeEach, expect, test, vi } from "vitest";
import handler from "./admin-login.js";

const ADMIN_PASSWORD = "correct-password";
const ADMIN_SESSION_SECRET = "test-session-secret";

beforeEach(() => {
    vi.stubGlobal("process", {
        env: { ADMIN_PASSWORD, ADMIN_SESSION_SECRET },
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

// A real browser's Request/Headers refuse to let script set the "Cookie"
// request header, and "Set-Cookie" is unreadable on any script-constructed
// Response (both are Fetch-spec forbidden header names, unrelated to how the
// Request/Response was built) — restrictions Vercel's Edge Runtime doesn't
// have. A plain object implementing just the slice of the Request interface
// the handler actually uses sidesteps the request-side restriction; the
// cookie string itself is covered directly in adminSession.test.js, so these
// tests only assert status codes for the Set-Cookie-bearing response.
function makeRequest({ method = "POST", body } = {}) {
    return {
        method,
        json: async () => JSON.parse(body),
    };
}

test("responds 405 for non-POST methods", async () => {
    const response = await handler(makeRequest({ method: "GET" }));
    expect(response.status).toBe(405);
});

test("responds 400 for a malformed body", async () => {
    const response = await handler(makeRequest({ body: "not json" }));
    expect(response.status).toBe(400);
});

test("responds 401 for the wrong password", async () => {
    const response = await handler(
        makeRequest({ body: JSON.stringify({ password: "wrong-password" }) }),
    );
    expect(response.status).toBe(401);
});

test("responds 200 for the correct password", async () => {
    const response = await handler(
        makeRequest({ body: JSON.stringify({ password: ADMIN_PASSWORD }) }),
    );
    expect(response.status).toBe(200);
});
