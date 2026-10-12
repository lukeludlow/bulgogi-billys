import {
    geoBounds,
    geoCentroid,
    geoContains,
    geoNaturalEarth1,
    type GeoPermissibleObjects,
} from "d3-geo";
import type { Feature, Geometry } from "geojson";

/** A dot at (x, y) in map space, tagged with its country's ISO alpha-2. */
export type Dot = [x: number, y: number, code: string | null];

export interface DotGrid {
    width: number;
    height: number;
    dots: Dot[];
    /** Named lon/lat points projected into the same map space. */
    pins: Record<string, [x: number, y: number]>;
}

export interface Country {
    code: string | null;
    feature: Feature<Geometry>;
}

/**
 * Sample the world on a regular screen-space grid (Natural Earth projection)
 * and keep the points that fall on land, so the map renders as evenly spaced
 * dots. A `visited` country too small to catch a grid point (Singapore, Costa
 * Rica) gets one dot at its centroid so it can still light up.
 */
export function buildDotGrid(
    countries: Country[],
    visited: Set<string>,
    {
        width,
        height,
        step,
        pins = {},
    }: {
        width: number;
        height: number;
        step: number;
        pins?: Record<string, [lon: number, lat: number]>;
    },
): DotGrid {
    const projection = geoNaturalEarth1().fitSize([width, height], {
        type: "FeatureCollection",
        features: countries.map((c) => c.feature),
    } as GeoPermissibleObjects);

    const boxes = countries.map(({ feature }) => geoBounds(feature));
    const inBox = (i: number, [lon, lat]: [number, number]) => {
        const [[west, south], [east, north]] = boxes[i];
        if (lat < south || lat > north) return false;
        // A box crossing the antimeridian has west > east.
        return west <= east
            ? lon >= west && lon <= east
            : lon >= west || lon <= east;
    };

    const dots: Dot[] = [];
    const hasDot = new Set<string>();
    for (let y = step / 2; y < height; y += step) {
        for (let x = step / 2; x < width; x += step) {
            const point = projection.invert?.([x, y]);
            if (!point || !Number.isFinite(point[0])) continue;
            const index = countries.findIndex(
                ({ feature }, i) =>
                    inBox(i, point) && geoContains(feature, point),
            );
            if (index === -1) continue;
            const code = countries[index].code;
            dots.push([round(x), round(y), code]);
            if (code) hasDot.add(code);
        }
    }

    for (const { code, feature } of countries) {
        if (!code || !visited.has(code) || hasDot.has(code)) continue;
        const centre = projection(geoCentroid(feature));
        if (!centre) continue;
        dots.push([round(centre[0]), round(centre[1]), code]);
        hasDot.add(code);
    }

    const projected: DotGrid["pins"] = {};
    for (const [name, lonLat] of Object.entries(pins)) {
        const point = projection(lonLat);
        if (point) projected[name] = [round(point[0]), round(point[1])];
    }

    return { width, height, dots, pins: projected };
}

const round = (n: number) => Math.round(n * 10) / 10;
