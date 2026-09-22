import type { Attribution } from "@/site/attribution.ts";
import {
    CATERING_PRICING,
    clampGuests,
    SERVICE_STYLE_IDS,
    type ServiceStyleId,
} from "@/site/catering/pricing.ts";
import type { SubmissionPayload } from "@/site/forms/web3forms.ts";

/** Select options for the inquiry form: value → the label Billy reads. */
export const PREFERRED_CONTACT = {
    call: "Call",
    text: "Text",
    email: "Email",
} as const;

export const EVENT_TYPES = {
    office: "Office / corporate",
    birthday: "Birthday",
    wedding: "Wedding",
    church_school: "Church or school",
    brewery: "Brewery",
    community: "Community event",
    other: "Other",
} as const;

export const BUDGET_RANGES = {
    under_500: "Under $500",
    "500_1000": "$500 – $1,000",
    "1000_2000": "$1,000 – $2,000",
    over_2000: "$2,000+",
    unsure: "Not sure yet",
} as const;

export const HEARD_FROM = {
    market: "At a market",
    instagram: "Instagram",
    facebook: "Facebook",
    google: "Google",
    friend: "A friend",
    other: "Other",
} as const;

export interface InquiryFields {
    name: string;
    company: string;
    phone: string;
    email: string;
    preferredContact: keyof typeof PREFERRED_CONTACT;
    /** YYYY-MM-DD, from a date input. */
    eventDate: string;
    /** HH:MM (24 h), from a time input; may be blank. */
    startTime: string;
    guests: number;
    style: ServiceStyleId;
    location: string;
    eventType: keyof typeof EVENT_TYPES;
    budget: keyof typeof BUDGET_RANGES;
    vegetarianNeeded: boolean;
    vegetarianGuests: number | null;
    dietaryNeeds: string;
    heardFrom: keyof typeof HEARD_FROM | "";
    notes: string;
}

function pick<T extends Record<string, string>>(
    options: T,
    value: string,
    fallback: keyof T,
): keyof T {
    return Object.hasOwn(options, value) ? (value as keyof T) : fallback;
}

/** Reads the inquiry form's fields, falling back to safe defaults. */
export function readInquiryForm(data: FormData): InquiryFields {
    const text = (key: string) => String(data.get(key) ?? "").trim();
    const vegetarianGuests = Number.parseInt(text("vegetarianGuests"), 10);
    const heardFrom = text("heardFrom");
    const style = text("style") as ServiceStyleId;

    return {
        name: text("name"),
        company: text("company"),
        phone: text("phone"),
        email: text("email"),
        preferredContact: pick(
            PREFERRED_CONTACT,
            text("preferredContact"),
            "call",
        ),
        eventDate: text("eventDate"),
        startTime: text("startTime"),
        guests: clampGuests(Number(text("guests"))),
        style: SERVICE_STYLE_IDS.includes(style) ? style : "dropoff",
        location: text("location"),
        eventType: pick(EVENT_TYPES, text("eventType"), "other"),
        budget: pick(BUDGET_RANGES, text("budget"), "unsure"),
        vegetarianNeeded: data.has("vegetarianNeeded"),
        vegetarianGuests:
            Number.isFinite(vegetarianGuests) && vegetarianGuests > 0
                ? vegetarianGuests
                : null,
        dietaryNeeds: text("dietaryNeeds"),
        heardFrom: Object.hasOwn(HEARD_FROM, heardFrom)
            ? (heardFrom as keyof typeof HEARD_FROM)
            : "",
        notes: text("notes"),
    };
}

/** "Sat, Oct 18, 2026" for an ISO date, read as a calendar date (no time zone shift). */
export function formatEventDate(isoDate: string): string {
    const date = new Date(`${isoDate}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return isoDate;
    return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

/** Saturday mornings are the Grogan's Mill market, so the form warns about them. */
export function isSaturday(isoDate: string): boolean {
    const date = new Date(`${isoDate}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.getUTCDay() === 6;
}

/** "11:30 AM" for a time input's "11:30". */
export function formatStartTime(time: string): string {
    const match = /^(\d{1,2}):(\d{2})/.exec(time);
    if (!match) return time;
    const hours = Number(match[1]);
    const suffix = hours >= 12 ? "PM" : "AM";
    return `${hours % 12 || 12}:${match[2]} ${suffix}`;
}

function describeAttribution(attribution: Attribution): string {
    const tags = [
        attribution.utm_source,
        attribution.utm_medium,
        attribution.utm_campaign,
    ].filter(Boolean);
    return `${tags.join(" / ")} (landed on ${attribution.landing_page})`;
}

/**
 * The Web3Forms payload. Web3Forms emails every key as a labeled line, so
 * the keys are the labels Billy reads; `email` stays lowercase because
 * Web3Forms uses it as the reply-to address. Blank optional answers are left
 * out to keep the email short.
 */
export function buildInquiryPayload(
    fields: InquiryFields,
    estimateSummary: string,
    attribution: Attribution | null,
): SubmissionPayload {
    const date = fields.eventDate
        ? formatEventDate(fields.eventDate)
        : "date TBD";
    const vegetarian = fields.vegetarianNeeded
        ? fields.vegetarianGuests
            ? `Yes — ${fields.vegetarianGuests} guests`
            : "Yes — count TBD"
        : "No";

    const payload: Record<string, string | number> = {
        subject: `Catering inquiry — ${fields.guests} guests, ${date}`,
        from_name: "Bulgogi Billy's website",
        Name: fields.name,
        Company: fields.company,
        Phone: fields.phone,
        email: fields.email,
        "Preferred contact": PREFERRED_CONTACT[fields.preferredContact],
        "Event date": fields.eventDate ? date : "",
        "Start time": fields.startTime ? formatStartTime(fields.startTime) : "",
        Guests: fields.guests,
        "Service style": CATERING_PRICING.styles[fields.style].name,
        "Event location / ZIP": fields.location,
        "Event type": EVENT_TYPES[fields.eventType],
        Budget: BUDGET_RANGES[fields.budget],
        "Vegetarian option": vegetarian,
        "Other dietary needs": fields.dietaryNeeds,
        "Heard about us from": fields.heardFrom
            ? HEARD_FROM[fields.heardFrom]
            : "",
        "Anything else": fields.notes,
        "Estimate shown": estimateSummary,
        Campaign: attribution ? describeAttribution(attribution) : "",
    };

    return Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== ""),
    );
}
