import { afterEach, expect, test, vi } from "vitest";
import { track } from "@vercel/analytics";
import { phoneClickHandlers, trackSiteEvent } from "@/site/analytics.ts";

vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));

afterEach(() => {
    vi.clearAllMocks();
});

test("sends the event name and properties to Vercel Analytics", () => {
    trackSiteEvent("catering_inquiry_submitted", {
        style: "onsite",
        guests: 60,
    });
    expect(track).toHaveBeenCalledWith("catering_inquiry_submitted", {
        style: "onsite",
        guests: 60,
    });
});

test("phone handlers tag calls and texts with their placement", () => {
    const { onCall, onText } = phoneClickHandlers("footer");

    onCall();
    onText();

    expect(track).toHaveBeenNthCalledWith(1, "click_to_call", {
        placement: "footer",
    });
    expect(track).toHaveBeenNthCalledWith(2, "click_to_text", {
        placement: "footer",
    });
});
