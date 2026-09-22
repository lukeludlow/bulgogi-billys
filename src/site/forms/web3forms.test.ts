import { afterEach, expect, test, vi } from "vitest";
import {
    submitToWeb3Forms,
    WEB3FORMS_ENDPOINT,
} from "@/site/forms/web3forms.ts";

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

function stubFetch(response: { ok: boolean; body: unknown }) {
    const fetchMock = vi.fn().mockResolvedValue({
        ok: response.ok,
        json: async () => response.body,
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

test("posts the payload as JSON with the access key added", async () => {
    const fetchMock = stubFetch({ ok: true, body: { success: true } });

    await submitToWeb3Forms({ name: "Jane", Guests: 40 });

    expect(fetchMock).toHaveBeenCalledWith(
        WEB3FORMS_ENDPOINT,
        expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ name: "Jane", Guests: 40 });
    expect(body.access_key).toEqual(expect.any(String));
});

test("reports success only when Web3Forms says so", async () => {
    stubFetch({ ok: true, body: { success: true } });
    expect(await submitToWeb3Forms({})).toEqual({ ok: true });
});

test("passes on the server's rejection message", async () => {
    stubFetch({
        ok: true,
        body: { success: false, message: "Spam detected." },
    });
    expect(await submitToWeb3Forms({})).toEqual({
        ok: false,
        message: "Spam detected.",
    });
});

test("falls back to a generic message when the server gives none", async () => {
    stubFetch({ ok: false, body: {} });
    expect(await submitToWeb3Forms({})).toEqual({
        ok: false,
        message: "Something went wrong with the submission.",
    });
});

test("turns a network failure into a retry message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await submitToWeb3Forms({})).toEqual({
        ok: false,
        message: "Failed to send message. Please try again later.",
    });
});
