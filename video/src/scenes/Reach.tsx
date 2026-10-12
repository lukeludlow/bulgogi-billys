import { AbsoluteFill } from "remotion";
import { StatFigure } from "../components/figures.tsx";
import { Card, Eyebrow, Headline } from "../components/text.tsx";
import { WorldDots } from "../components/WorldDots.tsx";
import stats from "../data/stats.json";
import { SceneShell, useScene } from "../scene.tsx";

/**
 * "Over eleven hundred people have visited, from twenty-four countries,
 * viewing nearly twenty-five hundred pages."
 */
export function Reach() {
    const { portrait, cue, voStart } = useScene();
    const visitorsAt = cue("eleven hundred", 0.06) - 4;
    const countriesAt = cue("twenty-four", 0.38) - 4;
    const pagesAt = cue("twenty-five hundred", 0.7) - 4;

    const map = (width: number) => (
        <WorldDots
            countries={stats.countries}
            homeAt={voStart}
            worldAt={countriesAt}
            width={width}
        />
    );
    const visitors = (size: number) => (
        <StatFigure
            label="visitors"
            value={stats.visitors}
            start={visitorsAt}
            size={size}
        />
    );
    const countries = (size: number) => (
        <StatFigure
            label="countries"
            value={stats.countries.length}
            start={countriesAt}
            size={size}
        />
    );
    const pages = (size: number) => (
        <StatFigure
            label="page views"
            value={stats.publicPageViews}
            start={pagesAt}
            size={size}
        />
    );

    if (portrait) {
        return (
            <SceneShell>
                <AbsoluteFill style={{ padding: "150px 80px", gap: 26 }}>
                    <Eyebrow>Reach</Eyebrow>
                    <Headline
                        text="People are finding the site."
                        highlight="finding"
                        size={96}
                    />
                </AbsoluteFill>
                <div style={{ position: "absolute", left: 40, top: 560 }}>
                    {map(1000)}
                </div>
                <Card
                    style={{
                        left: 80,
                        top: 1130,
                        width: 920,
                        padding: "56px 64px",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        rowGap: 56,
                    }}
                >
                    <div style={{ gridColumn: "1 / span 2" }}>
                        {visitors(190)}
                    </div>
                    {countries(120)}
                    {pages(120)}
                </Card>
            </SceneShell>
        );
    }

    return (
        <SceneShell>
            <AbsoluteFill style={{ padding: "110px 120px", gap: 22 }}>
                <Eyebrow>Reach</Eyebrow>
                <Headline
                    text="People are finding the site."
                    highlight="finding"
                    size={84}
                />
            </AbsoluteFill>
            <div style={{ position: "absolute", left: 70, top: 380 }}>
                {map(1150)}
            </div>
            <Card
                style={{
                    left: 1290,
                    top: 330,
                    width: 520,
                    padding: "50px 56px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 44,
                }}
            >
                {visitors(150)}
                {countries(96)}
                {pages(96)}
            </Card>
        </SceneShell>
    );
}
