import type { CSSProperties } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { rise } from "../motion.ts";
import { color } from "../theme.ts";

/** A search box that types `text` from `start`, a character every frame. */
export function SearchBar({
    text,
    start,
    width,
    size = 44,
    style,
}: {
    text: string;
    start: number;
    width: number;
    size?: number;
    style?: CSSProperties;
}) {
    const frame = useCurrentFrame();
    const typed = text.slice(0, Math.max(0, Math.floor((frame - start) * 0.9)));
    const caretOn =
        Math.floor(frame / 15) % 2 === 0 || typed.length < text.length;
    return (
        <div
            style={{
                width,
                height: size * 2.3,
                display: "flex",
                alignItems: "center",
                gap: size * 0.45,
                padding: `0 ${size * 0.7}px`,
                borderRadius: size * 2,
                backgroundColor: color.raised,
                border: `1px solid rgba(255,255,255,0.12)`,
                boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
                fontSize: size,
                fontWeight: 500,
                color: color.ink,
                ...rise(frame, start - 8, 30),
                ...style,
            }}
        >
            <MagnifyingGlassIcon
                style={{
                    width: size * 1.05,
                    color: color.muted,
                    flexShrink: 0,
                }}
            />
            <span>
                {typed}
                <span
                    style={{
                        display: "inline-block",
                        width: 3,
                        height: size * 1.05,
                        marginLeft: 4,
                        verticalAlign: "middle",
                        backgroundColor: color.accent,
                        opacity: caretOn ? 1 : 0,
                    }}
                />
            </span>
        </div>
    );
}

/**
 * How the home page appears in Google, using the site's real title and
 * description (src/site/pages/home/Home.tsx). Dark-mode Google colors.
 */
export function SearchResult({
    width,
    start,
    style,
}: {
    width: number;
    start: number;
    style?: CSSProperties;
}) {
    const frame = useCurrentFrame();
    const s = width / 900;
    return (
        <div
            style={{
                width,
                padding: 40 * s,
                borderRadius: 32 * s,
                backgroundColor: "#202124",
                border: `1px solid rgba(255,255,255,0.1)`,
                boxShadow: "0 30px 70px rgba(0,0,0,0.5)",
                ...rise(frame, start, 40),
                ...style,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 18 * s }}>
                <div
                    style={{
                        width: 64 * s,
                        height: 64 * s,
                        borderRadius: "50%",
                        backgroundColor: "#303134",
                        display: "grid",
                        placeItems: "center",
                        overflow: "hidden",
                    }}
                >
                    <Img
                        src={staticFile("brand/logo-648.webp")}
                        style={{ width: "92%" }}
                    />
                </div>
                <div>
                    <div
                        style={{
                            fontSize: 30 * s,
                            color: "#dadce0",
                            fontWeight: 500,
                        }}
                    >
                        Bulgogi Billy's
                    </div>
                    <div style={{ fontSize: 26 * s, color: "#9aa0a6" }}>
                        https://www.bulgogibillys.com
                    </div>
                </div>
            </div>
            <div
                style={{
                    marginTop: 18 * s,
                    fontSize: 42 * s,
                    lineHeight: 1.25,
                    color: "#8ab4f8",
                    fontWeight: 500,
                }}
            >
                Bulgogi Billy's | Korean Fusion Food Truck – Houston, TX
            </div>
            <div
                style={{
                    marginTop: 10 * s,
                    fontSize: 29 * s,
                    lineHeight: 1.45,
                    color: "#bdc1c6",
                }}
            >
                Bulgogi Billy's serves Korean-American fusion food every weekend
                at farmers markets in The Woodlands, Conroe, and New Caney, TX.
            </div>
        </div>
    );
}

/** A past search, shown as a pill with a magnifier. */
export function QueryChip({
    text,
    start,
    size = 40,
}: {
    text: string;
    start: number;
    size?: number;
}) {
    const frame = useCurrentFrame();
    return (
        <div
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: size * 0.4,
                padding: `${size * 0.42}px ${size * 0.7}px`,
                borderRadius: size * 2,
                backgroundColor: color.raised,
                border: `1px solid rgba(255,255,255,0.1)`,
                fontSize: size,
                fontWeight: 500,
                color: color.ink,
                ...rise(frame, start, 30, 16),
            }}
        >
            <MagnifyingGlassIcon
                style={{ width: size * 0.95, color: color.accent }}
            />
            {text}
        </div>
    );
}
