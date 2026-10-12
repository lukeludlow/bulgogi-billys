import { describe, expect, it } from "vitest";
import type { Feature, Polygon } from "geojson";
import { buildDotGrid, type Country } from "./dotGrid.ts";

/** A lon/lat rectangle, wound clockwise as d3-geo expects of an exterior. */
function box(
    code: string | null,
    west: number,
    south: number,
    east: number,
    north: number,
): Country {
    const feature: Feature<Polygon> = {
        type: "Feature",
        properties: {},
        geometry: {
            type: "Polygon",
            coordinates: [
                [
                    [west, south],
                    [west, north],
                    [east, north],
                    [east, south],
                    [west, south],
                ],
            ],
        },
    };
    return { code, feature };
}

const BIG_A = box("AA", -60, -30, -10, 30);
const BIG_B = box("BB", 10, -30, 60, 30);
const TINY = box("TT", 0, 0, 0.01, 0.01);
const UNNAMED = box(null, 70, -10, 90, 10);

describe("buildDotGrid", () => {
    const grid = buildDotGrid(
        [BIG_A, BIG_B, TINY, UNNAMED],
        new Set(["AA", "TT"]),
        { width: 400, height: 200, step: 10, pins: { centre: [-35, 0] } },
    );
    const codes = grid.dots.map(([, , code]) => code);

    it("keeps the map size", () => {
        expect([grid.width, grid.height]).toEqual([400, 200]);
    });

    it("tags land dots with their country", () => {
        expect(codes.filter((c) => c === "AA").length).toBeGreaterThan(10);
        expect(codes.filter((c) => c === "BB").length).toBeGreaterThan(10);
    });

    it("keeps land with no country code as untagged dots", () => {
        expect(codes).toContain(null);
    });

    it("drops ocean points", () => {
        const cells = (400 / 10) * (200 / 10);
        expect(grid.dots.length).toBeLessThan(cells);
    });

    it("gives a visited country too small for the grid a centroid dot", () => {
        expect(codes.filter((c) => c === "TT")).toHaveLength(1);
    });

    it("projects pins into map space, inside the country they name", () => {
        const [x, y] = grid.pins.centre;
        const near = grid.dots.filter(
            ([dx, dy]) => Math.hypot(dx - x, dy - y) < 10,
        );
        expect(near.length).toBeGreaterThan(0);
        expect(near.every(([, , code]) => code === "AA")).toBe(true);
    });

    it("places every dot inside the map", () => {
        for (const [x, y] of grid.dots) {
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThanOrEqual(400);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(y).toBeLessThanOrEqual(200);
        }
    });
});
