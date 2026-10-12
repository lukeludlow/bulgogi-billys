import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { rise } from "../motion.ts";
import { color, gradientText } from "../theme.ts";

/** Small label above a headline, keyed by an orange tick (not orange text). */
export function Eyebrow({
    children,
    start = 0,
    size = 34,
}: {
    children: ReactNode;
    start?: number;
    size?: number;
}) {
    const frame = useCurrentFrame();
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: size * 0.5,
                fontSize: size,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: color.muted,
                ...rise(frame, start, 24),
            }}
        >
            <div
                style={{
                    width: size * 1.1,
                    height: size * 0.18,
                    borderRadius: size,
                    backgroundColor: color.accent,
                }}
            />
            {children}
        </div>
    );
}

/** The scene's big line. Pass `highlight` to paint one phrase in the gradient. */
export function Headline({
    text,
    highlight,
    start = 0,
    size = 96,
    style,
}: {
    text: string;
    highlight?: string;
    start?: number;
    size?: number;
    style?: CSSProperties;
}) {
    const frame = useCurrentFrame();
    const at = highlight ? text.indexOf(highlight) : -1;
    return (
        <div
            style={{
                fontSize: size,
                fontWeight: 800,
                lineHeight: 1.04,
                letterSpacing: "-0.035em",
                color: color.ink,
                textWrap: "balance",
                ...rise(frame, start + 3, 50, 22),
                ...style,
            }}
        >
            {at === -1 || !highlight ? (
                text
            ) : (
                <>
                    {text.slice(0, at)}
                    <span style={gradientText}>{highlight}</span>
                    {text.slice(at + highlight.length)}
                </>
            )}
        </div>
    );
}

/** A frosted card on the dark ground. */
export function Card({
    children,
    style,
}: {
    children: ReactNode;
    style?: CSSProperties;
}) {
    return (
        <div
            style={{
                position: "absolute",
                borderRadius: 36,
                backgroundColor: "rgba(24,24,27,0.78)",
                border: `1px solid ${color.hairline}`,
                boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
                backdropFilter: "blur(18px)",
                ...style,
            }}
        >
            {children}
        </div>
    );
}
