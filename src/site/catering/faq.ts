import {
    FREE_TRAVEL_MILES,
    MAX_TRAVEL_MILES,
} from "@/site/catering/pricing.ts";

export interface FaqEntry {
    question: string;
    answer: string;
}

/**
 * Catering FAQ (WEBSITE_REVENUE_PLAN.md §3.1 item 8). Only answers the docs
 * support: tent space/power and permits/insurance are left out until Billy
 * confirms the facts (§6).
 */
export const CATERING_FAQ: readonly FaqEntry[] = [
    {
        question: "Is it gluten-free?",
        answer: "Not as served: our bulgogi marinade contains soy sauce, which contains wheat. Tell us about any gluten or allergy needs on the form and we'll talk through what we can do.",
    },
    {
        question: "How spicy is it?",
        answer: "Mild. The beef bulgogi itself is savory-sweet, not spicy — the kick comes from the Seoul sauce, Sriracha and kimchi. Ask for sauces on the side if your group is spice-shy.",
    },
    {
        question: "How far ahead should I book?",
        answer: "As early as you can. Two to four weeks is typical; for office holiday parties, book four to eight weeks ahead, because November and December dates fill fastest.",
    },
    {
        question: "Where do you travel?",
        answer: `Across Greater Houston, up to ${MAX_TRAVEL_MILES} miles from The Woodlands and Conroe. Travel is free within ${FREE_TRAVEL_MILES} miles; farther events get a travel fee in your quote.`,
    },
    {
        question: "Can you do Saturday mornings?",
        answer: "Not while the Grogan's Mill Farmers Market runs — that's where we are every Saturday from 9 AM to 1 PM. Saturday afternoons and evenings may work, so ask on the form.",
    },
];
