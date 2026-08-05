import { expect, test } from "vitest";
import { formatCurrency, formatPercent } from "@/admin/components/ui/format.ts";

test("formatCurrency renders US dollars with two decimals", () => {
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(7)).toBe("$7.00");
    expect(formatCurrency(12.5)).toBe("$12.50");
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
});

test("formatCurrency rounds to the cent", () => {
    expect(formatCurrency(1.005)).toBe("$1.01");
    expect(formatCurrency(0.004)).toBe("$0.00");
});

test("formatCurrency marks negatives, which margins can be", () => {
    expect(formatCurrency(-3.2)).toBe("-$3.20");
});

test("formatPercent renders one decimal and the sign", () => {
    expect(formatPercent(0)).toBe("0.0%");
    expect(formatPercent(66.666)).toBe("66.7%");
    expect(formatPercent(-12.34)).toBe("-12.3%");
});
