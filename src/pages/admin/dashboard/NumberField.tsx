import clsx from "clsx";
import { Input } from "@/components/catalyst-ui-kit/input.tsx";

interface Props {
    value: number;
    onChange: (value: number) => void;
    /** Prefix shown inside the control, e.g. "$". */
    prefix?: string;
    /** Suffix shown after the control, e.g. "lb", "oz", "%". */
    suffix?: string;
    step?: number;
    min?: number;
    "aria-label": string;
    className?: string;
}

/**
 * A compact numeric input used throughout the calculator. Empty input is
 * treated as 0 so a field is never left in an unparseable state.
 */
export default function NumberField({
    value,
    onChange,
    prefix,
    suffix,
    step = 0.01,
    min = 0,
    className,
    ...rest
}: Props) {
    return (
        <div className={clsx("flex items-center gap-1.5", className)}>
            {prefix && (
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    {prefix}
                </span>
            )}
            <Input
                // Keep a usable minimum so the value + spinner aren't clipped
                // inside narrow table cells.
                className="min-w-18"
                type="number"
                inputMode="decimal"
                step={step}
                min={min}
                value={Number.isFinite(value) ? value : 0}
                onChange={(event) => {
                    const raw = event.target.value;
                    onChange(raw === "" ? 0 : Number(raw));
                }}
                aria-label={rest["aria-label"]}
            />
            {suffix && (
                <span className="w-8 shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                    {suffix}
                </span>
            )}
        </div>
    );
}
