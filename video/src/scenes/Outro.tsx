import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Headline } from "../components/text.tsx";
import stats from "../data/stats.json";
import { pop, progress, rise } from "../motion.ts";
import { SceneShell, useScene } from "../scene.tsx";
import { color } from "../theme.ts";

const PHOTOS = [
    { file: "bulgogi-tacos-1024.webp", angle: -12, dx: -1 },
    { file: "bulgogi-fries-1024.webp", angle: 0, dx: 0 },
    { file: "bulgogi-rice-1024.webp", angle: 12, dx: 1 },
];

const through = new Date(`${stats.through}T12:00:00`).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
);

/** "Bulgogi Billy's. Seoul food, Texas style." */
export function Outro() {
    const frame = useCurrentFrame();
    const { portrait, fps, cue, durationInFrames } = useScene();
    const logo = pop(frame, cue("bulgogi", 0) - 6, fps);
    const taglineAt = cue("seoul", 0.35) - 4;
    const fan = progress(frame, 4, 30);
    const zoom = 1 + 0.03 * progress(frame, 0, durationInFrames, (t) => t);

    const photoWidth = portrait ? 520 : 440;
    const spread = portrait ? 300 : 360;
    const photosTop = portrait ? 400 : 90;

    return (
        <SceneShell last>
            <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
                {PHOTOS.map(({ file, angle, dx }) => (
                    <Img
                        key={file}
                        src={staticFile(`brand/${file}`)}
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: photosTop + Math.abs(dx) * 50,
                            width: photoWidth,
                            borderRadius: 32,
                            border: "6px solid rgba(255,255,255,0.9)",
                            boxShadow: "0 30px 70px rgba(0,0,0,0.6)",
                            opacity: fan,
                            transform: `translateX(calc(-50% + ${dx * spread * fan}px)) rotate(${angle * fan}deg)`,
                            zIndex: dx === 0 ? 2 : 1,
                        }}
                    />
                ))}
                <AbsoluteFill
                    style={{
                        alignItems: "center",
                        justifyContent: "flex-end",
                        paddingBottom: portrait ? 440 : 170,
                        textAlign: "center",
                        gap: portrait ? 40 : 26,
                    }}
                >
                    <Img
                        src={staticFile("brand/logo-648.webp")}
                        style={{
                            width: portrait ? 640 : 520,
                            opacity: Math.min(1, logo * 1.4),
                            transform: `scale(${0.6 + 0.4 * logo})`,
                            filter: "drop-shadow(0 12px 30px rgba(0,0,0,0.6))",
                        }}
                    />
                    <Headline
                        text="Seoul food, Texas style."
                        highlight="Texas style."
                        start={taglineAt}
                        size={portrait ? 84 : 80}
                    />
                    <div
                        style={{
                            padding: "18px 40px",
                            borderRadius: 60,
                            backgroundColor: color.raised,
                            border: `1px solid rgba(255,255,255,0.12)`,
                            fontSize: portrait ? 44 : 38,
                            fontWeight: 600,
                            color: color.ink,
                            ...rise(frame, taglineAt + 12, 24),
                        }}
                    >
                        bulgogibillys.com
                    </div>
                </AbsoluteFill>
            </AbsoluteFill>
            <div
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: portrait ? 110 : 44,
                    textAlign: "center",
                    fontSize: portrait ? 28 : 24,
                    color: color.dim,
                    ...rise(frame, taglineAt + 18, 10),
                }}
            >
                Data: Vercel Analytics & Google Search Console, through{" "}
                {through}
            </div>
        </SceneShell>
    );
}
