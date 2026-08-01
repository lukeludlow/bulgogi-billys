import { Badge } from "@/shared/catalyst-ui-kit/badge.tsx";
import type { ProfitBasis } from "@/admin/domain/salesAnalytics.ts";

const BASIS_BADGE: Record<
    ProfitBasis,
    { color: "blue" | "zinc"; label: string }
> = {
    matched: { color: "blue", label: "Price match" },
    blended: { color: "zinc", label: "Blended %" },
};

/** How a sale's (or price point's) profit was derived. */
export default function BasisBadge({ basis }: { basis: ProfitBasis }) {
    const badge = BASIS_BADGE[basis];
    return <Badge color={badge.color}>{badge.label}</Badge>;
}
