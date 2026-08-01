import { Select } from "@/shared/catalyst-ui-kit/select.tsx";
import type {
    Granularity,
    RangeWindow,
    TimeRange,
} from "@/admin/domain/salesAnalytics.ts";

interface Props {
    value: TimeRange;
    onChange: (range: TimeRange) => void;
}

const WINDOW_LABELS: Record<RangeWindow, string> = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    all: "All time",
};

const GRANULARITY_LABELS: Record<Granularity, string> = {
    day: "By day",
    week: "By week",
    month: "By month",
};

/** Shared window + granularity control for the sales views. */
export default function TimeRangeSelector({ value, onChange }: Props) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
                <label
                    htmlFor="range-window"
                    className="text-sm text-zinc-500 dark:text-zinc-400"
                >
                    Range
                </label>
                <Select
                    id="range-window"
                    aria-label="Time range"
                    className="w-40"
                    value={value.window}
                    onChange={(event) =>
                        onChange({
                            ...value,
                            window: event.target.value as RangeWindow,
                        })
                    }
                >
                    {Object.entries(WINDOW_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </Select>
            </div>

            <div className="flex items-center gap-2">
                <label
                    htmlFor="range-granularity"
                    className="text-sm text-zinc-500 dark:text-zinc-400"
                >
                    Group
                </label>
                <Select
                    id="range-granularity"
                    aria-label="Group by"
                    className="w-36"
                    value={value.granularity}
                    onChange={(event) =>
                        onChange({
                            ...value,
                            granularity: event.target.value as Granularity,
                        })
                    }
                >
                    {Object.entries(GRANULARITY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </Select>
            </div>
        </div>
    );
}
