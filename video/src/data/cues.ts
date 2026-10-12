/** ElevenLabs' per-character timing for a generated line. */
export interface CharacterAlignment {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
}

export interface SpokenWord {
    /** Lower-cased, punctuation stripped: "september". */
    word: string;
    start: number;
    end: number;
}

/** "'Catering" → "catering", "Billy's" → "billy's", "twenty-four" → "twentyfour". */
const normalize = (text: string) =>
    text
        .toLowerCase()
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[^a-z0-9']/g, "")
        .replace(/^'+|'+$/g, "");

/** Collapse character timings into word timings, splitting on whitespace. */
export function wordsFromAlignment(
    alignment: CharacterAlignment,
): SpokenWord[] {
    const words: SpokenWord[] = [];
    let current: { raw: string; start: number; end: number } | null = null;
    const flush = () => {
        if (current && normalize(current.raw)) {
            words.push({
                word: normalize(current.raw),
                start: current.start,
                end: current.end,
            });
        }
        current = null;
    };

    alignment.characters.forEach((char, i) => {
        if (/\s/.test(char)) {
            flush();
            return;
        }
        const start = alignment.character_start_times_seconds[i];
        const end = alignment.character_end_times_seconds[i];
        if (current) {
            current.raw += char;
            current.end = end;
        } else {
            current = { raw: char, start, end };
        }
    });
    flush();
    return words;
}

/**
 * Seconds into a line at which `phrase` starts being spoken, so a visual can
 * land on the word ("September" → the catering screen). Falls back to
 * `fallback` when the line has no timings, e.g. a clip dropped in by hand.
 */
export function cueAt(
    words: SpokenWord[] | undefined,
    phrase: string,
    fallback: number,
): number {
    const target = phrase.split(/\s+/).map(normalize).filter(Boolean);
    if (!words || target.length === 0) return fallback;
    for (let i = 0; i + target.length <= words.length; i++) {
        // Normalize stored words too: manifests may predate a normalize fix.
        if (target.every((word, j) => normalize(words[i + j].word) === word)) {
            return words[i].start;
        }
    }
    return fallback;
}
