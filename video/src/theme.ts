import { loadFont } from "@remotion/google-fonts/Inter";

// The site sets its UI in Inter; the video matches.
export const { fontFamily } = loadFont("normal", {
    weights: ["400", "500", "600", "700", "800"],
    subsets: ["latin"],
});

/**
 * The site's dark palette (Tailwind zinc) with its orange→red hero accent.
 * Text always wears the ink tokens; orange is for marks and highlights.
 */
export const color = {
    bg: "#09090b", // zinc-950
    surface: "#18181b", // zinc-900
    raised: "#27272a", // zinc-800
    hairline: "rgba(255,255,255,0.08)",
    ink: "#fafafa", // zinc-50
    ink2: "#d4d4d8", // zinc-300
    muted: "#a1a1aa", // zinc-400
    dim: "#52525b", // zinc-600
    accent: "#f97316", // orange-500, the site's buttons
    accentSoft: "#fdba74", // orange-300
    accentTrack: "#431407", // orange-950, meter tracks
    red: "#ef4444", // red-500
    land: "#3f3f46", // zinc-700, unvisited map dots
} as const;

export const gradient = `linear-gradient(135deg, #fb923c 0%, ${color.accent} 45%, ${color.red} 100%)`;

/** Clip a gradient to text, for the few headline words that earn it. */
export const gradientText = {
    backgroundImage: gradient,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
} as const;
