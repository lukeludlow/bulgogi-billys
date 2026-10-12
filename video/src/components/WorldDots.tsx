import { useCurrentFrame, useVideoConfig } from "remotion";
import type { CountryVisits } from "../data/types.ts";
import worldDots from "../data/worldDots.json";
import { pop } from "../motion.ts";
import { color } from "../theme.ts";

type Dot = [number, number, string | null];
// JSON imports widen tuples to arrays; the file is written by build-map.ts.
const grid = worldDots as unknown as {
    width: number;
    height: number;
    dots: Dot[];
    pins: Record<string, [number, number]>;
};

/**
 * Dot-matrix world map. Countries with visitors light up in orange — the US
 * first, then the rest — and a pulse marks home base (Conroe, TX).
 */
export function WorldDots({
    countries,
    homeAt,
    worldAt,
    width,
}: {
    countries: CountryVisits[];
    /** Frame the US lights up. */
    homeAt: number;
    /** Frame the other countries start lighting, one every couple of frames. */
    worldAt: number;
    width: number;
}) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const scale = width / grid.width;

    const litAt = new Map<string, number>();
    countries.forEach(({ code }, rank) => {
        litAt.set(code, code === "US" ? homeAt : worldAt + (rank - 1) * 2);
    });

    const [hx, hy] = grid.pins.home;
    const pulse = ((frame - homeAt) % 45) / 45;

    return (
        <svg
            width={width}
            height={grid.height * scale}
            viewBox={`0 0 ${grid.width} ${grid.height}`}
            style={{ overflow: "visible" }}
        >
            {grid.dots.map(([x, y, code], i) => {
                const at = code ? litAt.get(code) : undefined;
                const lit = at === undefined ? 0 : pop(frame, at, fps);
                return (
                    <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r={3.3 + 0.9 * Math.min(lit, 1.2)}
                        fill={lit > 0.01 ? color.accent : color.land}
                        opacity={
                            lit > 0.01 ? 0.45 + 0.55 * Math.min(lit, 1) : 0.55
                        }
                    />
                );
            })}
            {frame >= homeAt && (
                <>
                    <circle
                        cx={hx}
                        cy={hy}
                        r={6 + pulse * 30}
                        fill="none"
                        stroke={color.ink}
                        strokeWidth={2}
                        opacity={1 - pulse}
                    />
                    <circle
                        cx={hx}
                        cy={hy}
                        r={6.5}
                        fill={color.ink}
                        stroke={color.bg}
                        strokeWidth={2}
                    />
                </>
            )}
        </svg>
    );
}
