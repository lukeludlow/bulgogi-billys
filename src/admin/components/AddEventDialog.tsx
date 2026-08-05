import { useState } from "react";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import {
    Dialog,
    DialogActions,
    DialogBody,
    DialogTitle,
} from "@/shared/catalyst-ui-kit/dialog.tsx";
import {
    Field,
    FieldGroup,
    Label,
} from "@/shared/catalyst-ui-kit/fieldset.tsx";
import { Input } from "@/shared/catalyst-ui-kit/input.tsx";
import { Select } from "@/shared/catalyst-ui-kit/select.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import {
    MARKET_LABELS,
    localDateKey,
    marketForDate,
} from "@/admin/domain/eventAnalytics.ts";
import {
    MARKETS,
    type Market,
    type MarketEvent,
} from "@/admin/domain/types.ts";

interface Props {
    /** Existing expense rows, so the same day+market can't be added twice. */
    events: MarketEvent[];
    onAdd: (date: string, market: Market) => void;
}

/**
 * Records expenses for a day the sales data doesn't already cover — a market
 * where nothing sold, or one whose sales haven't been imported yet.
 */
export default function AddEventDialog({ events, onAdd }: Props) {
    const [open, setOpen] = useState(false);
    const [date, setDate] = useState("");
    const [market, setMarket] = useState<Market>("other");

    const duplicate = events.some(
        (event) => event.date === date && event.market === market,
    );

    function submit() {
        if (!date || duplicate) return;
        onAdd(date, market);
        setOpen(false);
        setDate("");
    }

    return (
        <>
            <Button
                outline
                onClick={() => {
                    // Suggest today's market as a starting point.
                    const today = new Date();
                    setDate(localDateKey(today.toISOString()));
                    setMarket(marketForDate(today));
                    setOpen(true);
                }}
            >
                Add event
            </Button>

            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>Add event</DialogTitle>
                <DialogBody>
                    <FieldGroup>
                        <Field>
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(event) =>
                                    setDate(event.target.value)
                                }
                            />
                        </Field>
                        <Field>
                            <Label>Market</Label>
                            <Select
                                value={market}
                                onChange={(event) =>
                                    setMarket(event.target.value as Market)
                                }
                            >
                                {MARKETS.map((option) => (
                                    <option key={option} value={option}>
                                        {MARKET_LABELS[option]}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        {duplicate && (
                            <Text className="text-sm text-red-600 dark:text-red-400">
                                That event already has an expense record.
                            </Text>
                        )}
                    </FieldGroup>
                </DialogBody>
                <DialogActions>
                    <Button plain onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={!date || duplicate}>
                        Add event
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
