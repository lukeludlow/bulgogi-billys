import { useState } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Locator } from "vitest/browser";
import { track } from "@vercel/analytics";
import { captureAttribution } from "@/site/attribution.ts";
import {
    DEFAULT_ESTIMATE_INPUT,
    type EstimateInput,
} from "@/site/catering/pricing.ts";
import CateringInquiryForm from "@/site/pages/catering/CateringInquiryForm.tsx";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));

function Harness() {
    const [input, setInput] = useState<EstimateInput>(DEFAULT_ESTIMATE_INPUT);
    return (
        <CateringInquiryForm
            estimateInput={input}
            onEstimateInputChange={setInput}
        />
    );
}

function stubFetch(body: unknown) {
    const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => body,
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function sentPayload(fetchMock: ReturnType<typeof vi.fn>) {
    return JSON.parse(fetchMock.mock.calls[0][1].body);
}

type Screen = Awaited<ReturnType<typeof renderWithProviders>>;

async function fillRequired({ getByRole, getByLabelText }: Screen) {
    await getByRole("textbox", { name: "Name" }).fill("Jane Doe");
    await getByRole("textbox", { name: "Phone" }).fill("936-555-0100");
    await getByRole("textbox", { name: "Email" }).fill("jane@acme.test");
    await (getByLabelText("Event date") as Locator).fill("2026-10-16");
    await getByRole("textbox", { name: "Event location / ZIP" }).fill("77380");
    await getByRole("combobox", { name: "Event type" }).selectOptions("office");
}

const submitButton = (screen: Screen) =>
    screen.getByRole("button", { name: "Request my quote" });

beforeEach(() => {
    sessionStorage.clear();
});
afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

test("does not send until the required fields are filled", async () => {
    const fetchMock = stubFetch({ success: true });
    const screen = await renderWithProviders(<Harness />);

    await submitButton(screen).click();

    expect(fetchMock).not.toHaveBeenCalled();
});

test("sends a labeled inquiry with the estimate and campaign, then confirms", async () => {
    captureAttribution(
        "https://www.bulgogibillys.com/catering?utm_source=tent&utm_campaign=fall-2026",
    );
    const fetchMock = stubFetch({ success: true });
    const screen = await renderWithProviders(<Harness />);

    await fillRequired(screen);
    await submitButton(screen).click();

    await expect
        .element(screen.getByRole("status"))
        .toHaveTextContent(
            "Thanks — Billy will reply within 24 hours. Need it sooner? Call or text (936) 900-2705.",
        );
    expect(sentPayload(fetchMock)).toMatchObject({
        subject: "Catering inquiry — 40 guests, Fri, Oct 16, 2026",
        Name: "Jane Doe",
        Phone: "936-555-0100",
        email: "jane@acme.test",
        "Preferred contact": "Call",
        "Event date": "Fri, Oct 16, 2026",
        Guests: 40,
        "Service style": "Drop-off Bulgogi Bar",
        "Event location / ZIP": "77380",
        "Event type": "Office / corporate",
        Budget: "Not sure yet",
        "Estimate shown": expect.stringContaining("Estimated $600 – $850"),
        Campaign: "tent / fall-2026 (landed on /catering)",
        botcheck: "",
    });
    expect(sentPayload(fetchMock)).not.toHaveProperty("Vegetarian option");
    expect(track).toHaveBeenCalledWith("catering_inquiry_submitted", {
        style: "dropoff",
        guests: 40,
    });
    await expect
        .element(screen.getByRole("textbox", { name: "Name" }))
        .toHaveValue("");
});

test("warns, without blocking, that Saturday mornings are the market", async () => {
    const screen = await renderWithProviders(<Harness />);

    await (screen.getByLabelText("Event date") as Locator).fill("2026-10-17");

    await expect
        .element(
            screen.getByText(/Saturday mornings we're at the Grogan's Mill/),
        )
        .toBeInTheDocument();
});

test("shows the server's error when the inquiry is rejected", async () => {
    stubFetch({ success: false, message: "Spam detected." });
    const screen = await renderWithProviders(<Harness />);

    await fillRequired(screen);
    await submitButton(screen).click();

    await expect
        .element(screen.getByRole("alert"))
        .toHaveTextContent("Spam detected.");
    expect(track).not.toHaveBeenCalled();
});
