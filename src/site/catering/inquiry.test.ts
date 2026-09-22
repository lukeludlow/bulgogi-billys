import { expect, test } from "vitest";
import {
    buildInquiryPayload,
    formatEventDate,
    formatStartTime,
    isSaturday,
    readInquiryForm,
    type InquiryFields,
} from "@/site/catering/inquiry.ts";

function formData(entries: Record<string, string>): FormData {
    const data = new FormData();
    for (const [key, value] of Object.entries(entries)) data.set(key, value);
    return data;
}

const COMPLETE: Record<string, string> = {
    name: " Jane Doe ",
    company: "Acme Energy",
    phone: "936-555-0100",
    email: "jane@acme.test",
    preferredContact: "text",
    eventDate: "2026-10-16",
    startTime: "11:30",
    guests: "60",
    style: "onsite",
    location: "77380",
    eventType: "office",
    budget: "1000_2000",
    vegetarianNeeded: "yes",
    vegetarianGuests: "8",
    dietaryNeeds: "One peanut allergy",
    heardFrom: "market",
    notes: "Parking lot setup",
};

function fields(overrides: Partial<InquiryFields> = {}): InquiryFields {
    return { ...readInquiryForm(formData(COMPLETE)), ...overrides };
}

test("reads and trims every field of a complete form", () => {
    expect(readInquiryForm(formData(COMPLETE))).toEqual({
        name: "Jane Doe",
        company: "Acme Energy",
        phone: "936-555-0100",
        email: "jane@acme.test",
        preferredContact: "text",
        eventDate: "2026-10-16",
        startTime: "11:30",
        guests: 60,
        style: "onsite",
        location: "77380",
        eventType: "office",
        budget: "1000_2000",
        vegetarianNeeded: true,
        vegetarianGuests: 8,
        dietaryNeeds: "One peanut allergy",
        heardFrom: "market",
        notes: "Parking lot setup",
    });
});

test("falls back to safe values for missing or tampered fields", () => {
    const read = readInquiryForm(
        formData({
            preferredContact: "fax",
            guests: "9999",
            style: "catapult",
            eventType: "",
            budget: "constructor",
            vegetarianGuests: "-3",
            heardFrom: "tv",
        }),
    );
    expect(read).toMatchObject({
        preferredContact: "call",
        guests: 300,
        style: "dropoff",
        eventType: "other",
        budget: "unsure",
        vegetarianNeeded: false,
        vegetarianGuests: null,
        heardFrom: "",
    });
});

test("labels every answer the way Billy reads it", () => {
    expect(
        buildInquiryPayload(fields(), "On-site · 60 guests → $1,320 – $1,585", {
            utm_source: "tent",
            utm_campaign: "fall-2026",
            landing_page: "/catering",
        }),
    ).toEqual({
        subject: "Catering inquiry — 60 guests, Fri, Oct 16, 2026",
        from_name: "Bulgogi Billy's website",
        Name: "Jane Doe",
        Company: "Acme Energy",
        Phone: "936-555-0100",
        email: "jane@acme.test",
        "Preferred contact": "Text",
        "Event date": "Fri, Oct 16, 2026",
        "Start time": "11:30 AM",
        Guests: 60,
        "Service style": "On-site Tent Service",
        "Event location / ZIP": "77380",
        "Event type": "Office / corporate",
        Budget: "$1,000 – $2,000",
        "Vegetarian option": "Yes — 8 guests",
        "Other dietary needs": "One peanut allergy",
        "Heard about us from": "At a market",
        "Anything else": "Parking lot setup",
        "Estimate shown": "On-site · 60 guests → $1,320 – $1,585",
        Campaign: "tent / fall-2026 (landed on /catering)",
    });
});

test("leaves blank optional answers and missing attribution out", () => {
    const payload = buildInquiryPayload(
        fields({
            company: "",
            startTime: "",
            dietaryNeeds: "",
            heardFrom: "",
            notes: "",
        }),
        "summary",
        null,
    );
    for (const key of [
        "Company",
        "Start time",
        "Other dietary needs",
        "Heard about us from",
        "Anything else",
        "Campaign",
    ]) {
        expect(payload, key).not.toHaveProperty(key);
    }
});

test("describes the vegetarian answer", () => {
    const vegetarian = (overrides: Partial<InquiryFields>) =>
        buildInquiryPayload(fields(overrides), "", null)["Vegetarian option"];
    expect(vegetarian({ vegetarianNeeded: false })).toBe("No");
    expect(vegetarian({ vegetarianGuests: null })).toBe("Yes — count TBD");
});

test("formats dates as calendar days and times on a 12-hour clock", () => {
    expect(formatEventDate("2026-10-18")).toBe("Sun, Oct 18, 2026");
    expect(formatEventDate("garbage")).toBe("garbage");
    expect(formatStartTime("00:15")).toBe("12:15 AM");
    expect(formatStartTime("12:00")).toBe("12:00 PM");
    expect(formatStartTime("18:45")).toBe("6:45 PM");
    expect(formatStartTime("soon")).toBe("soon");
});

test("spots Saturdays, when the market takes the morning", () => {
    expect(isSaturday("2026-10-17")).toBe(true);
    expect(isSaturday("2026-10-18")).toBe(false);
    expect(isSaturday("")).toBe(false);
});
