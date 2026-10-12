/**
 * The on-screen "where it's been / where it's going" content. Each item names
 * the spoken word or phrase it appears on (see script.ts) and a fallback
 * fraction of the line for clips without word timings.
 *
 * Milestones follow the git history; the roadmap follows
 * docs/WEBSITE_REVENUE_PLAN.md Phases 2–4.
 */
export const MILESTONES = [
    {
        cue: "may",
        fallback: 0,
        when: "May",
        title: "Launch",
        detail: "Home, menu, schedule & contact",
    },
    {
        cue: "june",
        fallback: 0.15,
        when: "June",
        title: "Built for Google",
        detail: "Search-ready pages & a blog",
    },
    {
        cue: "summer",
        fallback: 0.34,
        when: "Summer",
        title: "Your sales dashboard",
        detail: "Profit, event & weekly reports",
    },
    {
        cue: "september",
        fallback: 0.59,
        when: "September",
        title: "Catering page",
        detail: "Packages & instant price estimates",
    },
] as const;

export type RoadmapIcon = "tag" | "calendar" | "briefcase" | "bag";

export const ROADMAP: {
    cue: string;
    fallback: number;
    title: string;
    detail: string;
    icon: RoadmapIcon;
}[] = [
    {
        cue: "menu prices",
        fallback: 0.47,
        title: "Menu prices",
        detail: "Every dish, every size",
        icon: "tag",
    },
    {
        cue: "weekend schedule",
        fallback: 0.6,
        title: "Live weekend schedule",
        detail: "Next market dates, always current",
        icon: "calendar",
    },
    {
        cue: "corporate lunches",
        fallback: 0.7,
        title: "Corporate lunches",
        detail: "A page for offices & HR",
        icon: "briefcase",
    },
    {
        cue: "online preorders",
        fallback: 0.82,
        title: "Online preorders",
        detail: "Order ahead, pick up at market",
        icon: "bag",
    },
];
