/**
 * The voice-over, one line per scene, in playback order. This is the single
 * source for both the ElevenLabs requests (scripts/voiceover.ts) and the
 * scene timeline. Numbers and the domain are spelled out so the voice reads
 * them naturally; the on-screen figures come from stats.json.
 */
export const SCRIPT = [
    {
        id: "hook",
        spoken: "Billy, here's what bulgogi billys dot com has done since it launched in May.",
    },
    {
        id: "reach",
        spoken: "Over eleven hundred people have visited, from twenty-four countries, viewing nearly twenty-five hundred pages.",
    },
    {
        id: "search",
        spoken: "On Google, we rank near the top when people search our name, and search clicks are up eightfold since June.",
    },
    {
        id: "audience",
        spoken: "Most visitors are on their phones, finding us through Google, Instagram, Facebook, and email, and heading straight for the menu and schedule.",
    },
    {
        id: "journey",
        spoken: "May: launch. June: built for Google. Summer: your own sales dashboard. And September: a catering page with instant price estimates.",
    },
    {
        id: "next",
        spoken: "Now we're starting to appear in searches like 'catering Conroe.' Next up: menu prices, a live weekend schedule, corporate lunches, and online preorders.",
    },
    {
        id: "outro",
        spoken: "Bulgogi Billy's. Seoul food, Texas style.",
    },
] as const;

export type SceneId = (typeof SCRIPT)[number]["id"];
