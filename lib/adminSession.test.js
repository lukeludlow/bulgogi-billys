import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
    createSessionCookieHeader,
    expiredSessionCookieHeader,
    parseCookie,
    signPayload,
    timingSafeEqual,
    verifySignature,
} from "./adminSession.js";

const ADMIN_SESSION_SECRET = "test-session-secret";

beforeEach(() => {
    vi.stubGlobal("process", {
        env: { ADMIN_SESSION_SECRET },
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

test("timingSafeEqual is true only for exactly equal strings", () => {
    expect(timingSafeEqual("secret", "secret")).toBe(true);
    expect(timingSafeEqual("secret", "secre1")).toBe(false);
    expect(timingSafeEqual("secret", "secrets")).toBe(false);
    expect(timingSafeEqual("", "")).toBe(true);
});

test("parseCookie extracts the named cookie from a multi-cookie header", () => {
    const header = "foo=bar; admin_session=abc.def; baz=qux";
    expect(parseCookie(header, "admin_session")).toBe("abc.def");
    expect(parseCookie(header, "missing")).toBeNull();
    expect(parseCookie("", "admin_session")).toBeNull();
});

test("a signature verifies true with the same secret and false with a different one", async () => {
    const signature = await signPayload("payload", ADMIN_SESSION_SECRET);
    expect(await verifySignature("payload", signature, ADMIN_SESSION_SECRET)).toBe(
        true,
    );
    expect(await verifySignature("payload", signature, "other-secret")).toBe(
        false,
    );
    expect(await verifySignature("tampered", signature, ADMIN_SESSION_SECRET)).toBe(
        false,
    );
});

test("createSessionCookieHeader produces a correctly-attributed cookie string", async () => {
    const setCookie = await createSessionCookieHeader(ADMIN_SESSION_SECRET);

    expect(setCookie).toContain("admin_session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Strict");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain(`Max-Age=${60 * 60 * 24 * 30}`);
});

test("expiredSessionCookieHeader clears the cookie with matching attributes to the issuing cookie", async () => {
    const issued = await createSessionCookieHeader(ADMIN_SESSION_SECRET);
    const cleared = expiredSessionCookieHeader();

    expect(cleared).toContain("admin_session=;");
    expect(cleared).toContain("Max-Age=0");
    expect(cleared).toContain("HttpOnly");
    expect(cleared).toContain("Secure");
    expect(cleared).toContain("SameSite=Strict");
    expect(cleared).toContain("Path=/");
    // Path/SameSite/HttpOnly/Secure must match between issuing and clearing
    // the cookie, or the browser won't apply the clear to the same cookie.
    for (const attribute of ["Path=/", "HttpOnly", "Secure", "SameSite=Strict"]) {
        expect(issued).toContain(attribute);
    }
});
