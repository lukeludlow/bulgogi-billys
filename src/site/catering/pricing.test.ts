import { describe, expect, test } from "vitest";
import {
    CATERING_PACKAGES,
    CATERING_PRICING,
    clampGuests,
    describeEstimate,
    estimateCateringQuote,
    formatEstimate,
    formatPrice,
    minimumNote,
    packageDependsOnDay,
    packageInput,
    perPersonPrice,
    stylePriceLine,
    type EstimateInput,
} from "@/site/catering/pricing.ts";

function input(overrides: Partial<EstimateInput> = {}): EstimateInput {
    return {
        guests: 40,
        style: "dropoff",
        day: "weekday",
        distance: "near",
        addOns: [],
        ...overrides,
    };
}

describe("the packages match the ranges published in WEBSITE_REVENUE_PLAN §3.1", () => {
    const expected: Record<string, string> = {
        Backyard: "$340 – $410",
        "Office Lunch": "$680 – $820",
        Party: "$1,320 – $1,585",
        "Big Event": "$2,200 – $2,640",
    };

    test.each(CATERING_PACKAGES.map((pkg) => [pkg.name, pkg] as const))(
        "%s",
        (name, pkg) => {
            expect(
                formatEstimate(estimateCateringQuote(packageInput(pkg))),
            ).toBe(expected[name]);
        },
    );

    test("only the weekday Party package would cost more on another day", () => {
        expect(
            CATERING_PACKAGES.filter(packageDependsOnDay).map((p) => p.name),
        ).toEqual(["Party"]);
    });
});

test("the §3.1 example: a small weekend on-site event hits the $1,500 minimum", () => {
    expect(
        estimateCateringQuote(input({ style: "onsite", day: "weekend" })),
    ).toEqual({
        kind: "range",
        low: 1500,
        high: 1800,
        deposit: 750,
        minimumApplied: "weekend",
        quotedExtras: false,
    });
});

test("per-person pricing multiplies guests by the style's rate", () => {
    const estimate = estimateCateringQuote(input({ guests: 50 }));
    expect(estimate).toMatchObject({ low: 850, minimumApplied: null });
});

test("drop-off bills small groups as its 20-guest minimum", () => {
    const estimate = estimateCateringQuote(input({ guests: 10 }));
    expect(estimate).toMatchObject({ low: 340, minimumApplied: "guests" });
});

test("on-site minimums depend on the day", () => {
    expect(
        estimateCateringQuote(input({ style: "onsite", guests: 30 })),
    ).toMatchObject({ low: 1000, minimumApplied: "weekday" });
    expect(
        estimateCateringQuote(
            input({ style: "onsite", guests: 30, day: "weekend" }),
        ),
    ).toMatchObject({ low: 1500, minimumApplied: "weekend" });
    // Above the minimum, the day doesn't matter.
    expect(
        estimateCateringQuote(
            input({ style: "onsite", guests: 80, day: "weekend" }),
        ),
    ).toMatchObject({ low: 1760, minimumApplied: null });
});

test("the low end rounds down and the high end rounds up to $5", () => {
    // 45 × $22 = $990 → the $1,000 weekday minimum, so use drop-off instead:
    // 41 × $17 = $697 → $695; × 1.2 = $836.40 → $840.
    const estimate = estimateCateringQuote(input({ guests: 41 }));
    expect(estimate).toMatchObject({ low: 695, high: 840 });
});

test("an exact multiple isn't pushed up a step by float noise", () => {
    // 100 × $22 × 1.2 is 2640.0000000000005 in floating point.
    expect(
        estimateCateringQuote(input({ style: "onsite", guests: 100 })),
    ).toMatchObject({ high: 2640 });
});

test("the deposit is half the low end, to the nearest $5", () => {
    expect(estimateCateringQuote(input({ guests: 20 }))).toMatchObject({
        low: 340,
        deposit: 170,
    });
    expect(estimateCateringQuote(input({ guests: 41 }))).toMatchObject({
        low: 695,
        deposit: 350,
    });
});

test("add-ons and travel beyond 25 miles are flagged as quoted separately", () => {
    const quoted = (overrides: Partial<EstimateInput>) => {
        const estimate = estimateCateringQuote(input(overrides));
        return estimate.kind === "range" && estimate.quotedExtras;
    };
    expect(quoted({})).toBe(false);
    expect(quoted({ addOns: ["drinks"] })).toBe(true);
    expect(quoted({ distance: "mid" })).toBe(true);
    expect(quoted({ distance: "far" })).toBe(true);
});

test("add-ons never change the range itself", () => {
    const plain = estimateCateringQuote(input());
    const withAddOns = estimateCateringQuote(
        input({ addOns: ["texasSize", "extraTacos"], distance: "far" }),
    );
    expect(formatEstimate(withAddOns)).toBe(formatEstimate(plain));
});

test("a pop-up costs the host nothing and names its buyer threshold", () => {
    expect(estimateCateringQuote(input({ style: "popup" }))).toEqual({
        kind: "popup",
        hostCost: 0,
        minBuyers: 40,
    });
});

test("guest counts outside the bounds are rejected", () => {
    const { min, max } = CATERING_PRICING.guests;
    expect(() => estimateCateringQuote(input({ guests: min - 1 }))).toThrow(
        RangeError,
    );
    expect(() => estimateCateringQuote(input({ guests: max + 1 }))).toThrow(
        RangeError,
    );
    expect(() => estimateCateringQuote(input({ guests: 40.5 }))).toThrow(
        RangeError,
    );
});

test("clampGuests keeps the estimator's input in bounds", () => {
    const { min, max } = CATERING_PRICING.guests;
    expect(clampGuests(3)).toBe(min);
    expect(clampGuests(999)).toBe(max);
    expect(clampGuests(42.6)).toBe(43);
    expect(clampGuests(Number.NaN)).toBe(min);
});

test("prices format as whole US dollars", () => {
    expect(formatPrice(1320)).toBe("$1,320");
    expect(perPersonPrice("dropoff")).toBe("$17/person");
    expect(perPersonPrice("onsite")).toBe("$22/person");
    expect(
        formatEstimate(estimateCateringQuote(input({ style: "popup" }))),
    ).toBe("$0 to host");
});

describe("minimumNote", () => {
    test("is null when no floor applies", () => {
        const i = input({ guests: 50 });
        expect(minimumNote(i, estimateCateringQuote(i))).toBeNull();
    });

    test("names the guest floor", () => {
        const i = input({ guests: 10 });
        expect(minimumNote(i, estimateCateringQuote(i))).toBe(
            "Drop-off Bulgogi Bar starts at 20 guests, so this is priced for 20.",
        );
    });

    test("names the day minimum", () => {
        const i = input({ style: "onsite", day: "weekend" });
        expect(minimumNote(i, estimateCateringQuote(i))).toBe(
            "Fri–Sun minimum of $1,500 applied.",
        );
    });

    test("states the pop-up's buyer threshold", () => {
        const i = input({ style: "popup" });
        expect(minimumNote(i, estimateCateringQuote(i))).toBe(
            "Needs about 40+ expected buyers, or a sales guarantee.",
        );
    });
});

describe("describeEstimate", () => {
    test("summarizes the inputs and the range for Billy", () => {
        const i = input({ style: "onsite", guests: 60 });
        expect(describeEstimate(i, estimateCateringQuote(i))).toBe(
            "On-site Tent Service · 60 guests · Mon–Thu · Within 25 mi of The Woodlands / Conroe → Estimated $1,320 – $1,585, 50% deposit $660",
        );
    });

    test("includes add-ons, the minimum and the quoted-extras note", () => {
        const i = input({
            style: "onsite",
            day: "weekend",
            distance: "mid",
            addOns: ["drinks", "extraKimchi"],
        });
        expect(describeEstimate(i, estimateCateringQuote(i))).toBe(
            "On-site Tent Service · 40 guests · Fri–Sun · 25–45 mi away · Add-ons: Drinks, Extra kimchi → Estimated $1,500 – $1,800, 50% deposit $750 (Fri–Sun minimum of $1,500 applied); add-ons & travel quoted separately",
        );
    });

    test("describes a pop-up without a price range", () => {
        const i = input({ style: "popup", guests: 80 });
        expect(describeEstimate(i, estimateCateringQuote(i))).toBe(
            "Employee-Paid Pop-Up · 80 guests · Mon–Thu · Within 25 mi of The Woodlands / Conroe → $0 to host, needs ~40+ buyers",
        );
    });
});

test("each service-style card states its starting price and floor", () => {
    expect(stylePriceLine("dropoff")).toBe(
        "From $17/person · 20-guest minimum",
    );
    expect(stylePriceLine("onsite")).toBe(
        "From $22/person · minimum $1,000 Mon–Thu / $1,500 Fri–Sun",
    );
    expect(stylePriceLine("popup")).toBe(
        "$0 to host · needs ~40+ buyers or a sales guarantee",
    );
});
