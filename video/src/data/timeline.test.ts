import { describe, expect, it } from "vitest";
import { buildTimeline, type TimelineOptions } from "./timeline.ts";

const OPTIONS: TimelineOptions = {
    fps: 30,
    leadInSeconds: 1,
    gapSeconds: 0.5,
    transitionFrames: 10,
    outroHoldSeconds: 2,
};

const LINES = [
    { id: "a", seconds: 3 },
    { id: "b", seconds: 4.01 },
    { id: "c", seconds: 2 },
];

describe("buildTimeline", () => {
    const timeline = buildTimeline(LINES, OPTIONS);

    it("lays lines end to end after the lead-in, separated by the gap", () => {
        expect(
            timeline.scenes.map(({ voFrom, voFrames }) => [voFrom, voFrames]),
        ).toEqual([
            [30, 90],
            [135, 121], // 4.01s rounds up so no audio is cut off
            [271, 60],
        ]);
    });

    it("starts each later scene one transition before its line", () => {
        expect(timeline.scenes.map((s) => s.from)).toEqual([0, 125, 261]);
    });

    it("overlaps neighbouring scenes by exactly the transition", () => {
        const [a, b, c] = timeline.scenes;
        expect(a.from + a.durationInFrames - b.from).toBe(10);
        expect(b.from + b.durationInFrames - c.from).toBe(10);
    });

    it("never plays a line over the previous scene", () => {
        for (const [i, scene] of timeline.scenes.entries()) {
            const previous = timeline.scenes[i - 1];
            if (previous) {
                expect(scene.voFrom).toBeGreaterThanOrEqual(
                    previous.from + previous.durationInFrames,
                );
            }
        }
    });

    it("ends with the outro hold after the last line", () => {
        expect(timeline.totalFrames).toBe(271 + 60 + 60);
        const last = timeline.scenes[2];
        expect(last.from + last.durationInFrames).toBe(timeline.totalFrames);
    });

    it("rejects a video at or over the one-minute cap", () => {
        expect(() =>
            buildTimeline([{ id: "long", seconds: 58 }], OPTIONS),
        ).toThrow(/cap is 59s/);
    });

    it("rejects a scene too short to transition in and out", () => {
        expect(() =>
            buildTimeline(
                [
                    { id: "a", seconds: 2 },
                    { id: "blip", seconds: 0.1 },
                    { id: "c", seconds: 2 },
                ],
                { ...OPTIONS, gapSeconds: 0 },
            ),
        ).toThrow(/"blip" is too short/);
    });

    it("needs at least one line", () => {
        expect(() => buildTimeline([], OPTIONS)).toThrow();
    });
});
