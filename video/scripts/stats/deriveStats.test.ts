import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
    deriveStats,
    emergingQueries,
    groupReferrers,
    isInternalPath,
    monthlySearch,
    pageLabel,
    publicPageViews,
    publicPages,
    readTable,
    searchGrowth,
} from "./deriveStats.ts";
import { loadExports } from "./loadExports.ts";

describe("readTable", () => {
    it("keys rows by trimmed header and skips blank lines", () => {
        expect(readTable('Page,Visitors\n"US",10\n\n')).toEqual([
            { Page: "US", Visitors: "10" },
        ]);
    });

    it("returns no rows for an empty file", () => {
        expect(readTable("")).toEqual([]);
    });
});

describe("isInternalPath", () => {
    it.each([
        "/admin",
        "/admin/events",
        "/admin-login",
        "/auth/callback",
        "/enter-password",
    ])("treats %s as internal", (path) => {
        expect(isInternalPath(path)).toBe(true);
    });

    it.each(["/", "/menu", "/administrator-tips", "/blog/auth-story"])(
        "treats %s as public",
        (path) => {
            expect(isInternalPath(path)).toBe(false);
        },
    );
});

describe("pageLabel", () => {
    it("names known pages", () => {
        expect(pageLabel("/")).toBe("Home");
        expect(pageLabel("/schedule")).toBe("Schedule");
    });

    it("falls back to the last path segment", () => {
        expect(pageLabel("/blog/the-tiktok-story")).toBe("The tiktok story");
    });
});

const PAGES = readTable(
    [
        "Page,Visitors,Total",
        '"/",100,150',
        '"/menu",40,60',
        '"/admin",5,30',
        '"/enter-password",8,9',
        '"/schedule",50,70',
    ].join("\n"),
);

describe("publicPages / publicPageViews", () => {
    it("drops internal pages and sorts by visitors", () => {
        expect(publicPages(PAGES).map((p) => p.label)).toEqual([
            "Home",
            "Schedule",
            "Menu",
        ]);
    });

    it("sums views on public pages only", () => {
        expect(publicPageViews(PAGES)).toBe(150 + 60 + 70);
    });
});

describe("groupReferrers", () => {
    it("folds hostnames into channels and drops the rest", () => {
        const rows = readTable(
            [
                "Page,Visitors,Total",
                '"google.com",10,12',
                '"search.google.com",1,1',
                '"l.instagram.com",6,6',
                '"instagram.com",2,2',
                '"m.facebook.com",3,3',
                '"facebook.com",4,4',
                '"us19.campaign-archive.com",5,5',
                '"mailchi.mp",2,2',
                '"com.google.android.gm",1,1',
                '"bing.com",9,9',
                '"bulgogibillys.com",3,3',
            ].join("\n"),
        );
        expect(groupReferrers(rows)).toEqual([
            { name: "Google", visitors: 11 },
            { name: "Instagram", visitors: 8 },
            { name: "Email", visitors: 8 },
            { name: "Facebook", visitors: 7 },
        ]);
    });
});

describe("monthlySearch / searchGrowth", () => {
    // A partial May (one day), a complete February, a partial March.
    const days = (month: string, count: number, clicks: number) =>
        Array.from(
            { length: count },
            (_, i) =>
                `${month}-${String(i + 1).padStart(2, "0")},${clicks},${clicks * 5},,`,
        );
    const rows = readTable(
        [
            "Date,Clicks,Impressions,CTR,Position",
            ...days("2026-01", 31, 1),
            ...days("2026-02", 28, 2),
            ...days("2026-03", 3, 9),
            "2026-04-01,0,0,,",
        ].join("\n"),
    );

    it("buckets days into months and flags partial ones", () => {
        expect(monthlySearch(rows)).toEqual([
            {
                month: "2026-01",
                label: "Jan",
                clicks: 31,
                impressions: 155,
                complete: true,
            },
            {
                month: "2026-02",
                label: "Feb",
                clicks: 56,
                impressions: 280,
                complete: true,
            },
            {
                month: "2026-03",
                label: "Mar",
                clicks: 27,
                impressions: 135,
                complete: false,
            },
            {
                month: "2026-04",
                label: "Apr",
                clicks: 0,
                impressions: 0,
                complete: false,
            },
        ]);
    });

    it("measures growth between the first and last complete months", () => {
        const growth = searchGrowth(monthlySearch(rows));
        expect(growth.from.label).toBe("Jan");
        expect(growth.to.label).toBe("Feb");
        expect(growth.multiple).toBeCloseTo(56 / 31);
    });

    it("refuses to claim growth from fewer than two complete months", () => {
        expect(() => searchGrowth(monthlySearch(rows).slice(1))).toThrow(
            /two complete months/,
        );
    });
});

describe("emergingQueries", () => {
    it("keeps catering and party searches, most-seen first", () => {
        const rows = readTable(
            [
                "Top queries,Clicks,Impressions,CTR,Position",
                "bulgogi billys,57,198,28.79%,2.95",
                "catering near me,0,1,0%,66",
                "catering conroe,0,4,0%,21",
                "graduation party near me,0,1,0%,78",
                "bulgogi stafford menu,0,1,0%,77",
            ].join("\n"),
        );
        expect(emergingQueries(rows)).toEqual([
            "catering conroe",
            "catering near me",
            "graduation party near me",
        ]);
    });
});

// The real exports live in the untracked analytics/ folder; pin the numbers
// the voice-over speaks so a script edit can't drift from the data.
const ANALYTICS_DIR = path.resolve(import.meta.dirname, "../../../analytics");

describe.skipIf(!existsSync(ANALYTICS_DIR))("the Oct 2026 exports", () => {
    it("produce the figures the script narrates", async () => {
        const { exports, through } = await loadExports(ANALYTICS_DIR);
        const stats = deriveStats(exports, through);

        expect(stats.through).toBe("2026-10-12");
        expect(stats.visitors).toBe(1158);
        expect(stats.publicPageViews).toBe(2499);
        expect(stats.countries).toHaveLength(24);
        expect(stats.countries[0]).toEqual({ code: "US", visitors: 1064 });
        expect(stats.mobileShare).toBeCloseTo(670 / 1158);
        expect(stats.topPages.slice(0, 3).map((p) => p.visitors)).toEqual([
            957, 282, 251,
        ]);
        expect(stats.referrers).toEqual([
            { name: "Google", visitors: 174 },
            { name: "Instagram", visitors: 71 },
            { name: "Facebook", visitors: 37 },
            { name: "Email", visitors: 28 },
        ]);
        expect(stats.search.clicks).toBe(153);
        expect(stats.search.impressions).toBe(1100);
        expect(stats.search.brandQuery).toBe("bulgogi billys");
        expect(stats.search.brandPosition).toBe(2.95);
        expect(
            stats.search.monthly.map((m) => [m.label, m.clicks, m.complete]),
        ).toEqual([
            ["May", 2, false],
            ["Jun", 7, true],
            ["Jul", 28, true],
            ["Aug", 35, true],
            ["Sep", 58, true],
            ["Oct", 23, false],
        ]);
        expect(stats.search.growth.multiple).toBeCloseTo(58 / 7);
        expect(stats.search.emergingQueries.slice(0, 3)).toEqual([
            "catering conroe",
            "caterers near me",
            "catering near me",
        ]);
    });
});
