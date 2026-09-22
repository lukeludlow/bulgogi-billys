import { useState, type ChangeEvent } from "react";
import { CATERING_PRICING, clampGuests } from "@/site/catering/pricing.ts";

/**
 * Lets a guest-count input hold what the visitor is mid-typing ("1" on the way
 * to "120") without pricing it: valid counts commit as they're typed, and
 * anything else is clamped into bounds when the field loses focus.
 */
export function useGuestsDraft(
    guests: number,
    onCommit: (guests: number) => void,
) {
    const [draft, setDraft] = useState<string | null>(null);
    const { min, max } = CATERING_PRICING.guests;

    return {
        value: draft ?? String(guests),
        onChange(event: ChangeEvent<HTMLInputElement>) {
            const raw = event.target.value;
            setDraft(raw);
            const parsed = Number(raw);
            if (
                raw.trim() !== "" &&
                Number.isInteger(parsed) &&
                parsed >= min &&
                parsed <= max
            ) {
                onCommit(parsed);
            }
        },
        onBlur() {
            if (draft === null) return;
            onCommit(draft.trim() === "" ? guests : clampGuests(Number(draft)));
            setDraft(null);
        },
        /** Drops the draft, e.g. after a stepper button sets the count. */
        reset() {
            setDraft(null);
        },
    };
}
