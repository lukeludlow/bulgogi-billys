# Website impact video

A sub-60-second video for Billy on what bulgogibillys.com has done: reach,
Google search, audience, milestones and what's next. It's rendered with
[Remotion](https://www.remotion.dev) in two shapes, 9:16 for phones and 16:9 for
screens, and narrated by Luke's ElevenLabs voice clone.

Use Node 22.18 or newer (`nvm use 22`). Run everything from `video/`.

## On a fresh checkout

Git doesn't track the site screenshots, the brand image copies, or the
voice-over. The voice-over is the cloned-voice clips in `public/vo/` plus
`src/data/voiceover.json`. Without that file the video project won't build, so
before the first render:

1. `npm install`
2. Serve the site: `npm run build && npx vite preview` in the repo root. Then
   run `npm run screens` here.
3. `npm run vo` generates the voice-over. It needs the ElevenLabs credentials
   described below.

## Re-render with fresh analytics

1. Drop the new exports into `../analytics/`: the Vercel "Top …" CSVs and the
   Search Console `…-Performance-on-Search-<date>/` folder.
2. `npm run stats` rebuilds `src/data/stats.json`, then `npm run map` rebuilds
   the dot map's lit countries.
3. If the numbers moved, edit the spoken lines in `src/data/script.ts` and run
   `npm run vo`. Only changed lines are regenerated. The voice needs
   `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in the repo-root `.env`.
4. Optionally run `npm run screens` to re-capture the site in dark mode. It
   needs `npm run build && npx vite preview` running in the repo root, or set
   `BASE_URL`.
5. `npm run still` writes review frames to `out/stills/`, and `npm run studio`
   opens a live preview.
6. `npm run render` writes `out/bulgogi-billys-impact-{vertical,landscape}.mp4`.

The scenes are timed from the voice-over clip lengths, and visuals land on
spoken words (`useScene().cue("September", …)`). Rewording a line re-times
itself, and `buildTimeline` refuses to go past 59 seconds.

## Tests

`npm test` runs every pure module (stats derivation, timeline, word cues, dot
map). The repo root's `npm test` and `verify.sh` also run the dependency-free
subset.
