import { describe, expect, it } from "vitest";
import { cueAt, wordsFromAlignment, type CharacterAlignment } from "./cues.ts";

/** Fake timings: every character takes 0.1s. */
function align(text: string): CharacterAlignment {
    const characters = [...text];
    return {
        characters,
        character_start_times_seconds: characters.map((_, i) => i / 10),
        character_end_times_seconds: characters.map((_, i) => (i + 1) / 10),
    };
}

describe("wordsFromAlignment", () => {
    it("groups characters into normalized words with their span", () => {
        const words = wordsFromAlignment(align("May: launch. Next up!"));
        expect(words.map((w) => w.word)).toEqual([
            "may",
            "launch",
            "next",
            "up",
        ]);
        expect(words[1].start).toBeCloseTo(0.5);
        expect(words[1].end).toBeCloseTo(1.2);
    });

    it("drops pure punctuation and collapses repeated spaces", () => {
        const words = wordsFromAlignment(align("a  —  b"));
        expect(words.map((w) => w.word)).toEqual(["a", "b"]);
    });

    it("keeps apostrophes inside words", () => {
        expect(wordsFromAlignment(align("Billy's"))[0].word).toBe("billy's");
    });

    it("strips quote marks around words", () => {
        const words = wordsFromAlignment(align("like 'catering Conroe.'"));
        expect(words.map((w) => w.word)).toEqual([
            "like",
            "catering",
            "conroe",
        ]);
    });
});

describe("cueAt", () => {
    const words = wordsFromAlignment(
        align("Summer: your sales. And September: catering."),
    );

    it("finds a single word regardless of case and punctuation", () => {
        expect(cueAt(words, "September", 9)).toBeCloseTo(2.4);
    });

    it("finds a multi-word phrase", () => {
        expect(cueAt(words, "your sales", 9)).toBeCloseTo(0.8);
    });

    it("falls back when the phrase isn't spoken", () => {
        expect(cueAt(words, "October", 7)).toBe(7);
    });

    it("matches words stored before quote marks were stripped", () => {
        const stale = [{ word: "'catering", start: 1.5, end: 2 }];
        expect(cueAt(stale, "catering", 0)).toBe(1.5);
    });

    it("falls back when the line has no timings", () => {
        expect(cueAt(undefined, "September", 3)).toBe(3);
    });
});
