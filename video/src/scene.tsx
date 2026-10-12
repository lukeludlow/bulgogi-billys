import { createContext, useContext, type ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { cueAt, type SpokenWord } from "./data/cues.ts";
import { progress } from "./motion.ts";

interface SceneInfo {
    /** Local frame (inside the scene's Sequence) where its line starts. */
    voStart: number;
    voFrames: number;
    durationInFrames: number;
    transitionFrames: number;
    words?: SpokenWord[];
}

const SceneContext = createContext<SceneInfo | null>(null);

export const SceneProvider = SceneContext.Provider;

/**
 * Timing helpers for the scene being rendered. `cue("September")` is the
 * local frame that word is spoken; when a clip has no word timings, it falls
 * back to `fallback` (a 0–1 fraction of the line).
 */
export function useScene() {
    const info = useContext(SceneContext);
    const { fps, width, height } = useVideoConfig();
    if (!info) throw new Error("useScene() outside a scene");
    return {
        ...info,
        fps,
        portrait: height > width,
        width,
        height,
        cue(phrase: string, fallback: number): number {
            const seconds = cueAt(
                info.words,
                phrase,
                (fallback * info.voFrames) / fps,
            );
            return Math.round(info.voStart + seconds * fps);
        },
    };
}

/**
 * Wraps a scene's content with the shared cut: a fade, slight zoom and blur
 * in and out across the transition overlap.
 */
export function SceneShell({
    children,
    first = false,
    last = false,
}: {
    children: ReactNode;
    first?: boolean;
    last?: boolean;
}) {
    const frame = useCurrentFrame();
    const { durationInFrames, transitionFrames: t } = useScene();
    const enter = first ? 1 : progress(frame, 0, t);
    const exit = last ? 0 : progress(frame, durationInFrames - t, t);
    return (
        <AbsoluteFill
            style={{
                opacity: enter * (1 - exit),
                transform: `scale(${1.04 - 0.04 * enter - 0.03 * exit})`,
                filter: `blur(${(1 - enter) * 8 + exit * 8}px)`,
            }}
        >
            {children}
        </AbsoluteFill>
    );
}
