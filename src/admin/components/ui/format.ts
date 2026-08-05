// Display formatters. These live in the UI layer rather than in
// domain/calculations.ts so the math engine stays free of presentation
// concerns — the same reason MARKET_LABELS moved out of eventAnalytics.ts.

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(value);
}

export function formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
}
