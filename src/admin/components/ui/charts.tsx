import type { ReactNode } from "react";
import { Subheading } from "@/shared/catalyst-ui-kit/heading.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import Card from "@/admin/components/ui/Card.tsx";
import { formatCurrency, formatPercent } from "@/admin/components/ui/format.ts";

// Shared recharts chrome for every chart on the dashboard. Previously exported
// from MarginCharts.tsx, which three sibling components had to import from even
// though they render unrelated charts.

// Chart chrome + series colors from the validated dataviz palette. The two-hue
// pair (blue revenue / orange cost) passes CVD in both modes with a legend and
// direct labels as secondary encoding; single-series charts use brand orange.
export function chartTheme(isDark: boolean) {
    return isDark
        ? {
              primary: "#ffffff",
              secondary: "#c3c2b7",
              muted: "#898781",
              grid: "#2c2c2a",
              baseline: "#383835",
              surface: "#1a1a19",
              orange: "#d95926",
              blue: "#3987e5",
          }
        : {
              primary: "#0b0b0b",
              secondary: "#52514e",
              muted: "#898781",
              grid: "#e1e0d9",
              baseline: "#c3c2b7",
              surface: "#fcfcfb",
              orange: "#eb6834",
              blue: "#2a78d6",
          };
}

export type Theme = ReturnType<typeof chartTheme>;

interface TooltipProps {
    active?: boolean;
    label?: string;
    payload?: Array<{
        name: string;
        value: number;
        color: string;
        dataKey: string;
    }>;
    theme: Theme;
    kind: "percent" | "currency" | "count";
}

export function ChartTooltip({
    active,
    label,
    payload,
    theme,
    kind,
}: TooltipProps) {
    if (!active || !payload || payload.length === 0) return null;
    const format = (value: number) =>
        kind === "percent"
            ? formatPercent(value)
            : kind === "count"
              ? value.toLocaleString()
              : formatCurrency(value);
    return (
        <div
            style={{
                background: theme.surface,
                border: `1px solid ${theme.baseline}`,
                borderRadius: 8,
                padding: "8px 10px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.14)",
            }}
        >
            <div
                style={{
                    color: theme.primary,
                    fontWeight: 600,
                    fontSize: 12,
                    marginBottom: 4,
                }}
            >
                {label}
            </div>
            {payload.map((entry) => (
                <div
                    key={entry.dataKey}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: theme.secondary,
                        fontSize: 12,
                    }}
                >
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: entry.color,
                            display: "inline-block",
                        }}
                    />
                    <span>{entry.name}</span>
                    <span
                        style={{
                            marginLeft: "auto",
                            paddingLeft: 12,
                            color: theme.primary,
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {format(entry.value)}
                    </span>
                </div>
            ))}
        </div>
    );
}

/**
 * A titled chart panel that fills the row width. The plot area keeps a minimum
 * width (derived from the number of bars) so it uses the full width on a laptop
 * but scrolls horizontally when the screen is too narrow to fit every bar. A
 * right-edge fade and a small hint make that scroll obvious.
 */
export function ChartCard({
    title,
    description,
    minWidth,
    children,
}: {
    title: string;
    description: string;
    minWidth: number;
    children: ReactNode;
}) {
    return (
        <Card>
            <div className="flex items-baseline justify-between gap-3">
                <div>
                    <Subheading>{title}</Subheading>
                    <Text className="mt-1 text-sm">{description}</Text>
                </div>
                <span className="shrink-0 text-xs text-zinc-400 sm:hidden dark:text-zinc-500">
                    Scroll to see all →
                </span>
            </div>
            <div className="relative mt-4">
                <div className="overflow-x-auto pb-1">
                    <div style={{ minWidth, height: 340 }}>{children}</div>
                </div>
                {/* Fade the right edge to signal more content off-screen. */}
                <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent sm:hidden dark:from-zinc-800/50" />
            </div>
        </Card>
    );
}

export const AXIS_TICK_STYLE = (theme: Theme) => ({
    fill: theme.muted,
    fontSize: 11,
    fontVariantNumeric: "tabular-nums" as const,
});
