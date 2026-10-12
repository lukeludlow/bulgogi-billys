import type { CSSProperties } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { pop, progress } from "../motion.ts";
import { color } from "../theme.ts";

const format = (n: number) => Math.round(n).toLocaleString("en-US");

/** A number that counts up from zero, landing on `value`. */
export function Counter({
    value,
    start,
    duration = 36,
    suffix = "",
    style,
}: {
    value: number;
    start: number;
    duration?: number;
    suffix?: string;
    style?: CSSProperties;
}) {
    const frame = useCurrentFrame();
    const p = progress(frame, start, duration);
    return (
        // Tabular digits while counting, so the width doesn't jitter.
        <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>
            {format(value * p)}
            {suffix}
        </span>
    );
}

/** Label + big counted value, popping in at `start`. */
export function StatFigure({
    label,
    value,
    start,
    size = 120,
    suffix,
    style,
}: {
    label: string;
    value: number;
    start: number;
    size?: number;
    suffix?: string;
    style?: CSSProperties;
}) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const p = pop(frame, start, fps);
    return (
        <div
            style={{
                opacity: Math.min(1, p * 1.5),
                transform: `translateY(${(1 - p) * 30}px) scale(${0.92 + 0.08 * p})`,
                transformOrigin: "left center",
                ...style,
            }}
        >
            <Counter
                value={value}
                start={start}
                suffix={suffix}
                style={{
                    display: "block",
                    fontSize: size,
                    fontWeight: 800,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    color: color.ink,
                }}
            />
            <div
                style={{
                    marginTop: size * 0.14,
                    fontSize: Math.max(30, size * 0.3),
                    fontWeight: 500,
                    color: color.muted,
                }}
            >
                {label}
            </div>
        </div>
    );
}

/** A filled share of a track — the track is a dark step of the same orange. */
export function Meter({
    share,
    start,
    width,
    height = 22,
}: {
    share: number;
    start: number;
    width: number;
    height?: number;
}) {
    const frame = useCurrentFrame();
    const p = progress(frame, start, 40);
    return (
        <div
            style={{
                width,
                height,
                borderRadius: height,
                backgroundColor: color.accentTrack,
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    width: width * share * p,
                    height,
                    borderRadius: height,
                    backgroundColor: color.accent,
                }}
            />
        </div>
    );
}

export interface BarRow {
    label: string;
    value: number;
    /** Frame this row grows in. */
    start: number;
}

/**
 * Horizontal bars, one hue (they're one measure), value at each tip in ink.
 * Labels sit above their bars so long names never collide with values.
 */
export function BarRows({
    rows,
    width,
    barHeight = 26,
    fontSize = 36,
    gap = 34,
}: {
    rows: BarRow[];
    width: number;
    barHeight?: number;
    fontSize?: number;
    gap?: number;
}) {
    const frame = useCurrentFrame();
    const max = Math.max(...rows.map((r) => r.value));
    const valueRoom = fontSize * 2.6;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap, width }}>
            {rows.map(({ label, value, start }) => {
                const p = progress(frame, start, 26);
                const length = Math.max(
                    barHeight,
                    ((width - valueRoom) * value * p) / max,
                );
                return (
                    <div key={label} style={{ opacity: Math.min(1, p * 2) }}>
                        <div
                            style={{
                                fontSize,
                                fontWeight: 600,
                                color: color.ink2,
                                marginBottom: fontSize * 0.3,
                            }}
                        >
                            {label}
                        </div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: fontSize * 0.4,
                            }}
                        >
                            <div
                                style={{
                                    width: length,
                                    height: barHeight,
                                    // Square at the baseline, rounded data end.
                                    borderRadius: `0 ${barHeight / 3}px ${barHeight / 3}px 0`,
                                    backgroundColor: color.accent,
                                }}
                            />
                            <span
                                style={{
                                    fontSize: fontSize * 0.95,
                                    fontWeight: 700,
                                    color: color.ink,
                                }}
                            >
                                {format(value * p)}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
