import type { SpokenWord } from "./cues.ts";

/** Shape of src/data/voiceover.json, written by scripts/voiceover.ts. */
export interface VoiceoverManifest {
    model: string;
    lines: Record<string, VoiceoverLine>;
}

export interface VoiceoverLine {
    /** File name under public/vo/. */
    file: string;
    seconds: number;
    /** Hash of model + voice + text; a mismatch means the line is stale. */
    textHash: string;
    /** Hash of the MP3 itself, to notice a clip replaced by hand. */
    audioHash: string;
    /** Word timings from ElevenLabs; absent for hand-made clips. */
    words?: SpokenWord[];
}
