import { useCurrentFrame, useVideoConfig } from "remotion";
import type { MonthlySearch } from "../data/types.ts";
import { pop, progress } from "../motion.ts";
import { color, fontFamily } from "../theme.ts";

/**
 * Google clicks per complete month: one series, so one hue and no legend
 * (the card title names it). The final month is full strength, earlier ones
 * a step quieter, so the eye lands on where it ended up. Every cap is labeled
 * since a video viewer can't hover; four labels stay readable.
 */
export function MonthlyBars({
    months,
    multiple,
    start,
    calloutAt,
    width,
    height,
}: {
    months: MonthlySearch[];
    multiple: number;
    start: number;
    /** Frame the "N×" growth callout draws in. */
    calloutAt: number;
    width: number;
    height: number;
}) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const labelBand = 64;
    // Above the tallest bar: its cap label, the arc, and the callout pill.
    const capRoom = 200;
    const plotHeight = height - labelBand - capRoom;
    const baseline = capRoom + plotHeight;
    const slot = width / months.length;
    const barWidth = Math.min(slot * 0.46, 120);
    const max = Math.max(...months.map((m) => m.clicks));
    const radius = 14;

    const bars = months.map((month, i) => {
        const grow = pop(frame, start + i * 5, fps);
        const h = Math.max(4, (plotHeight * month.clicks * grow) / max);
        const x = slot * i + (slot - barWidth) / 2;
        return { month, i, x, h, grow };
    });
    const first = bars[0];
    const last = bars[bars.length - 1];

    const callout = progress(frame, calloutAt, 24);
    // Arc from the first cap to the last, drawn on by dash offset.
    const fromX = first.x + barWidth / 2;
    // Clear of the cap labels (44px text sitting 18px above each bar).
    const fromY = baseline - first.h - 84;
    const toX = last.x + barWidth / 2;
    const toY = baseline - last.h - 84;
    const arc = `M ${fromX} ${fromY} Q ${(fromX + toX) / 2} ${Math.min(fromY, toY) - 120} ${toX} ${toY}`;

    return (
        <svg
            width={width}
            height={height}
            style={{ overflow: "visible", fontFamily }}
        >
            <line
                x1={0}
                x2={width}
                y1={baseline}
                y2={baseline}
                stroke={color.dim}
                strokeWidth={2}
            />
            {bars.map(({ month, i, x, h, grow }) => {
                const isLast = i === bars.length - 1;
                const top = baseline - h;
                return (
                    <g key={month.month}>
                        {/* Rounded data end, square at the baseline. */}
                        <path
                            d={`M ${x} ${baseline} V ${top + radius} Q ${x} ${top} ${x + radius} ${top} H ${x + barWidth - radius} Q ${x + barWidth} ${top} ${x + barWidth} ${top + radius} V ${baseline} Z`}
                            fill={color.accent}
                            opacity={isLast ? 1 : 0.55}
                        />
                        <text
                            x={x + barWidth / 2}
                            y={top - 18}
                            textAnchor="middle"
                            fontSize={44}
                            fontWeight={700}
                            fill={color.ink}
                            opacity={Math.min(1, grow)}
                        >
                            {Math.round(month.clicks * Math.min(1, grow))}
                        </text>
                        <text
                            x={x + barWidth / 2}
                            y={baseline + 50}
                            textAnchor="middle"
                            fontSize={36}
                            fontWeight={500}
                            fill={color.muted}
                        >
                            {month.label}
                        </text>
                    </g>
                );
            })}
            <path
                d={arc}
                fill="none"
                stroke={color.ink2}
                strokeWidth={3}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - callout}
            />
            <g
                opacity={callout}
                transform={`translate(${(fromX + toX) / 2} ${Math.min(fromY, toY) - 54})`}
            >
                <rect
                    x={-90}
                    y={-58}
                    width={180}
                    height={84}
                    rx={42}
                    fill={color.ink}
                />
                <text
                    textAnchor="middle"
                    y={2}
                    fontSize={52}
                    fontWeight={800}
                    fill={color.bg}
                >
                    {Math.floor(multiple)}×
                </text>
            </g>
        </svg>
    );
}
