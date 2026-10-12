import type { CSSProperties, ReactNode } from "react";
import { LockClosedIcon } from "@heroicons/react/20/solid";
import { Img, staticFile } from "remotion";
import { color, fontFamily } from "../theme.ts";

/** One screenshot shown in a device; several stack to crossfade. */
export interface ScreenLayer {
    /** File under public/screens/, without extension. */
    screen: string;
    /** 0 = top of the page, 1 = bottom. */
    scroll?: number;
    opacity?: number;
}

function Screens({ layers }: { layers: ScreenLayer[] }) {
    return (
        <>
            {layers.map(({ screen, scroll = 0, opacity = 1 }) => (
                <Img
                    key={screen}
                    src={staticFile(`screens/${screen}.jpg`)}
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        // Positions a tall full-page shot by fraction scrolled.
                        objectPosition: `50% ${scroll * 100}%`,
                        opacity,
                    }}
                />
            ))}
        </>
    );
}

/** An iPhone-proportioned frame (390×844 screen) with a status bar. */
export function PhoneFrame({
    layers,
    width,
    style,
    children,
}: {
    layers: ScreenLayer[];
    width: number;
    style?: CSSProperties;
    children?: ReactNode;
}) {
    const bezel = width * 0.035;
    const screenWidth = width - bezel * 2;
    const screenHeight = (screenWidth * 844) / 390;
    const statusBar = screenHeight * 0.055;
    return (
        <div
            style={{
                position: "absolute",
                width,
                height: screenHeight + bezel * 2,
                padding: bezel,
                borderRadius: width * 0.16,
                background:
                    "linear-gradient(145deg, #3f3f46, #18181b 40%, #0a0a0a)",
                boxShadow: `0 0 0 ${Math.max(1, width * 0.004)}px rgba(255,255,255,0.14), 0 ${width * 0.08}px ${width * 0.25}px rgba(0,0,0,0.65)`,
                ...style,
            }}
        >
            <div
                style={{
                    position: "relative",
                    width: screenWidth,
                    height: screenHeight,
                    borderRadius: width * 0.13,
                    overflow: "hidden",
                    backgroundColor: "#000",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        top: statusBar,
                    }}
                >
                    <Screens layers={layers} />
                </div>
                <StatusBar height={statusBar} width={screenWidth} />
                {children}
            </div>
        </div>
    );
}

function StatusBar({ height, width }: { height: number; width: number }) {
    const font = height * 0.38;
    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                height,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: `0 ${width * 0.09}px`,
                fontFamily,
                fontWeight: 600,
                fontSize: font,
                color: "#fff",
                backgroundColor: "#18181b",
            }}
        >
            <span>9:41</span>
            {/* Dynamic Island */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: height * 0.18,
                    width: width * 0.3,
                    height: height * 0.62,
                    transform: "translateX(-50%)",
                    borderRadius: height,
                    backgroundColor: "#000",
                }}
            />
            <div
                style={{ display: "flex", gap: font * 0.3, alignItems: "end" }}
            >
                {[0.35, 0.55, 0.75, 0.95].map((h) => (
                    <div
                        key={h}
                        style={{
                            width: font * 0.18,
                            height: font * h,
                            borderRadius: 1,
                            backgroundColor: "#fff",
                        }}
                    />
                ))}
                <div
                    style={{
                        marginLeft: font * 0.3,
                        width: font * 1.5,
                        height: font * 0.75,
                        borderRadius: font * 0.2,
                        border: `${Math.max(1, font * 0.07)}px solid rgba(255,255,255,0.6)`,
                        padding: font * 0.08,
                    }}
                >
                    <div
                        style={{
                            width: "80%",
                            height: "100%",
                            borderRadius: font * 0.1,
                            backgroundColor: "#fff",
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

/** A desktop browser window (1440×900 viewport) with its address bar. */
export function BrowserFrame({
    layers,
    width,
    url,
    style,
}: {
    layers: ScreenLayer[];
    width: number;
    url: string;
    style?: CSSProperties;
}) {
    const bar = width * 0.042;
    const contentHeight = (width * 900) / 1440;
    return (
        <div
            style={{
                position: "absolute",
                width,
                height: bar + contentHeight,
                borderRadius: width * 0.014,
                overflow: "hidden",
                backgroundColor: color.surface,
                boxShadow: `0 0 0 1px rgba(255,255,255,0.12), 0 ${width * 0.04}px ${width * 0.1}px rgba(0,0,0,0.6)`,
                ...style,
            }}
        >
            <div
                style={{
                    height: bar,
                    display: "flex",
                    alignItems: "center",
                    gap: bar * 0.22,
                    padding: `0 ${bar * 0.45}px`,
                    backgroundColor: "#1f1f23",
                    borderBottom: `1px solid ${color.hairline}`,
                }}
            >
                {["#ff5f57", "#febc2e", "#28c840"].map((dot) => (
                    <div
                        key={dot}
                        style={{
                            width: bar * 0.26,
                            height: bar * 0.26,
                            borderRadius: "50%",
                            backgroundColor: dot,
                        }}
                    />
                ))}
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        justifyContent: "center",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: bar * 0.15,
                            height: bar * 0.62,
                            padding: `0 ${bar * 0.5}px`,
                            borderRadius: bar,
                            backgroundColor: color.raised,
                            color: color.ink2,
                            fontFamily,
                            fontSize: bar * 0.32,
                            fontWeight: 500,
                        }}
                    >
                        <LockClosedIcon
                            style={{ width: bar * 0.28, color: color.muted }}
                        />
                        {url}
                    </div>
                </div>
                <div style={{ width: bar * 1.3 }} />
            </div>
            <div
                style={{
                    position: "relative",
                    width,
                    height: contentHeight,
                }}
            >
                <Screens layers={layers} />
            </div>
        </div>
    );
}
