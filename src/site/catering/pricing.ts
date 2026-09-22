/**
 * The catering price model behind /catering. The service-style cards, the
 * package cards and the instant estimator all price through
 * estimateCateringQuote(), so no two parts of the page can disagree.
 *
 * These are the PROPOSED numbers from WEBSITE_REVENUE_PLAN.md §3.2, published
 * ahead of Billy's sign-off (§6 decision 1). Changing a price is a data edit
 * in CATERING_PRICING — nothing else hardcodes one — and is the seam for
 * moving the config into Supabase settings later.
 */

export type ServiceStyleId = "dropoff" | "onsite" | "popup";
export type DayType = "weekday" | "weekend";
export type DistanceBandId = "near" | "mid" | "far";
export type AddOnId = "extraTacos" | "texasSize" | "drinks" | "extraKimchi";

interface ServiceStyleBase {
    name: string;
    summary: string;
}

interface PerPersonStyle extends ServiceStyleBase {
    kind: "perPerson";
    perPerson: number;
    /** Smaller groups are billed as this many guests. */
    minGuests: number;
    /** Order minimum by day type; 0 means none. */
    minimum: Record<DayType, number>;
}

interface PopupStyle extends ServiceStyleBase {
    kind: "popup";
    /** Guests buy their own meals, so hosting costs nothing. */
    hostCost: number;
    /** Expected buyers needed, or the host guarantees a sales floor. */
    minBuyers: number;
}

export type ServiceStyle = PerPersonStyle | PopupStyle;

export const CATERING_PRICING = {
    styles: {
        dropoff: {
            kind: "perPerson",
            name: "Drop-off Bulgogi Bar",
            summary:
                "Trays of beef bulgogi, steamed rice, kimchi and Seoul sauce, delivered ready to serve. Fries or tortillas as add-ons.",
            perPerson: 17,
            minGuests: 20,
            minimum: { weekday: 0, weekend: 0 },
        },
        onsite: {
            kind: "perPerson",
            name: "On-site Tent Service",
            summary:
                "Billy sets up the tent and cooks to order from a short menu — the live grill people saw on TikTok.",
            perPerson: 22,
            minGuests: 0,
            minimum: { weekday: 1000, weekend: 1500 },
        },
        popup: {
            kind: "popup",
            name: "Employee-Paid Pop-Up",
            summary:
                "For office parks, breweries and apartment communities. We set up, and guests buy their own meals.",
            hostCost: 0,
            minBuyers: 40,
        },
    } satisfies Record<ServiceStyleId, ServiceStyle>,
    /** The estimate's high end sits this far above its low end. */
    rangeSpread: 0.2,
    /** Every dollar figure is rounded to a multiple of this. */
    roundTo: 5,
    /** Share of the low estimate that holds the date. */
    depositShare: 0.5,
    guests: { min: 10, max: 300, step: 5 },
    days: { weekday: "Mon–Thu", weekend: "Fri–Sun" } satisfies Record<
        DayType,
        string
    >,
    distanceBands: {
        near: {
            label: "Within 25 mi of The Woodlands / Conroe",
            travelQuoted: false,
        },
        mid: { label: "25–45 mi away", travelQuoted: true },
        far: { label: "45+ mi away", travelQuoted: true },
    } satisfies Record<
        DistanceBandId,
        { label: string; travelQuoted: boolean }
    >,
    /** Add-ons are quoted by Billy, not priced by the estimator. */
    addOns: {
        extraTacos: "Extra tacos",
        texasSize: "Texas-size portions",
        drinks: "Drinks",
        extraKimchi: "Extra kimchi",
    } satisfies Record<AddOnId, string>,
} as const;

export const SERVICE_STYLE_IDS: readonly ServiceStyleId[] = [
    "dropoff",
    "onsite",
    "popup",
];
export const DAY_TYPES: readonly DayType[] = ["weekday", "weekend"];
export const DISTANCE_BAND_IDS: readonly DistanceBandId[] = [
    "near",
    "mid",
    "far",
];
export const ADD_ON_IDS: readonly AddOnId[] = [
    "extraTacos",
    "texasSize",
    "drinks",
    "extraKimchi",
];

export interface EstimateInput {
    guests: number;
    style: ServiceStyleId;
    day: DayType;
    distance: DistanceBandId;
    addOns: readonly AddOnId[];
}

export type CateringEstimate =
    | {
          kind: "range";
          low: number;
          high: number;
          deposit: number;
          /** Which floor raised the price, if any. */
          minimumApplied: "guests" | DayType | null;
          /** Add-ons or travel are on top of the range, quoted by Billy. */
          quotedExtras: boolean;
      }
    | { kind: "popup"; hostCost: number; minBuyers: number };

export const DEFAULT_ESTIMATE_INPUT: EstimateInput = {
    guests: 40,
    style: "dropoff",
    day: "weekday",
    distance: "near",
    addOns: [],
};

function roundDown(amount: number): number {
    const step = CATERING_PRICING.roundTo;
    return Math.floor(amount / step) * step;
}

function roundUp(amount: number): number {
    const step = CATERING_PRICING.roundTo;
    // Settle float noise first (2200 × 1.2 is 2640.0000000000005), so an
    // exact multiple doesn't round up a whole step.
    const cents = Math.round(amount * 100) / 100;
    return Math.ceil(cents / step) * step;
}

function roundNearest(amount: number): number {
    const step = CATERING_PRICING.roundTo;
    return Math.round(amount / step) * step;
}

/** Keeps a guest count inside the estimator's bounds, as a whole number. */
export function clampGuests(guests: number): number {
    const { min, max } = CATERING_PRICING.guests;
    if (!Number.isFinite(guests)) return min;
    return Math.min(max, Math.max(min, Math.round(guests)));
}

export function estimateCateringQuote(input: EstimateInput): CateringEstimate {
    const { min, max } = CATERING_PRICING.guests;
    if (!Number.isInteger(input.guests) || input.guests < min) {
        throw new RangeError(`guests must be a whole number ≥ ${min}`);
    }
    if (input.guests > max) {
        throw new RangeError(`guests must be ≤ ${max}`);
    }

    const style: ServiceStyle = CATERING_PRICING.styles[input.style];
    if (style.kind === "popup") {
        return {
            kind: "popup",
            hostCost: style.hostCost,
            minBuyers: style.minBuyers,
        };
    }

    const billedGuests = Math.max(input.guests, style.minGuests);
    const subtotal = billedGuests * style.perPerson;
    const dayMinimum = style.minimum[input.day];
    const base = Math.max(subtotal, dayMinimum);

    let minimumApplied: "guests" | DayType | null = null;
    if (dayMinimum > subtotal) minimumApplied = input.day;
    else if (billedGuests > input.guests) minimumApplied = "guests";

    const low = roundDown(base);
    return {
        kind: "range",
        low,
        high: roundUp(base * (1 + CATERING_PRICING.rangeSpread)),
        deposit: roundNearest(low * CATERING_PRICING.depositShare),
        minimumApplied,
        quotedExtras:
            input.addOns.length > 0 ||
            CATERING_PRICING.distanceBands[input.distance].travelQuoted,
    };
}

const usd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
});

/** "$1,320" */
export function formatPrice(amount: number): string {
    return usd.format(amount);
}

/** "$1,320 – $1,585", or "$0 to host" for a pop-up. */
export function formatEstimate(estimate: CateringEstimate): string {
    return estimate.kind === "popup"
        ? `${formatPrice(estimate.hostCost)} to host`
        : `${formatPrice(estimate.low)} – ${formatPrice(estimate.high)}`;
}

/** Explains which floor raised the price, or null when none did. */
export function minimumNote(
    input: EstimateInput,
    estimate: CateringEstimate,
): string | null {
    if (estimate.kind === "popup") {
        return `Needs about ${estimate.minBuyers}+ expected buyers, or a sales guarantee.`;
    }
    const style = CATERING_PRICING.styles[input.style];
    if (style.kind === "popup" || estimate.minimumApplied === null) return null;
    if (estimate.minimumApplied === "guests") {
        return `${style.name} starts at ${style.minGuests} guests, so this is priced for ${style.minGuests}.`;
    }
    const day = estimate.minimumApplied;
    return `${CATERING_PRICING.days[day]} minimum of ${formatPrice(style.minimum[day])} applied.`;
}

/**
 * One line that tells Billy what the buyer already expects, e.g.
 * "On-site Tent Service · 60 guests · Mon–Thu · Within 25 mi of The
 * Woodlands / Conroe → Estimated $1,320 – $1,585, 50% deposit $660".
 */
export function describeEstimate(
    input: EstimateInput,
    estimate: CateringEstimate,
): string {
    const style = CATERING_PRICING.styles[input.style];
    const parts = [
        style.name,
        `${input.guests} guests`,
        CATERING_PRICING.days[input.day],
        CATERING_PRICING.distanceBands[input.distance].label,
    ];
    if (input.addOns.length > 0) {
        parts.push(
            `Add-ons: ${input.addOns.map((id) => CATERING_PRICING.addOns[id]).join(", ")}`,
        );
    }

    let outcome: string;
    if (estimate.kind === "popup") {
        outcome = `${formatEstimate(estimate)}, needs ~${estimate.minBuyers}+ buyers`;
    } else {
        outcome = `Estimated ${formatEstimate(estimate)}, ${Math.round(CATERING_PRICING.depositShare * 100)}% deposit ${formatPrice(estimate.deposit)}`;
        const note = minimumNote(input, estimate);
        if (note) outcome += ` (${note.replace(/\.$/, "")})`;
        if (estimate.quotedExtras) {
            outcome += "; add-ons & travel quoted separately";
        }
    }
    return `${parts.join(" · ")} → ${outcome}`;
}

export interface CateringPackage {
    name: string;
    blurb: string;
    guests: number;
    style: Exclude<ServiceStyleId, "popup">;
    day: DayType;
}

/** Named starting points (Growth Plan §12.2), priced by the estimator. */
export const CATERING_PACKAGES: readonly CateringPackage[] = [
    {
        name: "Backyard",
        blurb: "Birthdays, graduations and family get-togethers.",
        guests: 20,
        style: "dropoff",
        day: "weekend",
    },
    {
        name: "Office Lunch",
        blurb: "A team lunch that isn't pizza or sandwiches.",
        guests: 40,
        style: "dropoff",
        day: "weekday",
    },
    {
        name: "Party",
        blurb: "The live grill at your party, cooked to order.",
        guests: 60,
        style: "onsite",
        day: "weekday",
    },
    {
        name: "Big Event",
        blurb: "Company picnics, church and school events, festivals.",
        guests: 100,
        style: "onsite",
        day: "weekend",
    },
];

export function packageInput(pkg: CateringPackage): EstimateInput {
    return {
        guests: pkg.guests,
        style: pkg.style,
        day: pkg.day,
        distance: "near",
        addOns: [],
    };
}

/** True when the package would cost something different on the other day type. */
export function packageDependsOnDay(pkg: CateringPackage): boolean {
    const other: DayType = pkg.day === "weekday" ? "weekend" : "weekday";
    const here = estimateCateringQuote(packageInput(pkg));
    const there = estimateCateringQuote({ ...packageInput(pkg), day: other });
    return formatEstimate(here) !== formatEstimate(there);
}

/** "$17/person" — a style's starting price, for the cards and the page meta. */
export function perPersonPrice(style: "dropoff" | "onsite"): string {
    return `${formatPrice(CATERING_PRICING.styles[style].perPerson)}/person`;
}

/** The price line on a service-style card. */
export function stylePriceLine(id: ServiceStyleId): string {
    const style: ServiceStyle = CATERING_PRICING.styles[id];
    if (style.kind === "popup") {
        return `${formatPrice(style.hostCost)} to host · needs ~${style.minBuyers}+ buyers or a sales guarantee`;
    }
    const parts = [`From ${formatPrice(style.perPerson)}/person`];
    if (style.minGuests > 0) parts.push(`${style.minGuests}-guest minimum`);
    const { weekday, weekend } = style.minimum;
    if (weekday > 0 || weekend > 0) {
        parts.push(
            `minimum ${formatPrice(weekday)} ${CATERING_PRICING.days.weekday} / ${formatPrice(weekend)} ${CATERING_PRICING.days.weekend}`,
        );
    }
    return parts.join(" · ");
}
