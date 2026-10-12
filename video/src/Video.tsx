import type { ComponentType } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { GradientBackdrop } from "./components/GradientBackdrop.tsx";
import type { SceneId } from "./data/script.ts";
import type { Timeline } from "./data/timeline.ts";
import type { VoiceoverManifest } from "./data/voiceover.ts";
import { SceneProvider } from "./scene.tsx";
import { Audience } from "./scenes/Audience.tsx";
import { Hook } from "./scenes/Hook.tsx";
import { Journey } from "./scenes/Journey.tsx";
import { Next } from "./scenes/Next.tsx";
import { Outro } from "./scenes/Outro.tsx";
import { Reach } from "./scenes/Reach.tsx";
import { Search } from "./scenes/Search.tsx";
import { fontFamily, color } from "./theme.ts";

const SCENES: Record<SceneId, ComponentType> = {
    hook: Hook,
    reach: Reach,
    search: Search,
    audience: Audience,
    journey: Journey,
    next: Next,
    outro: Outro,
};

export interface VideoProps {
    timeline: Timeline<SceneId>;
    voiceover: VoiceoverManifest;
    [key: string]: unknown;
}

/**
 * Two independent layers: the visuals cut between scenes (overlapping by the
 * transition), and the voice-over lines laid end to end on their own clock.
 */
export function Video({ timeline, voiceover }: VideoProps) {
    return (
        <AbsoluteFill
            style={{ backgroundColor: color.bg, fontFamily, color: color.ink }}
        >
            <GradientBackdrop />
            {timeline.scenes.map((scene) => {
                const Scene = SCENES[scene.id];
                return (
                    <Sequence
                        key={scene.id}
                        name={scene.id}
                        from={scene.from}
                        durationInFrames={scene.durationInFrames}
                    >
                        <SceneProvider
                            value={{
                                voStart: scene.voFrom - scene.from,
                                voFrames: scene.voFrames,
                                durationInFrames: scene.durationInFrames,
                                transitionFrames: timeline.transitionFrames,
                                words: voiceover.lines[scene.id]?.words,
                            }}
                        >
                            <Scene />
                        </SceneProvider>
                    </Sequence>
                );
            })}
            {timeline.scenes.map((scene) => (
                <Sequence
                    key={`vo-${scene.id}`}
                    name={`vo: ${scene.id}`}
                    from={scene.voFrom}
                    durationInFrames={scene.voFrames}
                    layout="none"
                >
                    <Audio src={staticFile(`vo/${scene.id}.mp3`)} />
                </Sequence>
            ))}
        </AbsoluteFill>
    );
}
