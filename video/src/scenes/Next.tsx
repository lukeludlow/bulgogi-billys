import {
    BriefcaseIcon,
    CalendarDaysIcon,
    ShoppingBagIcon,
    TagIcon,
} from "@heroicons/react/24/outline";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { QueryChip } from "../components/search.tsx";
import { Eyebrow, Headline } from "../components/text.tsx";
import stats from "../data/stats.json";
import { ROADMAP, type RoadmapIcon } from "../data/story.ts";
import { pop } from "../motion.ts";
import { SceneShell, useScene } from "../scene.tsx";
import { color } from "../theme.ts";

const ICONS: Record<RoadmapIcon, typeof TagIcon> = {
    tag: TagIcon,
    calendar: CalendarDaysIcon,
    briefcase: BriefcaseIcon,
    bag: ShoppingBagIcon,
};

/**
 * "Now we're starting to appear in searches like 'catering Conroe.' Next up:
 * menu prices, a live weekend schedule, corporate lunches, and online
 * preorders."
 */
export function Next() {
    const { portrait, cue, voStart } = useScene();
    const queriesAt = cue("searches", 0.15);
    const nextAt = cue("next up", 0.39) - 6;

    const queries = (size: number, gap: number) => (
        <div style={{ display: "flex", flexDirection: "column", gap }}>
            {stats.search.emergingQueries.map((query, i) => (
                <div key={query}>
                    <QueryChip
                        text={query}
                        start={queriesAt + i * 7}
                        size={size}
                    />
                </div>
            ))}
        </div>
    );
    const cards = (width: number, height: number, gap: number) => (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: `${width}px ${width}px`,
                gap,
            }}
        >
            {ROADMAP.map((item) => (
                <RoadmapCard
                    key={item.title}
                    {...item}
                    start={cue(item.cue, item.fallback) - 4}
                    width={width}
                    height={height}
                />
            ))}
        </div>
    );

    if (portrait) {
        return (
            <SceneShell>
                <AbsoluteFill style={{ padding: "150px 80px", gap: 26 }}>
                    <Eyebrow start={voStart}>Where it's going</Eyebrow>
                    <Headline
                        text="New searches are finding us."
                        highlight="New searches"
                        start={voStart}
                        size={88}
                    />
                </AbsoluteFill>
                <div style={{ position: "absolute", left: 80, top: 480 }}>
                    {queries(40, 20)}
                </div>
                <div style={{ position: "absolute", left: 80, top: 1000 }}>
                    <Headline
                        text="Next up"
                        highlight="Next up"
                        start={nextAt}
                        size={80}
                        style={{ marginBottom: 36 }}
                    />
                    {cards(450, 330, 20)}
                </div>
            </SceneShell>
        );
    }

    return (
        <SceneShell>
            <AbsoluteFill style={{ padding: "100px 120px", gap: 22 }}>
                <Eyebrow start={voStart}>Where it's going</Eyebrow>
                <Headline
                    text="New searches are finding us."
                    highlight="New searches"
                    start={voStart}
                    size={76}
                    style={{ width: 760 }}
                />
            </AbsoluteFill>
            <div style={{ position: "absolute", left: 120, top: 400 }}>
                {queries(36, 18)}
            </div>
            <div style={{ position: "absolute", left: 960, top: 120 }}>
                <Headline
                    text="Next up"
                    highlight="Next up"
                    start={nextAt}
                    size={76}
                    style={{ marginBottom: 36 }}
                />
                {cards(400, 330, 20)}
            </div>
        </SceneShell>
    );
}

function RoadmapCard({
    title,
    detail,
    icon,
    start,
    width,
    height,
}: {
    title: string;
    detail: string;
    icon: RoadmapIcon;
    start: number;
    width: number;
    height: number;
}) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const p = pop(frame, start, fps);
    const Icon = ICONS[icon];
    return (
        <div
            style={{
                width,
                height,
                padding: 36,
                borderRadius: 32,
                backgroundColor: "rgba(24,24,27,0.82)",
                border: `1px solid ${color.hairline}`,
                boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                opacity: Math.min(1, p * 1.5),
                transform: `perspective(1200px) rotateX(${(1 - p) * 50}deg) translateY(${(1 - p) * 40}px)`,
                transformOrigin: "50% 100%",
            }}
        >
            <div
                style={{
                    width: 84,
                    height: 84,
                    flexShrink: 0,
                    borderRadius: 24,
                    display: "grid",
                    placeItems: "center",
                    backgroundColor: color.accentTrack,
                }}
            >
                <Icon style={{ width: 48, color: color.accent }} />
            </div>
            <div>
                <div
                    style={{
                        fontSize: 40,
                        fontWeight: 700,
                        lineHeight: 1.12,
                        color: color.ink,
                    }}
                >
                    {title}
                </div>
                <div
                    style={{
                        marginTop: 10,
                        fontSize: 30,
                        fontWeight: 500,
                        lineHeight: 1.3,
                        color: color.muted,
                    }}
                >
                    {detail}
                </div>
            </div>
        </div>
    );
}
