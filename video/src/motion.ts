import { Easing, interpolate, spring } from "remotion";

/** Ease-out-expo: quick to arrive, soft to settle. The video's default curve. */
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

/** 0→1 over `duration` frames starting at `start`, eased and clamped. */
export function progress(
    frame: number,
    start: number,
    duration: number,
    easing = easeOut,
): number {
    return interpolate(frame, [start, start + duration], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing,
    });
}

/** A gently overshooting 0→1 spring that starts at `start`. */
export function pop(frame: number, start: number, fps: number): number {
    return spring({
        frame: frame - start,
        fps,
        config: { damping: 14, stiffness: 140, mass: 0.8 },
    });
}

/** Rise-and-fade entrance: opacity plus an upward slide of `distance` px. */
export function rise(
    frame: number,
    start: number,
    distance = 40,
    duration = 18,
): { opacity: number; transform: string } {
    const p = progress(frame, start, duration);
    return {
        opacity: p,
        transform: `translateY(${(1 - p) * distance}px)`,
    };
}
