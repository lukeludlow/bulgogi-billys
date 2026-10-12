import { describe, expect, test } from "vitest";
import {
    CATERING_PACKAGES,
    CATERING_PRICING,
    clampGuests,
    describeEstimate,
    DISTANCE_BAND_IDS,
    distanceBandLabel,
    estimateCateringQuote,
    formatEstimate,
    formatPrice,
    FREE_TRAVEL_MILES,
    MAX_TRAVEL_MILES,
    matchingPackage,
    minimumNote,
    packageDependsOnDay,
    packageInput,
    perPersonPrice,
    stylePriceLine,
    type EstimateInput,
    type PackageId,
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
    const expected: Record<PackageId, string> = {
        officeBackyard: "$600 – $850",
        party: "$1,320 – $1,585",
        bigEvent: "$2,200 – $2,640",
    };

    test.each(CATERING_PACKAGES.map((pkg) => [pkg.name, pkg] as const))(
        "%s",
        (_name, pkg) => {
            expect(
                formatEstimate(estimateCateringQuote(packageInput(pkg))),
            ).toBe(expected[pkg.id]);
        },
    );

    test("no package costs more on another day at these minimums", () => {
        expect(CATERING_PACKAGES.filter(packageDependsOnDay)).toEqual([]);
        // A smaller on-site party would, so the card's day badge still works.
        const party = CATERING_PACKAGES.find((p) => p.id === "party")!;
        expect(packageDependsOnDay({ ...party, guests: 40 })).toBe(true);
    });

    test("every package lists what it includes", () => {
        for (const pkg of CATERING_PACKAGES) {
            expect(pkg.includes.length, pkg.name).toBeGreaterThan(0);
        }
    });
});

describe("matchingPackage", () => {
    const matchFor = (overrides: Partial<EstimateInput>) =>
        matchingPackage(input(overrides))?.id ?? null;
    const { min, max } = CATERING_PRICING.guests;

    test("a drop-off of any size is the Office Lunch & Backyard package", () => {
        expect(matchFor({ guests: min })).toBe("officeBackyard");
        expect(matchFor({ guests: 40 })).toBe("officeBackyard");
        expect(matchFor({ guests: max })).toBe("officeBackyard");
    });

    test("on-site is a Party under 80 guests and a Big Event from 80", () => {
        expect(matchFor({ style: "onsite", guests: min })).toBe("party");
        expect(matchFor({ style: "onsite", guests: 79 })).toBe("party");
        expect(matchFor({ style: "onsite", guests: 80 })).toBe("bigEvent");
        expect(matchFor({ style: "onsite", guests: max })).toBe("bigEvent");
    });

    test("a pop-up fits no package", () => {
        expect(matchFor({ style: "popup" })).toBeNull();
    });

    test("each package's own example selects it", () => {
        for (const pkg of CATERING_PACKAGES) {
            expect(matchingPackage(packageInput(pkg))).toBe(pkg);
        }
    });

    test.each(["dropoff", "onsite"] as const)(
        "%s packages cover every guest count exactly once",
        (style) => {
            const ranges = CATERING_PACKAGES.filter((p) => p.style === style)
                .map((p) => p.fitsGuests)
                .sort((a, b) => a.min - b.min);
            expect(ranges[0].min).toBe(min);
            expect(ranges.at(-1)?.max).toBe(max);
            for (let i = 1; i < ranges.length; i++) {
                expect(ranges[i].min).toBe(ranges[i - 1].max + 1);
            }
        },
    );
});

test("the §3.1 example: a small weekend on-site event hits the $1,200 minimum", () => {
    expect(
        estimateCateringQuote(input({ style: "onsite", day: "weekend" })),
    ).toEqual({
        kind: "range",
        low: 1200,
        high: 1440,
        deposit: 600,
        minimumApplied: "weekend",
        quotedExtras: false,
    });
});

test("per-person pricing multiplies guests by the style's low and high rates", () => {
    expect(estimateCateringQuote(input({ guests: 40 }))).toMatchObject({
        low: 600,
        high: 850,
        minimumApplied: null,
    });
    // 50 × $21.25 = $1,062.50, rounded up to $1,065.
    expect(estimateCateringQuote(input({ guests: 50 }))).toMatchObject({
        low: 750,
        high: 1065,
    });
});

test("drop-off bills small groups as its 20-guest minimum", () => {
    const estimate = estimateCateringQuote(input({ guests: 10 }));
    expect(estimate).toMatchObject({
        low: 300,
        high: 425,
        minimumApplied: "guests",
    });
});

test("on-site minimums depend on the day, and lift both ends", () => {
    expect(
        estimateCateringQuote(input({ style: "onsite", guests: 30 })),
    ).toMatchObject({ low: 800, high: 960, minimumApplied: "weekday" });
    expect(
        estimateCateringQuote(
            input({ style: "onsite", guests: 30, day: "weekend" }),
        ),
    ).toMatchObject({ low: 1200, high: 1440, minimumApplied: "weekend" });
    // Above the minimum, the day doesn't matter.
    expect(
        estimateCateringQuote(
            input({ style: "onsite", guests: 80, day: "weekend" }),
        ),
    ).toMatchObject({ low: 1760, minimumApplied: null });
});

test("the low end rounds down and the high end rounds up to $5", () => {
    // 41 × $22 = $902 → $900; 41 × $26.40 = $1,082.40 → $1,085.
    const estimate = estimateCateringQuote(
        input({ style: "onsite", guests: 41 }),
    );
    expect(estimate).toMatchObject({ low: 900, high: 1085 });
});

test("an exact multiple isn't pushed up a step by float noise", () => {
    // 100 × $22 × 1.2 is 2640.0000000000005 in floating point.
    expect(
        estimateCateringQuote(input({ style: "onsite", guests: 100 })),
    ).toMatchObject({ high: 2640 });
});

test("the deposit is half the low end, to the nearest $5", () => {
    expect(estimateCateringQuote(input({ guests: 20 }))).toMatchObject({
        low: 300,
        deposit: 150,
    });
    // Half of $615 is $307.50, which rounds to $310.
    expect(estimateCateringQuote(input({ guests: 41 }))).toMatchObject({
        low: 615,
        deposit: 310,
    });
});

test("add-ons and travel beyond 15 miles are flagged as quoted separately", () => {
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
    expect(perPersonPrice("dropoff")).toBe("$15/person");
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
            "Fri–Sun minimum of $1,200 applied.",
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
            "On-site Tent Service · 60 guests · Mon–Thu · Within 15 mi of The Woodlands / Conroe → Estimated $1,320 – $1,585, 50% deposit $660",
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
            "On-site Tent Service · 40 guests · Fri–Sun · 16–30 mi away · Add-ons: Drinks, Extra kimchi → Estimated $1,200 – $1,440, 50% deposit $600 (Fri–Sun minimum of $1,200 applied); add-ons & travel quoted separately",
        );
    });

    test("describes a pop-up without a price range", () => {
        const i = input({ style: "popup", guests: 80 });
        expect(describeEstimate(i, estimateCateringQuote(i))).toBe(
            "Employee-Paid Pop-Up · 80 guests · Mon–Thu · Within 15 mi of The Woodlands / Conroe → $0 to host, needs ~40+ buyers",
        );
    });
});

test("each service-style card states its starting price and floor", () => {
    expect(stylePriceLine("dropoff")).toBe(
        "From $15/person · 20-guest minimum",
    );
    expect(stylePriceLine("onsite")).toBe(
        "From $22/person · minimum $800 Mon–Thu / $1,200 Fri–Sun",
    );
    expect(stylePriceLine("popup")).toBe(
        "$0 to host · needs ~40+ buyers or a sales guarantee",
    );
});

test("distance bands run on from each other out to the travel limit", () => {
    expect(DISTANCE_BAND_IDS.map(distanceBandLabel)).toEqual([
        "Within 15 mi of The Woodlands / Conroe",
        "16–30 mi away",
        "31–40 mi away",
    ]);
    expect(FREE_TRAVEL_MILES).toBe(15);
    expect(MAX_TRAVEL_MILES).toBe(40);
});
