import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { BrowserFrame, PhoneFrame } from "../components/devices.tsx";
import { Eyebrow, Headline } from "../components/text.tsx";
import { pop, progress, rise } from "../motion.ts";
import { SceneShell, useScene } from "../scene.tsx";
import { color } from "../theme.ts";

/** "Billy, here's what bulgogi billys dot com has done since it launched in May." */
export function Hook() {
    const frame = useCurrentFrame();
    const { portrait, fps, cue, durationInFrames } = useScene();
    const logo = pop(frame, 0, fps);
    const enter = progress(frame, 6, 40);
    const drift = progress(frame, 30, durationInFrames - 30, (t) => t);

    const logoImg = (width: number) => (
        <Img
            src={staticFile("brand/logo-648.webp")}
            style={{
                width,
                opacity: Math.min(1, logo * 1.4),
                transform: `scale(${0.7 + 0.3 * logo})`,
            }}
        />
    );
    const since = (
        <div
            style={{
                fontSize: portrait ? 46 : 44,
                fontWeight: 500,
                color: color.muted,
                ...rise(frame, cue("launched", 0.7) - 6, 24),
            }}
        >
            Live since May 2026
        </div>
    );

    if (portrait) {
        return (
            <SceneShell first>
                <AbsoluteFill
                    style={{
                        alignItems: "center",
                        paddingTop: 170,
                        gap: 34,
                        textAlign: "center",
                    }}
                >
                    {logoImg(420)}
                    <div style={{ marginTop: 50 }}>
                        <Eyebrow start={4}>Website report</Eyebrow>
                    </div>
                    <Headline
                        text="bulgogibillys.com"
                        highlight=".com"
                        start={6}
                        size={112}
                    />
                    {since}
                </AbsoluteFill>
                <div style={{ perspective: 2200 }}>
                    <PhoneFrame
                        width={600}
                        layers={[
                            { screen: "mobile-home", scroll: 0.04 * drift },
                        ]}
                        style={{
                            left: 240,
                            top: 900 + (1 - enter) * 900,
                            transform: `rotateX(${8 + 22 * (1 - enter)}deg)`,
                            transformOrigin: "50% 0%",
                        }}
                    />
                </div>
            </SceneShell>
        );
    }

    return (
        <SceneShell first>
            <AbsoluteFill
                style={{
                    left: 130,
                    width: 720,
                    justifyContent: "center",
                    gap: 30,
                }}
            >
                {logoImg(360)}
                <div style={{ marginTop: 40 }}>
                    <Eyebrow start={4}>Website report</Eyebrow>
                </div>
                <Headline
                    text="bulgogibillys.com"
                    highlight=".com"
                    start={6}
                    size={84}
                />
                {since}
            </AbsoluteFill>
            <div style={{ perspective: 2400 }}>
                <BrowserFrame
                    width={1020}
                    url="bulgogibillys.com"
                    layers={[
                        { screen: "desktop-home-full", scroll: 0.08 * drift },
                    ]}
                    style={{
                        left: 900 + (1 - enter) * 500,
                        top: 170,
                        opacity: enter,
                        transform: `rotateY(${-16 + 4 * enter}deg)`,
                        transformOrigin: "0% 50%",
                    }}
                />
                <PhoneFrame
                    width={290}
                    layers={[{ screen: "mobile-home", scroll: 0 }]}
                    style={{
                        left: 1580,
                        top: 400 + (1 - progress(frame, 14, 40)) * 800,
                        transform: "rotateY(-10deg)",
                    }}
                />
            </div>
        </SceneShell>
    );
}
