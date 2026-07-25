import { Badge } from "@/components/catalyst-ui-kit/badge.tsx";
import type { ProfitBasis } from "./salesAnalytics.ts";

const BASIS_BADGE: Record<
    ProfitBasis | "mixed",
    { color: "green" | "blue" | "zinc" | "amber"; label: string }
> = {
    itemized: { color: "green", label: "Itemized" },
    matched: { color: "blue", label: "Price match" },
    blended: { color: "zinc", label: "Blended %" },
    mixed: { color: "amber", label: "Mixed" },
};

/** How a sale's (or price point's) profit was derived. */
export default function BasisBadge({ basis }: { basis: ProfitBasis | "mixed" }) {
    const badge = BASIS_BADGE[basis];
    return <Badge color={badge.color}>{badge.label}</Badge>;
}
