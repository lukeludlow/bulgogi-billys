import clsx from "clsx";
import { MinusIcon, PlusIcon } from "@heroicons/react/16/solid";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import {
    Checkbox,
    CheckboxField,
    CheckboxGroup,
} from "@/shared/catalyst-ui-kit/checkbox.tsx";
import {
    Description,
    Field,
    Fieldset,
    Label,
    Legend,
} from "@/shared/catalyst-ui-kit/fieldset.tsx";
import { Input } from "@/shared/catalyst-ui-kit/input.tsx";
import {
    Radio,
    RadioField,
    RadioGroup,
} from "@/shared/catalyst-ui-kit/radio.tsx";
import { Select } from "@/shared/catalyst-ui-kit/select.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import {
    ADD_ON_IDS,
    CATERING_PRICING,
    clampGuests,
    DAY_TYPES,
    DISTANCE_BAND_IDS,
    estimateCateringQuote,
    formatEstimate,
    formatPrice,
    minimumNote,
    SERVICE_STYLE_IDS,
    stylePriceLine,
    type AddOnId,
    type DayType,
    type DistanceBandId,
    type EstimateInput,
    type ServiceStyleId,
} from "@/site/catering/pricing.ts";
import CateringSection from "@/site/pages/catering/CateringSection.tsx";
import { CARD_CLASS } from "@/site/pages/catering/cardStyles.ts";
import { useGuestsDraft } from "@/site/pages/catering/useGuestsDraft.ts";

interface Props {
    value: EstimateInput;
    onChange: (next: EstimateInput) => void;
    /** "Get my exact quote": hand off to the inquiry form. */
    onRequestQuote: () => void;
}

const { guests: GUEST_BOUNDS } = CATERING_PRICING;
const DEPOSIT_PERCENT = Math.round(CATERING_PRICING.depositShare * 100);

/**
 * The instant estimator (§3.1 item 4): a price *range*, not a quote. It's
 * controlled by the catering page, which shares the same input with the
 * inquiry form — so the form arrives prefilled.
 */
export default function Estimator({ value, onChange, onRequestQuote }: Props) {
    const estimate = estimateCateringQuote(value);
    const note = minimumNote(value, estimate);
    const update = (patch: Partial<EstimateInput>) =>
        onChange({ ...value, ...patch });
    const guestsInput = useGuestsDraft(value.guests, (guests) =>
        update({ guests }),
    );

    function step(direction: 1 | -1) {
        guestsInput.reset();
        update({
            guests: clampGuests(value.guests + direction * GUEST_BOUNDS.step),
        });
    }

    function toggleAddOn(id: AddOnId, checked: boolean) {
        update({
            addOns: checked
                ? ADD_ON_IDS.filter((a) => a === id || value.addOns.includes(a))
                : value.addOns.filter((a) => a !== id),
        });
    }

    return (
        <CateringSection
            id="estimate"
            title="Instant estimate"
            intro="A price range in a few quick answers. Billy confirms your exact price."
        >
            <div
                className={clsx(
                    CARD_CLASS,
                    "grid gap-8 p-4 sm:p-6 lg:grid-cols-[3fr_2fr]",
                )}
            >
                <div className="flex flex-col gap-8">
                    <Field>
                        <Label>Guests</Label>
                        <Description>
                            {GUEST_BOUNDS.min}–{GUEST_BOUNDS.max}. Planning
                            something bigger? Call or text us.
                        </Description>
                        <div
                            data-slot="control"
                            className="flex max-w-60 gap-2"
                        >
                            <Button
                                outline
                                aria-label="Fewer guests"
                                disabled={value.guests <= GUEST_BOUNDS.min}
                                onClick={() => step(-1)}
                            >
                                <MinusIcon data-slot="icon" />
                            </Button>
                            <Input
                                type="number"
                                inputMode="numeric"
                                min={GUEST_BOUNDS.min}
                                max={GUEST_BOUNDS.max}
                                step={1}
                                className="text-center"
                                value={guestsInput.value}
                                onChange={guestsInput.onChange}
                                onBlur={guestsInput.onBlur}
                            />
                            <Button
                                outline
                                aria-label="More guests"
                                disabled={value.guests >= GUEST_BOUNDS.max}
                                onClick={() => step(1)}
                            >
                                <PlusIcon data-slot="icon" />
                            </Button>
                        </div>
                    </Field>

                    <Fieldset>
                        <Legend>Service style</Legend>
                        <RadioGroup
                            value={value.style}
                            onChange={(style) =>
                                update({ style: style as ServiceStyleId })
                            }
                        >
                            {SERVICE_STYLE_IDS.map((id) => (
                                <RadioField key={id}>
                                    <Radio value={id} color="orange" />
                                    <Label>
                                        {CATERING_PRICING.styles[id].name}
                                    </Label>
                                    <Description>
                                        {stylePriceLine(id)}
                                    </Description>
                                </RadioField>
                            ))}
                        </RadioGroup>
                    </Fieldset>

                    <Fieldset>
                        <Legend>Day of the week</Legend>
                        <RadioGroup
                            value={value.day}
                            onChange={(day) => update({ day: day as DayType })}
                            className="flex gap-6 space-y-0!"
                        >
                            {DAY_TYPES.map((day) => (
                                <RadioField key={day}>
                                    <Radio value={day} color="orange" />
                                    <Label>{CATERING_PRICING.days[day]}</Label>
                                </RadioField>
                            ))}
                        </RadioGroup>
                    </Fieldset>

                    <Field>
                        <Label>Distance</Label>
                        <Select
                            value={value.distance}
                            onChange={(event) =>
                                update({
                                    distance: event.target
                                        .value as DistanceBandId,
                                })
                            }
                        >
                            {DISTANCE_BAND_IDS.map((id) => (
                                <option key={id} value={id}>
                                    {CATERING_PRICING.distanceBands[id].label}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <Fieldset>
                        <Legend>Add-ons</Legend>
                        <Text>Billy prices these in your quote.</Text>
                        <CheckboxGroup>
                            {ADD_ON_IDS.map((id) => (
                                <CheckboxField key={id}>
                                    <Checkbox
                                        color="orange"
                                        checked={value.addOns.includes(id)}
                                        onChange={(checked) =>
                                            toggleAddOn(id, checked)
                                        }
                                    />
                                    <Label>{CATERING_PRICING.addOns[id]}</Label>
                                </CheckboxField>
                            ))}
                        </CheckboxGroup>
                    </Fieldset>
                </div>

                <div className="flex flex-col gap-4 self-start rounded-lg bg-orange-50 p-4 lg:sticky lg:top-4 dark:bg-orange-950/20">
                    <div
                        role="status"
                        aria-atomic="true"
                        className="flex flex-col gap-2"
                    >
                        <Text className="font-medium">
                            {estimate.kind === "popup"
                                ? "Cost to host"
                                : "Estimated total"}
                        </Text>
                        <p
                            data-testid="estimate-range"
                            className="text-3xl/9 font-semibold text-zinc-950 dark:text-white"
                        >
                            {formatEstimate(estimate)}
                        </p>
                        {note && <Text>{note}</Text>}
                        {estimate.kind === "range" && (
                            <Text>
                                A {DEPOSIT_PERCENT}% deposit (
                                {formatPrice(estimate.deposit)}) holds your
                                date.
                            </Text>
                        )}
                        {estimate.kind === "range" && estimate.quotedExtras && (
                            <Text>
                                + add-ons &amp; travel quoted separately
                            </Text>
                        )}
                    </div>
                    <Button color="orange" onClick={onRequestQuote}>
                        Get my exact quote
                    </Button>
                    <Text className="text-sm">
                        An estimate, not a quote — menu, travel and service
                        hours can move it.
                    </Text>
                </div>
            </div>
        </CateringSection>
    );
}
