import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { MonthlyBars } from "../components/MonthlyBars.tsx";
import { SearchBar, SearchResult } from "../components/search.tsx";
import { Card, Eyebrow, Headline } from "../components/text.tsx";
import stats from "../data/stats.json";
import { pop, rise } from "../motion.ts";
import { SceneShell, useScene } from "../scene.tsx";
import { color, gradient } from "../theme.ts";

const { search } = stats;
const completeMonths = search.monthly.filter((m) => m.complete);
/** Average position 2.95 → "Top 3". */
const topRank = Math.ceil(search.brandPosition);

/**
 * "On Google, we rank near the top when people search our name, and search
 * clicks are up eightfold since June."
 */
export function Search() {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const { portrait, cue, voStart } = useScene();
    const typeAt = voStart + 4;
    const resultAt = cue("rank", 0.17) - 4;
    const badgeAt = cue("top", 0.29);
    const chartAt = cue("search clicks", 0.58) - 10;
    const calloutAt = cue("eightfold", 0.72);
    const badge = pop(frame, badgeAt, fps);

    const rankBadge = (
        <div
            style={{
                position: "absolute",
                right: -24,
                top: -40,
                padding: "16px 32px",
                borderRadius: 60,
                backgroundImage: gradient,
                color: "#fff",
                fontSize: 44,
                fontWeight: 800,
                boxShadow: "0 16px 40px rgba(239,68,68,0.35)",
                opacity: Math.min(1, badge * 1.5),
                transform: `scale(${0.6 + 0.4 * badge}) rotate(${4 - 4 * badge}deg)`,
            }}
        >
            Top {topRank} on Google
        </div>
    );

    const chartCard = (
        left: number,
        top: number,
        width: number,
        chartHeight: number,
    ) => (
        <Card
            style={{
                left,
                top,
                width,
                padding: "48px 56px 40px",
                ...rise(frame, chartAt - 6, 50),
            }}
        >
            <div style={{ fontSize: 40, fontWeight: 700, color: color.ink }}>
                Clicks from Google search
            </div>
            <div
                style={{
                    fontSize: 32,
                    fontWeight: 500,
                    color: color.muted,
                    marginTop: 8,
                    marginBottom: 24,
                }}
            >
                per month, {search.growth.from.label} – {search.growth.to.label}{" "}
                2026
            </div>
            <MonthlyBars
                months={completeMonths}
                multiple={search.growth.multiple}
                start={chartAt}
                calloutAt={calloutAt}
                width={width - 112}
                height={chartHeight}
            />
        </Card>
    );

    if (portrait) {
        return (
            <SceneShell>
                <AbsoluteFill style={{ padding: "150px 80px", gap: 26 }}>
                    <Eyebrow>Google search</Eyebrow>
                    <Headline
                        text="Found by name, near the top."
                        highlight="near the top."
                        size={92}
                    />
                </AbsoluteFill>
                <div style={{ position: "absolute", left: 80, top: 490 }}>
                    <SearchBar
                        text={search.brandQuery}
                        start={typeAt}
                        width={920}
                    />
                </div>
                <div style={{ position: "absolute", left: 80, top: 650 }}>
                    <SearchResult width={920} start={resultAt} />
                    {rankBadge}
                </div>
                {chartCard(80, 1060, 920, 540)}
            </SceneShell>
        );
    }

    return (
        <SceneShell>
            <AbsoluteFill style={{ padding: "100px 120px", gap: 22 }}>
                <Eyebrow>Google search</Eyebrow>
                <Headline
                    text="Found by name, near the top."
                    highlight="near the top."
                    size={80}
                />
            </AbsoluteFill>
            <div style={{ position: "absolute", left: 120, top: 360 }}>
                <SearchBar
                    text={search.brandQuery}
                    start={typeAt}
                    width={800}
                />
            </div>
            <div style={{ position: "absolute", left: 120, top: 520 }}>
                <SearchResult width={800} start={resultAt} />
                {rankBadge}
            </div>
            {chartCard(1010, 300, 790, 520)}
        </SceneShell>
    );
}
