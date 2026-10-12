import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * The site's orange→red hero glow, slowed to a drift behind the whole video
 * so cuts between scenes never flash to flat black.
 */
export function GradientBackdrop() {
    const frame = useCurrentFrame();
    const { width, height, fps } = useVideoConfig();
    const t = frame / fps;
    const size = Math.max(width, height);

    const glow = (x: number, y: number, diameter: number, rgba: string) => (
        <div
            style={{
                position: "absolute",
                left: x - diameter / 2,
                top: y - diameter / 2,
                width: diameter,
                height: diameter,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${rgba} 0%, transparent 62%)`,
            }}
        />
    );

    return (
        <AbsoluteFill style={{ overflow: "hidden" }}>
            {glow(
                width * (0.12 + 0.06 * Math.sin(t * 0.35)),
                height * (0.08 + 0.05 * Math.cos(t * 0.27)),
                size * 0.95,
                "rgba(249,115,22,0.30)",
            )}
            {glow(
                width * (0.92 + 0.05 * Math.cos(t * 0.31)),
                height * (0.9 + 0.05 * Math.sin(t * 0.22)),
                size * 0.85,
                "rgba(239,68,68,0.24)",
            )}
            <AbsoluteFill
                style={{
                    background:
                        "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)",
                }}
            />
        </AbsoluteFill>
    );
}
