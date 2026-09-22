import { beforeEach, expect, test } from "vitest";
import {
    captureAttribution,
    parseAttribution,
    readAttribution,
} from "@/site/attribution.ts";

beforeEach(() => {
    sessionStorage.clear();
});

test("parses the UTM tags and landing path from a tagged link", () => {
    expect(
        parseAttribution(
            "https://www.bulgogibillys.com/catering?utm_source=tent&utm_campaign=fall-2026",
        ),
    ).toEqual({
        utm_source: "tent",
        utm_campaign: "fall-2026",
        landing_page: "/catering",
    });
});

test("ignores links without UTM tags, and blank tags", () => {
    expect(parseAttribution("https://www.bulgogibillys.com/menu")).toBeNull();
    expect(
        parseAttribution("https://www.bulgogibillys.com/?utm_source=%20"),
    ).toBeNull();
    expect(parseAttribution("not a url")).toBeNull();
});

test("caps oversized values", () => {
    const long = "x".repeat(500);
    expect(
        parseAttribution(`https://www.bulgogibillys.com/?utm_source=${long}`)
            ?.utm_source,
    ).toHaveLength(100);
});

test("keeps the first touch for the rest of the session", () => {
    captureAttribution("https://www.bulgogibillys.com/?utm_source=tent");
    captureAttribution("https://www.bulgogibillys.com/menu?utm_source=flyer");
    captureAttribution("https://www.bulgogibillys.com/catering");

    expect(readAttribution()).toEqual({
        utm_source: "tent",
        landing_page: "/",
    });
});

test("reads nothing when nothing was captured or the value is corrupt", () => {
    expect(readAttribution()).toBeNull();
    sessionStorage.setItem("bb.attribution", "{not json");
    expect(readAttribution()).toBeNull();
    sessionStorage.setItem("bb.attribution", '{"utm_source":"tent"}');
    expect(readAttribution()).toBeNull();
});

test("survives storage that throws", () => {
    const broken = {
        getItem() {
            throw new Error("blocked");
        },
        setItem() {
            throw new Error("blocked");
        },
    } as unknown as Storage;

    expect(() =>
        captureAttribution("https://x.test/?utm_source=tent", broken),
    ).not.toThrow();
    expect(readAttribution(broken)).toBeNull();
});
