import clsx from "clsx";
import { Input } from "@/shared/catalyst-ui-kit/input.tsx";
import { joinUnits, splitUnits } from "@/admin/components/ui/units.ts";

interface Props {
    /** Stored value, in decimal major units (e.g. 1.5 lb, 1.25 hr). */
    value: number;
    onChange: (value: number) => void;
    /** e.g. "lb" / "hr". */
    majorSuffix: string;
    /** e.g. "oz" / "min". */
    minorSuffix: string;
    /** Minor units per major unit: 16 for lb/oz, 60 for hr/min. */
    minorPerMajor: number;
    /** Step for the minor input, e.g. 0.25 oz or 5 min. */
    minorStep?: number;
    /** Base label; inputs are labeled "<base> <majorSuffix>" / "<base> <minorSuffix>". */
    "aria-label": string;
    className?: string;
}

/**
 * Two-part numeric input for values people think of in mixed units — pounds
 * and ounces, hours and minutes — stored as a single decimal in major units.
 * Display decomposes from `value` on every render; onChange fires only on
 * user edits (never on mount), so mounting one can't dirty the settings sync.
 * Empty inputs are treated as 0, matching NumberField.
 */
export default function DualUnitField({
    value,
    onChange,
    majorSuffix,
    minorSuffix,
    minorPerMajor,
    minorStep = 1,
    className,
    ...rest
}: Props) {
    const { major, minor } = splitUnits(value, minorPerMajor);
    const label = rest["aria-label"];

    const suffixClass = "shrink-0 text-sm text-zinc-500 dark:text-zinc-400";
    return (
        <div className={clsx("flex items-center gap-1.5", className)}>
            <Input
                className="min-w-14"
                type="number"
                inputMode="numeric"
                step={1}
                min={0}
                value={major}
                onChange={(event) => {
                    const raw = event.target.value;
                    onChange(
                        joinUnits(
                            raw === "" ? 0 : Number(raw),
                            minor,
                            minorPerMajor,
                        ),
                    );
                }}
                aria-label={`${label} ${majorSuffix}`}
            />
            <span className={suffixClass}>{majorSuffix}</span>
            <Input
                className="min-w-14"
                type="number"
                inputMode="decimal"
                step={minorStep}
                min={0}
                value={minor}
                onChange={(event) => {
                    const raw = event.target.value;
                    onChange(
                        joinUnits(
                            major,
                            raw === "" ? 0 : Number(raw),
                            minorPerMajor,
                        ),
                    );
                }}
                aria-label={`${label} ${minorSuffix}`}
            />
            <span className={suffixClass}>{minorSuffix}</span>
        </div>
    );
}
