import { parseCsv } from "../../../src/shared/csv.ts";
import type {
    CountryVisits,
    MonthlySearch,
    PageVisits,
    ReferrerGroup,
    VideoStats,
} from "../../src/data/types.ts";

/** Raw CSV text of every export the video draws on. */
export interface AnalyticsExports {
    vercel: {
        countries: string;
        devices: string;
        pages: string;
        referrers: string;
    };
    searchConsole: {
        chart: string;
        queries: string;
    };
}

type Row = Record<string, string>;

/** Parse a CSV with a header line into objects keyed by column name. */
export function readTable(text: string): Row[] {
    const [header, ...rows] = parseCsv(text);
    if (!header) return [];
    return rows
        .filter((row) => row.some((cell) => cell.trim() !== ""))
        .map((row) =>
            Object.fromEntries(
                header.map((name, i) => [name.trim(), (row[i] ?? "").trim()]),
            ),
        );
}

const toNumber = (raw: string | undefined) => Number(raw ?? "") || 0;

/** Admin, login and auth pages are our own traffic, not customers. */
export function isInternalPath(path: string): boolean {
    return /^\/(admin|admin-login|auth|enter-password)(\/|$)/.test(path);
}

const PAGE_LABELS: Record<string, string> = {
    "/": "Home",
    "/menu": "Menu",
    "/schedule": "Schedule",
    "/contact": "Contact",
    "/catering": "Catering",
    "/order-now": "Order",
    "/about": "About",
    "/blog": "Blog",
};

export function pageLabel(path: string): string {
    if (PAGE_LABELS[path]) return PAGE_LABELS[path];
    const last = path.split("/").filter(Boolean).pop() ?? path;
    return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
}

/** Vercel's "Page" column holds the dimension for every table. */
const key = (row: Row) => row.Page ?? "";

export function publicPages(rows: Row[]): PageVisits[] {
    return rows
        .filter((row) => !isInternalPath(key(row)))
        .map((row) => ({
            path: key(row),
            label: pageLabel(key(row)),
            visitors: toNumber(row.Visitors),
        }))
        .sort((a, b) => b.visitors - a.visitors);
}

export function publicPageViews(rows: Row[]): number {
    return rows
        .filter((row) => !isInternalPath(key(row)))
        .reduce((sum, row) => sum + toNumber(row.Total), 0);
}

/** Referrer hostnames that belong to one channel. */
const REFERRER_GROUPS: { name: string; match: RegExp }[] = [
    { name: "Google", match: /^(www\.)?google\.com$|^search\.google\.com$/ },
    { name: "Instagram", match: /(^|\.)instagram\.com$/ },
    { name: "Facebook", match: /(^|\.)facebook\.com$/ },
    // Mailchimp campaign pages, its short links, and the Gmail Android app.
    {
        name: "Email",
        match: /campaign-archive\.com$|^mailchi\.mp$|^com\.google\.android\.gm$/,
    },
];

export function groupReferrers(rows: Row[]): ReferrerGroup[] {
    const totals = new Map<string, number>();
    for (const row of rows) {
        const group = REFERRER_GROUPS.find(({ match }) => match.test(key(row)));
        if (!group) continue;
        totals.set(
            group.name,
            (totals.get(group.name) ?? 0) + toNumber(row.Visitors),
        );
    }
    return [...totals]
        .map(([name, visitors]) => ({ name, visitors }))
        .sort((a, b) => b.visitors - a.visitors);
}

const MONTH_LABELS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

function daysInMonth(month: string): number {
    const [year, mm] = month.split("-").map(Number);
    return new Date(Date.UTC(year, mm, 0)).getUTCDate();
}

/** Bucket Search Console's daily chart rows into calendar months. */
export function monthlySearch(rows: Row[]): MonthlySearch[] {
    const buckets = new Map<
        string,
        { clicks: number; impressions: number; days: number }
    >();
    for (const row of rows) {
        const month = (row.Date ?? "").slice(0, 7);
        if (!/^\d{4}-\d{2}$/.test(month)) continue;
        const bucket = buckets.get(month) ?? {
            clicks: 0,
            impressions: 0,
            days: 0,
        };
        bucket.clicks += toNumber(row.Clicks);
        bucket.impressions += toNumber(row.Impressions);
        bucket.days += 1;
        buckets.set(month, bucket);
    }
    return [...buckets]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, { clicks, impressions, days }]) => ({
            month,
            label: MONTH_LABELS[Number(month.slice(5)) - 1],
            clicks,
            impressions,
            complete: days === daysInMonth(month),
        }));
}

export function searchGrowth(monthly: MonthlySearch[]) {
    const complete = monthly.filter((m) => m.complete);
    if (complete.length < 2) {
        throw new Error("Need at least two complete months to show growth");
    }
    const from = complete[0];
    const to = complete[complete.length - 1];
    return { from, to, multiple: from.clicks ? to.clicks / from.clicks : 0 };
}

/** Searches with buying intent beyond our own name. */
const INTENT = /cater|party|lunch/i;

export function emergingQueries(rows: Row[]): string[] {
    return rows
        .filter((row) => INTENT.test(row["Top queries"] ?? ""))
        .sort((a, b) => toNumber(b.Impressions) - toNumber(a.Impressions))
        .map((row) => row["Top queries"]);
}

export function deriveStats(
    exports: AnalyticsExports,
    through: string,
): VideoStats {
    const devices = readTable(exports.vercel.devices);
    const visitors = devices.reduce(
        (sum, row) => sum + toNumber(row.Visitors),
        0,
    );
    const mobile = devices.find((row) => key(row) === "mobile");
    const pages = readTable(exports.vercel.pages);
    const countries: CountryVisits[] = readTable(exports.vercel.countries)
        .map((row) => ({ code: key(row), visitors: toNumber(row.Visitors) }))
        .sort((a, b) => b.visitors - a.visitors);

    const chart = readTable(exports.searchConsole.chart);
    const queries = readTable(exports.searchConsole.queries);
    const brand = [...queries].sort(
        (a, b) => toNumber(b.Clicks) - toNumber(a.Clicks),
    )[0];
    const monthly = monthlySearch(chart);

    return {
        through,
        visitors,
        publicPageViews: publicPageViews(pages),
        mobileShare: visitors ? toNumber(mobile?.Visitors) / visitors : 0,
        countries,
        topPages: publicPages(pages),
        referrers: groupReferrers(readTable(exports.vercel.referrers)),
        search: {
            clicks: chart.reduce((sum, row) => sum + toNumber(row.Clicks), 0),
            impressions: chart.reduce(
                (sum, row) => sum + toNumber(row.Impressions),
                0,
            ),
            brandQuery: brand?.["Top queries"] ?? "",
            brandPosition: toNumber(brand?.Position),
            monthly,
            growth: searchGrowth(monthly),
            emergingQueries: emergingQueries(queries),
        },
    };
}
