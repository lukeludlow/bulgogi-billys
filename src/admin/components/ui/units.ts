// Mixed-unit arithmetic for DualUnitField — pounds/ounces, hours/minutes. Pure
// and DOM-free, so it is tested in the fast unit tier rather than in three real
// browsers alongside the component.

/**
 * Split a decimal major-unit value into whole major units plus minor units,
 * e.g. 0.25 lb → { major: 0, minor: 4 } with a ratio of 16 oz/lb. The minor
 * part is rounded to 2 decimals so clean fractions (0.15 lb → 2.4 oz) survive
 * the round-trip exactly.
 */
export function splitUnits(
    value: number,
    minorPerMajor: number,
): { major: number; minor: number } {
    if (!Number.isFinite(value) || value <= 0) return { major: 0, minor: 0 };
    // The epsilon keeps values like 2.9999999 (float noise for 3) from
    // flooring to 2 major + ~60 minor.
    const major = Math.floor(value + 1e-9);
    const minor = Math.round((value - major) * minorPerMajor * 100) / 100;
    // (value - major) can be a tiny negative, and Math.round(-ε) is -0.
    return { major, minor: minor === 0 ? 0 : minor };
}

/** Recompose a decimal major-unit value; minor ≥ ratio is fine (20 oz = 1.25 lb). */
export function joinUnits(
    major: number,
    minor: number,
    minorPerMajor: number,
): number {
    const safeMajor = Number.isFinite(major) ? major : 0;
    const safeMinor = Number.isFinite(minor) ? minor : 0;
    return safeMajor + safeMinor / minorPerMajor;
}
