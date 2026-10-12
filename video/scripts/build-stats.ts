/**
 * Turns the analytics exports in ../analytics into src/data/stats.json, the
 * only numbers the video shows. Re-run (`npm run stats`) after downloading
 * fresh exports.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { deriveStats } from "./stats/deriveStats.ts";
import { loadExports } from "./stats/loadExports.ts";

const root = path.resolve(import.meta.dirname, "..");
const { exports, through } = await loadExports(
    path.resolve(root, "..", "analytics"),
);
const stats = deriveStats(exports, through);
const out = path.join(root, "src", "data", "stats.json");
await writeFile(out, JSON.stringify(stats, null, 4) + "\n");

const { search } = stats;
console.log(`Wrote ${path.relative(root, out)} (through ${through})`);
console.log(
    `  ${stats.visitors} visitors · ${stats.publicPageViews} page views · ${stats.countries.length} countries`,
);
console.log(
    `  search ${search.clicks} clicks / ${search.impressions} impressions · ` +
        `${search.growth.from.label}→${search.growth.to.label} ${search.growth.multiple.toFixed(1)}×`,
);
