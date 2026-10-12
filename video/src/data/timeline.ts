export const FPS = 30;
/** The brief: "less than 60 seconds total". Keep a second of margin. */
export const MAX_SECONDS = 59;

export interface TimelineOptions {
    fps: number;
    /** Silence before the first line, while the opening animates in. */
    leadInSeconds: number;
    /** Pause between one line ending and the next starting. */
    gapSeconds: number;
    /** How long a scene-to-scene transition overlaps its neighbours. */
    transitionFrames: number;
    /** Hold on the final frame after the last line. */
    outroHoldSeconds: number;
}

export const DEFAULT_TIMELINE: TimelineOptions = {
    fps: FPS,
    leadInSeconds: 0.6,
    gapSeconds: 0.35,
    transitionFrames: 15,
    outroHoldSeconds: 1.5,
};

export interface SceneTiming<Id extends string = string> {
    id: Id;
    /** Absolute frame the scene's visuals start (transition in included). */
    from: number;
    durationInFrames: number;
    /** Absolute frame the scene's voice-over line starts. */
    voFrom: number;
    voFrames: number;
}

export interface Timeline<Id extends string = string> {
    scenes: SceneTiming<Id>[];
    transitionFrames: number;
    totalFrames: number;
}

/**
 * Lay the voice-over lines end to end, then cut the visuals around them: each
 * scene's transition in finishes exactly as its line starts, so a line never
 * plays over the previous scene. Audio and visuals are separate layers, which
 * keeps the transition overlap from eating into the voice-over.
 */
export function buildTimeline<Id extends string>(
    lines: { id: Id; seconds: number }[],
    options: TimelineOptions = DEFAULT_TIMELINE,
): Timeline<Id> {
    if (lines.length === 0) throw new Error("The timeline needs a line");
    const { fps, transitionFrames: overlap } = options;
    const gap = Math.round(options.gapSeconds * fps);

    let voFrom = Math.round(options.leadInSeconds * fps);
    const placed = lines.map(({ id, seconds }) => {
        // Round up so no audio is cut off; the epsilon absorbs float noise
        // (0.1 * 30 is 3.0000000000000004, which must stay 3 frames).
        const voFrames = Math.ceil(seconds * fps - 1e-6);
        const line = { id, voFrom, voFrames };
        voFrom += voFrames + gap;
        return line;
    });

    const last = placed[placed.length - 1];
    const totalFrames =
        last.voFrom +
        last.voFrames +
        Math.round(options.outroHoldSeconds * fps);

    const starts = placed.map((line, i) =>
        i === 0 ? 0 : line.voFrom - overlap,
    );
    const scenes = placed.map((line, i) => {
        const end =
            i + 1 < placed.length ? starts[i + 1] + overlap : totalFrames;
        return { ...line, from: starts[i], durationInFrames: end - starts[i] };
    });

    for (const scene of scenes) {
        if (scene.durationInFrames <= 2 * overlap) {
            throw new Error(
                `Scene "${scene.id}" is too short for its transitions`,
            );
        }
    }
    if (totalFrames > MAX_SECONDS * fps) {
        throw new Error(
            `Video runs ${(totalFrames / fps).toFixed(1)}s; the cap is ${MAX_SECONDS}s. Trim the script.`,
        );
    }
    return { scenes, transitionFrames: overlap, totalFrames };
}
