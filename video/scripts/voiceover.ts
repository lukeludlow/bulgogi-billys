/**
 * Generates the voice-over with Luke's ElevenLabs voice clone: one MP3 per
 * scene in public/vo/, plus src/data/voiceover.json with each clip's length
 * and word timings, which the timeline and the scenes' cues are built from.
 *
 *   npm run vo                     generate lines whose text changed
 *   npm run vo -- --force          regenerate every line
 *   npm run vo -- --only=journey   regenerate one line
 *   npm run vo -- --measure-only   no API calls: re-measure clips dropped into
 *                                  public/vo/ by hand (e.g. from the web UI)
 *
 * Credentials come from the repo-root .env (`node --env-file=../.env`), and
 * are never printed.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseMedia } from "@remotion/media-parser";
import { nodeReader } from "@remotion/media-parser/node";
import {
    wordsFromAlignment,
    type CharacterAlignment,
} from "../src/data/cues.ts";
import { SCRIPT } from "../src/data/script.ts";
import type { VoiceoverManifest } from "../src/data/voiceover.ts";

const MODEL_ID = "eleven_multilingual_v2";
const OUTPUT_FORMAT = "mp3_44100_128";

const root = path.resolve(import.meta.dirname, "..");
const voDir = path.join(root, "public", "vo");
const manifestPath = path.join(root, "src", "data", "voiceover.json");

const args = process.argv.slice(2);
const force = args.includes("--force");
const measureOnly = args.includes("--measure-only");
const only = args.find((arg) => arg.startsWith("--only="))?.slice(7);
if (only && !SCRIPT.some((line) => line.id === only)) {
    fail(
        `--only=${only} is not a scene (${SCRIPT.map((l) => l.id).join(", ")})`,
    );
}

function fail(message: string): never {
    console.error(message);
    process.exit(1);
}

function env(name: string): string {
    const value = process.env[name];
    if (!value) {
        fail(
            `${name} is not set. Add it to the repo-root .env (no VITE_ prefix).`,
        );
    }
    return value;
}

const sha = (data: string | Uint8Array) =>
    createHash("sha256").update(data).digest("hex").slice(0, 16);

async function readManifest(): Promise<VoiceoverManifest> {
    try {
        return JSON.parse(await readFile(manifestPath, "utf8"));
    } catch {
        return { model: MODEL_ID, lines: {} };
    }
}

async function durationOf(file: string): Promise<number> {
    const { durationInSeconds } = await parseMedia({
        src: file,
        reader: nodeReader,
        fields: { durationInSeconds: true },
        acknowledgeRemotionLicense: true,
    });
    if (!durationInSeconds) fail(`Couldn't read the length of ${file}`);
    return durationInSeconds;
}

interface WithTimestamps {
    audio_base64: string;
    alignment: CharacterAlignment | null;
}

async function synthesize(
    voiceId: string,
    apiKey: string,
    text: string,
    previousText: string | undefined,
    nextText: string | undefined,
): Promise<WithTimestamps> {
    const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=${OUTPUT_FORMAT}`,
        {
            method: "POST",
            headers: {
                "xi-api-key": apiKey,
                "Content-Type": "application/json",
            },
            // No voice_settings: the clone's own saved settings apply.
            body: JSON.stringify({
                text,
                model_id: MODEL_ID,
                // Neighbouring lines keep intonation continuous across clips.
                previous_text: previousText,
                next_text: nextText,
            }),
        },
    );
    if (!response.ok) {
        fail(
            `ElevenLabs answered ${response.status}: ${(await response.text()).slice(0, 500)}`,
        );
    }
    return (await response.json()) as WithTimestamps;
}

const manifest = await readManifest();
await mkdir(voDir, { recursive: true });
const credentials = measureOnly
    ? null
    : {
          apiKey: env("ELEVENLABS_API_KEY"),
          voiceId: env("ELEVENLABS_VOICE_ID"),
      };

for (const [i, line] of SCRIPT.entries()) {
    const file = `${line.id}.mp3`;
    const filePath = path.join(voDir, file);
    const textHash = sha(
        `${MODEL_ID}\n${credentials?.voiceId ?? ""}\n${line.spoken}`,
    );
    const previous = manifest.lines[line.id];

    const upToDate =
        previous?.textHash === textHash && existsSync(filePath) && !force;
    const wanted = only ? only === line.id : !upToDate;

    if (credentials && wanted) {
        process.stdout.write(`${line.id}: generating… `);
        const result = await synthesize(
            credentials.voiceId,
            credentials.apiKey,
            line.spoken,
            SCRIPT[i - 1]?.spoken,
            SCRIPT[i + 1]?.spoken,
        );
        const audio = Buffer.from(result.audio_base64, "base64");
        await writeFile(filePath, audio);
        manifest.lines[line.id] = {
            file,
            seconds: await durationOf(filePath),
            textHash,
            audioHash: sha(audio),
            words: result.alignment
                ? wordsFromAlignment(result.alignment)
                : undefined,
        };
        console.log(`${manifest.lines[line.id].seconds.toFixed(2)}s`);
        continue;
    }

    if (!existsSync(filePath)) {
        fail(`${line.id}: public/vo/${file} is missing — run \`npm run vo\``);
    }
    const audio = await readFile(filePath);
    const audioHash = sha(audio);
    const replacedByHand = previous?.audioHash !== audioHash;
    manifest.lines[line.id] = {
        file,
        seconds: await durationOf(filePath),
        // A clip swapped in by hand no longer matches the stored timings.
        textHash: replacedByHand ? "" : (previous?.textHash ?? ""),
        audioHash,
        words: replacedByHand ? undefined : previous?.words,
    };
    console.log(
        `${line.id}: ${replacedByHand ? "measured (hand-made clip)" : "unchanged"} ` +
            `${manifest.lines[line.id].seconds.toFixed(2)}s`,
    );
}

manifest.model = MODEL_ID;
await writeFile(manifestPath, JSON.stringify(manifest, null, 4) + "\n");
const total = SCRIPT.reduce((sum, l) => sum + manifest.lines[l.id].seconds, 0);
console.log(`Voice-over: ${total.toFixed(1)}s across ${SCRIPT.length} lines`);
