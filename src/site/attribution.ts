/**
 * First-touch campaign attribution. Printed and posted links carry UTM tags
 * (convention in WEBSITE_REVENUE_PLAN.md Phase 1: utm_source = tent | receipt
 * | instagram | facebook | flyer | email, utm_campaign = the promotion). The
 * landing page stores them for the session, so an inquiry sent three pages
 * later still says which QR code or post brought the visitor in.
 */
export interface Attribution {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    /** The path the tagged link landed on. */
    landing_page: string;
}

const STORAGE_KEY = "bb.attribution";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;
// Keeps a hand-mangled or malicious link from stuffing the inquiry email.
const MAX_VALUE_LENGTH = 100;

function sessionStore(): Storage | undefined {
    try {
        return window.sessionStorage;
    } catch {
        // Blocked site data or a sandboxed frame.
        return undefined;
    }
}

/** The UTM tags on a URL, or null when it carries none. */
export function parseAttribution(url: string): Attribution | null {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return null;
    }
    const attribution: Attribution = { landing_page: parsed.pathname };
    let found = false;
    for (const key of UTM_KEYS) {
        const value = parsed.searchParams.get(key)?.trim();
        if (value) {
            attribution[key] = value.slice(0, MAX_VALUE_LENGTH);
            found = true;
        }
    }
    return found ? attribution : null;
}

/** Stores the landing URL's UTM tags, unless this session already has some. */
export function captureAttribution(
    url: string,
    storage: Storage | undefined = sessionStore(),
): void {
    const attribution = parseAttribution(url);
    if (!attribution || !storage) return;
    try {
        if (storage.getItem(STORAGE_KEY) === null) {
            storage.setItem(STORAGE_KEY, JSON.stringify(attribution));
        }
    } catch {
        // Storage full or blocked: attribution is best-effort.
    }
}

export function readAttribution(
    storage: Storage | undefined = sessionStore(),
): Attribution | null {
    try {
        const raw = storage?.getItem(STORAGE_KEY);
        if (!raw) return null;
        const value: unknown = JSON.parse(raw);
        if (
            typeof value !== "object" ||
            value === null ||
            typeof (value as Attribution).landing_page !== "string"
        ) {
            return null;
        }
        return value as Attribution;
    } catch {
        return null;
    }
}
