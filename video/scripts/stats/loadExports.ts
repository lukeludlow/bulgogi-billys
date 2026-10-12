import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { AnalyticsExports } from "./deriveStats.ts";

const SEARCH_CONSOLE_DIR = /-Performance-on-Search-(\d{4}-\d{2}-\d{2})$/;

/**
 * Read the exports as downloaded into `dir`: Vercel's "Top <X> - <range>.csv"
 * files side by side with Search Console's
 * "<site>-Performance-on-Search-<date>/" folder. Matching by prefix means a
 * fresh download with a new date range drops in without code changes.
 */
export async function loadExports(
    dir: string,
): Promise<{ exports: AnalyticsExports; through: string }> {
    const entries = await readdir(dir);
    const find = (prefix: string) => {
        const match = entries.find(
            (name) => name.startsWith(prefix) && name.endsWith(".csv"),
        );
        if (!match) throw new Error(`No "${prefix}…" export in ${dir}`);
        return readFile(path.join(dir, match), "utf8");
    };

    const consoleDir = entries.find((name) => SEARCH_CONSOLE_DIR.test(name));
    if (!consoleDir) {
        throw new Error(`No Search Console export folder in ${dir}`);
    }
    const read = (file: string) =>
        readFile(path.join(dir, consoleDir, file), "utf8");

    const [countries, devices, pages, referrers, chart, queries] =
        await Promise.all([
            find("Top Countries"),
            find("Top Devices"),
            find("Top Pages"),
            find("Top Referrers"),
            read("Chart.csv"),
            read("Queries.csv"),
        ]);

    return {
        exports: {
            vercel: { countries, devices, pages, referrers },
            searchConsole: { chart, queries },
        },
        through: SEARCH_CONSOLE_DIR.exec(consoleDir)![1],
    };
}
