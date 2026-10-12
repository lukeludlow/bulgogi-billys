/**
 * Precomputes the dot world map into src/data/worldDots.json, so the video
 * renders ~1,500 circles instead of running point-in-polygon tests per frame.
 * Re-run (`npm run map`) after `npm run stats` if the country list changes.
 */
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import countries from "i18n-iso-countries";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { VideoStats } from "../src/data/types.ts";
import { buildDotGrid } from "./map/dotGrid.ts";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const topology = JSON.parse(
    await readFile(require.resolve("world-atlas/countries-50m.json"), "utf8"),
) as Topology<{ countries: GeometryCollection }>;
const stats = JSON.parse(
    await readFile(path.join(root, "src", "data", "stats.json"), "utf8"),
) as VideoStats;

const ANTARCTICA = "010";
const world = feature(
    topology,
    topology.objects.countries,
) as FeatureCollection<Geometry>;
const land = world.features
    .filter((f: Feature<Geometry>) => f.id !== ANTARCTICA)
    .map((f: Feature<Geometry>) => ({
        code: f.id ? (countries.numericToAlpha2(String(f.id)) ?? null) : null,
        feature: f,
    }));

const grid = buildDotGrid(
    land,
    new Set(stats.countries.map((c) => c.code)),
    // Home base: Conroe, TX — where the markets are.
    { width: 1000, height: 500, step: 11, pins: { home: [-95.46, 30.31] } },
);
const lit = new Set(grid.dots.map(([, , code]) => code));
const missing = stats.countries.filter((c) => !lit.has(c.code));
if (missing.length) {
    throw new Error(`No dot for ${missing.map((c) => c.code).join(", ")}`);
}

const out = path.join(root, "src", "data", "worldDots.json");
await writeFile(out, JSON.stringify(grid) + "\n");
console.log(`Wrote ${path.relative(root, out)}: ${grid.dots.length} dots`);
