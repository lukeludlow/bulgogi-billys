import type { CSSProperties, ReactNode } from "react";
import {
    CalculatorIcon,
    ClipboardDocumentCheckIcon,
    MapPinIcon,
} from "@heroicons/react/24/outline";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { PhoneFrame } from "../components/devices.tsx";
import { SearchResult } from "../components/search.tsx";
import { Card, Eyebrow, Headline } from "../components/text.tsx";
import { MILESTONES } from "../data/story.ts";
import { progress, rise } from "../motion.ts";
import { SceneShell, useScene } from "../scene.tsx";
import { color } from "../theme.ts";

/**
 * "May: launch. June: built for Google. Summer: your own sales dashboard.
 * And September: a catering page with instant price estimates."
 */
export function Journey() {
    const frame = useCurrentFrame();
    const { portrait, cue } = useScene();
    const at = MILESTONES.map(({ cue: phrase, fallback }) =>
        cue(phrase, fallback),
    );
    const active = at.filter((start) => frame >= start - 4).length - 1;
    const [, juneAt, summerAt, septemberAt] = at;

    // Each milestone's evidence holds the stage until the next one arrives.
    const showing = (from: number, until?: number) =>
        progress(frame, from - 4, 12) *
        (until === undefined ? 1 : 1 - progress(frame, until - 6, 10));

    const toCatering = progress(frame, septemberAt - 2, 14);
    const phoneLayers = [
        {
            screen: "mobile-home-full",
            scroll: 0.12 * progress(frame, 0, septemberAt, (t) => t),
        },
        { screen: "mobile-catering-estimate", opacity: toCatering },
    ];

    const rail = (size: number, gap: number, width: number) => (
        <div style={{ display: "flex", flexDirection: "column", gap, width }}>
            {MILESTONES.map((milestone, i) => (
                <Milestone
                    key={milestone.when}
                    {...milestone}
                    state={i < active ? "past" : i === active ? "now" : "next"}
                    last={i === MILESTONES.length - 1}
                    size={size}
                    gap={gap}
                />
            ))}
        </div>
    );

    const evidence = (width: number, style: CSSProperties): ReactNode => (
        <div style={{ position: "absolute", width, ...style }}>
            <div
                style={{
                    position: "absolute",
                    width,
                    opacity: showing(juneAt, summerAt),
                }}
            >
                <SearchResult width={width} start={juneAt - 4} />
            </div>
            <div
                style={{
                    position: "absolute",
                    width,
                    opacity: showing(summerAt, septemberAt),
                }}
            >
                <DashboardCard width={width} />
            </div>
            <div
                style={{
                    position: "absolute",
                    width,
                    display: "flex",
                    justifyContent: portrait ? "flex-start" : "flex-end",
                    top: portrait ? 0 : 150,
                    transform: rise(frame, septemberAt + 6, 30).transform,
                    opacity: showing(septemberAt),
                }}
            >
                <EstimateNote />
            </div>
        </div>
    );

    if (portrait) {
        return (
            <SceneShell>
                <AbsoluteFill style={{ padding: "150px 80px", gap: 26 }}>
                    <Eyebrow>Where it's been</Eyebrow>
                    <Headline
                        text="From launch to catering."
                        highlight="catering."
                        size={92}
                    />
                </AbsoluteFill>
                <div style={{ position: "absolute", left: 80, top: 470 }}>
                    {rail(40, 40, 490)}
                </div>
                <PhoneFrame
                    width={420}
                    layers={phoneLayers}
                    style={{ left: 600, top: 470 }}
                />
                {evidence(920, { left: 80, top: 1450 })}
            </SceneShell>
        );
    }

    return (
        <SceneShell>
            <AbsoluteFill style={{ padding: "100px 120px", gap: 22 }}>
                <Eyebrow>Where it's been</Eyebrow>
                <Headline
                    text="From launch to catering."
                    highlight="catering."
                    size={80}
                />
            </AbsoluteFill>
            <div style={{ position: "absolute", left: 120, top: 340 }}>
                {rail(40, 40, 620)}
            </div>
            {evidence(620, { left: 780, top: 430 })}
            <PhoneFrame
                width={330}
                layers={phoneLayers}
                style={{ left: 1480, top: 240 }}
            />
        </SceneShell>
    );
}

function Milestone({
    when,
    title,
    detail,
    state,
    last,
    size,
    gap,
}: {
    when: string;
    title: string;
    detail: string;
    state: "past" | "now" | "next";
    last: boolean;
    size: number;
    gap: number;
}) {
    const dot = size * 0.5;
    const lit = state !== "next";
    return (
        <div
            style={{
                position: "relative",
                display: "flex",
                gap: size * 0.6,
                opacity: state === "next" ? 0.3 : state === "past" ? 0.6 : 1,
            }}
        >
            <div
                style={{
                    position: "relative",
                    width: dot,
                    flexShrink: 0,
                    paddingTop: size * 0.32,
                }}
            >
                <div
                    style={{
                        width: dot,
                        height: dot,
                        borderRadius: "50%",
                        backgroundColor: lit ? color.accent : color.dim,
                        boxShadow:
                            state === "now"
                                ? `0 0 0 ${dot * 0.35}px rgba(249,115,22,0.25)`
                                : "none",
                    }}
                />
                {!last && (
                    <div
                        style={{
                            position: "absolute",
                            left: dot / 2 - 1.5,
                            top: size * 0.32 + dot + 10,
                            width: 3,
                            height: `calc(100% + ${gap - dot - 20}px)`,
                            backgroundColor: color.dim,
                        }}
                    />
                )}
            </div>
            <div>
                <div
                    style={{
                        fontSize: size * 0.68,
                        fontWeight: 600,
                        color: color.muted,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                    }}
                >
                    {when}
                </div>
                <div
                    style={{
                        fontSize: size,
                        fontWeight: 700,
                        color: color.ink,
                        lineHeight: 1.15,
                        marginTop: 4,
                    }}
                >
                    {title}
                </div>
                <div
                    style={{
                        fontSize: size * 0.68,
                        fontWeight: 500,
                        color: color.muted,
                        marginTop: 6,
                    }}
                >
                    {detail}
                </div>
            </div>
        </div>
    );
}

/** The owner dashboard, shown as its tools — no real figures on screen. */
function DashboardCard({ width }: { width: number }) {
    const s = width / 900;
    const tools = [
        { Icon: CalculatorIcon, name: "Profit calculator" },
        { Icon: MapPinIcon, name: "Event reports" },
        { Icon: ClipboardDocumentCheckIcon, name: "Weekly review" },
    ];
    return (
        <Card style={{ position: "relative", width, padding: 44 * s }}>
            <div
                style={{
                    fontSize: 32 * s,
                    fontWeight: 600,
                    color: color.muted,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                }}
            >
                Owner dashboard
            </div>
            <div
                style={{
                    display: "flex",
                    gap: 24 * s,
                    marginTop: 30 * s,
                }}
            >
                {tools.map(({ Icon, name }) => (
                    <div
                        key={name}
                        style={{
                            flex: 1,
                            padding: 28 * s,
                            borderRadius: 26 * s,
                            backgroundColor: color.raised,
                        }}
                    >
                        <Icon style={{ width: 64 * s, color: color.accent }} />
                        <div
                            style={{
                                marginTop: 18 * s,
                                fontSize: 36 * s,
                                fontWeight: 700,
                                lineHeight: 1.2,
                                color: color.ink,
                            }}
                        >
                            {name}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

function EstimateNote() {
    return (
        <div
            style={{
                padding: "22px 36px",
                borderRadius: 60,
                backgroundColor: color.ink,
                color: color.bg,
                fontSize: 38,
                fontWeight: 700,
                whiteSpace: "nowrap",
                boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
            }}
        >
            60 guests → instant price range
        </div>
    );
}
