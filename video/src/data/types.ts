/** One calendar month of Google Search Console performance. */
export interface MonthlySearch {
    /** "2026-06" */
    month: string;
    /** "Jun" */
    label: string;
    clicks: number;
    impressions: number;
    /** False for a month the export only partly covers (its first and last). */
    complete: boolean;
}

export interface ReferrerGroup {
    name: string;
    visitors: number;
}

export interface PageVisits {
    path: string;
    label: string;
    visitors: number;
}

export interface CountryVisits {
    /** ISO 3166-1 alpha-2, as Vercel reports it. */
    code: string;
    visitors: number;
}

/** Everything the video shows, derived once from the analytics exports. */
export interface VideoStats {
    /** Last day the exports cover, "2026-10-12". */
    through: string;
    visitors: number;
    /** Page views on public pages only — admin and login traffic excluded. */
    publicPageViews: number;
    /** Share of visitors on phones, 0–1. */
    mobileShare: number;
    countries: CountryVisits[];
    topPages: PageVisits[];
    referrers: ReferrerGroup[];
    search: {
        clicks: number;
        impressions: number;
        brandQuery: string;
        brandPosition: number;
        monthly: MonthlySearch[];
        /** First complete month → last complete month. */
        growth: { from: MonthlySearch; to: MonthlySearch; multiple: number };
        /** Non-brand searches with catering/party intent the site appeared in. */
        emergingQueries: string[];
    };
}
