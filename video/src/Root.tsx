import { Composition } from "remotion";
import { SCRIPT } from "./data/script.ts";
import { buildTimeline, FPS } from "./data/timeline.ts";
import type { VoiceoverManifest } from "./data/voiceover.ts";
import voiceoverJson from "./data/voiceover.json";
import { Video, type VideoProps } from "./Video.tsx";

const voiceover = voiceoverJson as VoiceoverManifest;

const timeline = buildTimeline(
    SCRIPT.map(({ id }) => {
        const line = voiceover.lines[id];
        if (!line) throw new Error(`No voice-over for "${id}": run npm run vo`);
        return { id, seconds: line.seconds };
    }),
);

const props: VideoProps = { timeline, voiceover };

/** One video, two shapes: phones (9:16) and laptops/TVs (16:9). */
export function RemotionRoot() {
    return (
        <>
            <Composition
                id="WebsiteImpact-Vertical"
                component={Video}
                durationInFrames={timeline.totalFrames}
                fps={FPS}
                width={1080}
                height={1920}
                defaultProps={props}
            />
            <Composition
                id="WebsiteImpact-Landscape"
                component={Video}
                durationInFrames={timeline.totalFrames}
                fps={FPS}
                width={1920}
                height={1080}
                defaultProps={props}
            />
        </>
    );
}
