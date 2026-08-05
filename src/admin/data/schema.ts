// Helpers shared by the modules that map generated schema rows to and from
// the app's domain objects.

import type { Database } from "./database.types.ts";

/**
 * A table's row shape straight from the generated schema types (`npm run
 * db:types`), so a migration that drifts from what the app expects fails
 * `tsc` instead of surfacing at runtime.
 */
export type Row<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Row"];

/**
 * Check-constrained columns generate as plain `string`; narrow them at the
 * boundary so schema/data drift fails loudly instead of leaking invalid
 * values into the app.
 */
export function oneOf<T extends string>(
    value: string,
    allowed: readonly T[],
    label: string,
): T {
    if (!(allowed as readonly string[]).includes(value)) {
        throw new Error(`Unexpected ${label}: ${value}`);
    }
    return value as T;
}
