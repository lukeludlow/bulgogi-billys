import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { PhoneFrame } from "../components/devices.tsx";
import { BarRows, Meter, StatFigure } from "../components/figures.tsx";
import { Eyebrow, Headline } from "../components/text.tsx";
import stats from "../data/stats.json";
import { progress, rise } from "../motion.ts";
import { SceneShell, useScene } from "../scene.tsx";
import { color } from "../theme.ts";

const mobilePercent = Math.round(stats.mobileShare * 100);

/**
 * "Most visitors are on their phones, finding us through Google, Instagram,
 * Facebook, and email, and heading straight for the menu and schedule."
 */
export function Audience() {
    const frame = useCurrentFrame();
    const { portrait, cue, durationInFrames } = useScene();
    const phonesAt = cue("phones", 0.12) - 6;
    const sourceCue = (name: string, fallback: number) =>
        cue(name, fallback) - 4;
    const rows = stats.referrers.map(({ name, visitors }, i) => ({
        label: name,
        value: visitors,
        start: sourceCue(name.toLowerCase(), 0.3 + i * 0.08),
    }));
    const menuAt = cue("menu", 0.78);
    const scheduleAt = cue("schedule", 0.86);

    // The phone browses: home → menu (scrolling) → schedule.
    const toMenu = progress(frame, menuAt - 8, 12);
    const toSchedule = progress(frame, scheduleAt - 6, 12);
    const menuScroll = interpolate(
        frame,
        [menuAt, durationInFrames],
        [0, 0.35],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    const layers = [
        { screen: "mobile-home-full", scroll: 0 },
        { screen: "mobile-menu-full", scroll: menuScroll, opacity: toMenu },
        { screen: "mobile-schedule", opacity: toSchedule },
    ];

    const pageTag = (label: string, visitors: number, at: number) => (
        <div
            style={{
                padding: "14px 26px",
                borderRadius: 40,
                backgroundColor: color.ink,
                color: color.bg,
                fontSize: 34,
                fontWeight: 700,
                whiteSpace: "nowrap",
                boxShadow: "0 14px 36px rgba(0,0,0,0.45)",
                ...rise(frame, at, 24, 14),
            }}
        >
            {label} · {visitors.toLocaleString("en-US")} visitors
        </div>
    );
    const [, menuPage, schedulePage] = stats.topPages;

    const mobile = (size: number, meterWidth: number) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            <StatFigure
                label="of visitors on phones"
                value={mobilePercent}
                suffix="%"
                start={phonesAt}
                size={size}
                style={{ maxWidth: meterWidth }}
            />
            <div style={rise(frame, phonesAt + 6, 16)}>
                <Meter
                    share={stats.mobileShare}
                    start={phonesAt + 6}
                    width={meterWidth}
                />
            </div>
        </div>
    );
    const sourcesTitle = (
        <div
            style={{
                fontSize: 34,
                fontWeight: 600,
                color: color.muted,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                ...rise(frame, rows[0].start - 6, 20),
            }}
        >
            How they find us
        </div>
    );

    if (portrait) {
        return (
            <SceneShell>
                <AbsoluteFill style={{ padding: "150px 80px", gap: 26 }}>
                    <Eyebrow>Audience</Eyebrow>
                    <Headline
                        text="Phone-first, from Google & social."
                        highlight="Phone-first,"
                        size={88}
                    />
                </AbsoluteFill>
                <div style={{ position: "absolute", left: 80, top: 540 }}>
                    {mobile(170, 440)}
                </div>
                <div
                    style={{
                        position: "absolute",
                        left: 80,
                        top: 960,
                        display: "flex",
                        flexDirection: "column",
                        gap: 30,
                    }}
                >
                    {sourcesTitle}
                    <BarRows rows={rows} width={440} fontSize={36} />
                </div>
                <PhoneFrame
                    width={450}
                    layers={layers}
                    style={{ left: 580, top: 560 }}
                />
                <div
                    style={{
                        position: "absolute",
                        right: 60,
                        top: 1580,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 16,
                    }}
                >
                    {pageTag(menuPage.label, menuPage.visitors, menuAt)}
                    {pageTag(
                        schedulePage.label,
                        schedulePage.visitors,
                        scheduleAt,
                    )}
                </div>
            </SceneShell>
        );
    }

    return (
        <SceneShell>
            <AbsoluteFill style={{ padding: "100px 120px", gap: 22 }}>
                <Eyebrow>Audience</Eyebrow>
                <Headline
                    text="Phone-first, from Google & social."
                    highlight="Phone-first,"
                    size={76}
                />
            </AbsoluteFill>
            <div style={{ position: "absolute", left: 120, top: 360 }}>
                {mobile(150, 440)}
            </div>
            <div
                style={{
                    position: "absolute",
                    left: 680,
                    top: 360,
                    display: "flex",
                    flexDirection: "column",
                    gap: 26,
                }}
            >
                {sourcesTitle}
                <BarRows
                    rows={rows}
                    width={520}
                    fontSize={32}
                    barHeight={22}
                    gap={22}
                />
            </div>
            <PhoneFrame
                width={330}
                layers={layers}
                style={{ left: 1430, top: 250 }}
            />
            <div
                style={{
                    position: "absolute",
                    left: 120,
                    top: 720,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 14,
                }}
            >
                {pageTag(menuPage.label, menuPage.visitors, menuAt)}
                {pageTag(schedulePage.label, schedulePage.visitors, scheduleAt)}
            </div>
        </SceneShell>
    );
}
