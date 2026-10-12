/**
 * Renders review stills for both compositions into out/stills/: by default
 * one frame per scene, just before it cuts away (every animation landed).
 *
 *   npm run still                 one still per scene
 *   npm run still -- 120 640      specific frames
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { SCRIPT } from "../src/data/script.ts";
import { buildTimeline } from "../src/data/timeline.ts";
import voiceover from "../src/data/voiceover.json" with { type: "json" };

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "out", "stills");

const timeline = buildTimeline(
    SCRIPT.map(({ id }) => ({
        id,
        seconds: (voiceover.lines as Record<string, { seconds: number }>)[id]
            .seconds,
    })),
);
const requested = process.argv.slice(2).map(Number).filter(Number.isFinite);
const frames = requested.length
    ? requested.map((frame) => ({ name: `f${frame}`, frame }))
    : timeline.scenes.map((scene) => ({
          name: scene.id,
          frame:
              scene.from +
              scene.durationInFrames -
              (scene.id === "outro" ? 1 : timeline.transitionFrames + 2),
      }));

await mkdir(outDir, { recursive: true });
const serveUrl = await bundle({
    entryPoint: path.join(root, "src", "index.ts"),
});
for (const id of ["WebsiteImpact-Vertical", "WebsiteImpact-Landscape"]) {
    const composition = await selectComposition({ serveUrl, id });
    for (const { name, frame } of frames) {
        const output = path.join(
            outDir,
            `${id.split("-")[1].toLowerCase()}-${name}.png`,
        );
        await renderStill({ serveUrl, composition, frame, output });
        console.log(`${path.relative(root, output)} (frame ${frame})`);
    }
}
