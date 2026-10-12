import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
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
import { Text, TextLink } from "@/shared/catalyst-ui-kit/text.tsx";
import { Textarea } from "@/shared/catalyst-ui-kit/textarea.tsx";
import { phoneClickHandlers, trackSiteEvent } from "@/site/analytics.ts";
import { readAttribution } from "@/site/attribution.ts";
import { BUSINESS, PHONE_CALL_HREF } from "@/site/business.ts";
import {
    BUDGET_RANGES,
    buildInquiryPayload,
    EVENT_TYPES,
    HEARD_FROM,
    isSaturday,
    PREFERRED_CONTACT,
    readInquiryForm,
} from "@/site/catering/inquiry.ts";
import {
    CATERING_PRICING,
    describeEstimate,
    estimateCateringQuote,
    SERVICE_STYLE_IDS,
    type EstimateInput,
    type ServiceStyleId,
} from "@/site/catering/pricing.ts";
import HoneypotField from "@/site/forms/HoneypotField.tsx";
import { useFormSubmission } from "@/site/forms/useFormSubmission.ts";
import CateringSection from "@/site/pages/catering/CateringSection.tsx";
import { CARD_CLASS } from "@/site/pages/catering/cardStyles.ts";
import { useGuestsDraft } from "@/site/pages/catering/useGuestsDraft.ts";

interface Props {
    /** Shared with the estimator, so guests and style arrive prefilled. */
    estimateInput: EstimateInput;
    onEstimateInputChange: (next: EstimateInput) => void;
}

const { guests: GUEST_BOUNDS } = CATERING_PRICING;

function options(labels: Record<string, string>) {
    return Object.entries(labels).map(([value, label]) => (
        <option key={value} value={value}>
            {label}
        </option>
    ));
}

/**
 * The catering inquiry (§3.1 item 9): enough detail for Billy to quote
 * without a round of back-and-forth, plus the estimate the buyer already saw
 * and the campaign that brought them in.
 */
export default function CateringInquiryForm({
    estimateInput,
    onEstimateInputChange,
}: Props) {
    const { status, submit } = useFormSubmission();
    const [eventDate, setEventDate] = useState("");
    const guestsInput = useGuestsDraft(estimateInput.guests, (guests) =>
        onEstimateInputChange({ ...estimateInput, guests }),
    );
    const successCall = phoneClickHandlers("catering_success");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const fields = readInquiryForm(data);
        // The typed guest count wins over a draft the estimator hadn't priced.
        const input = {
            ...estimateInput,
            guests: fields.guests,
            style: fields.style,
        };
        onEstimateInputChange(input);

        const payload = {
            ...buildInquiryPayload(
                fields,
                describeEstimate(input, estimateCateringQuote(input)),
                readAttribution(),
            ),
            botcheck: String(data.get("botcheck") ?? ""),
        };
        const sent = await submit(payload, {
            successMessage: `Thanks — Billy will reply within 24 hours. Need it sooner? Call or text ${BUSINESS.phone.display}.`,
        });
        if (sent) {
            trackSiteEvent("catering_inquiry_submitted", {
                style: input.style,
                guests: input.guests,
            });
            form.reset();
            setEventDate("");
        }
    }

    return (
        <CateringSection
            id="inquiry"
            title="Get your exact quote"
            intro="Tell us about your event. Billy replies within 24 hours."
        >
            <form
                onSubmit={handleSubmit}
                className={clsx(CARD_CLASS, "flex flex-col gap-8 p-4 sm:p-6")}
            >
                <HoneypotField />

                <Fieldset>
                    <Legend>About you</Legend>
                    <div
                        data-slot="control"
                        className="grid gap-6 sm:grid-cols-2"
                    >
                        <Field>
                            <Label>Name</Label>
                            <Input name="name" required autoComplete="name" />
                        </Field>
                        <Field>
                            <Label>Company / organization</Label>
                            <Description>Optional</Description>
                            <Input name="company" autoComplete="organization" />
                        </Field>
                        <Field>
                            <Label>Phone</Label>
                            <Input
                                name="phone"
                                type="tel"
                                required
                                autoComplete="tel"
                            />
                        </Field>
                        <Field>
                            <Label>Email</Label>
                            <Input
                                name="email"
                                type="email"
                                required
                                autoComplete="email"
                            />
                        </Field>
                    </div>
                </Fieldset>

                <Fieldset>
                    <Legend>Best way to reach you</Legend>
                    <RadioGroup
                        name="preferredContact"
                        defaultValue="call"
                        className="flex flex-wrap gap-6 space-y-0!"
                    >
                        {Object.entries(PREFERRED_CONTACT).map(
                            ([value, label]) => (
                                <RadioField key={value}>
                                    <Radio value={value} color="orange" />
                                    <Label>{label}</Label>
                                </RadioField>
                            ),
                        )}
                    </RadioGroup>
                </Fieldset>

                <Fieldset>
                    <Legend>Your event</Legend>
                    <div
                        data-slot="control"
                        className="grid gap-6 sm:grid-cols-2"
                    >
                        <Field>
                            <Label>Event date</Label>
                            <Description>
                                Saturday mornings are unavailable.
                            </Description>
                            <Input
                                name="eventDate"
                                type="date"
                                required
                                value={eventDate}
                                onChange={(e) => setEventDate(e.target.value)}
                            />
                            {isSaturday(eventDate) && (
                                <Text
                                    role="status"
                                    className="mt-2 text-amber-700 dark:text-amber-400"
                                >
                                    Saturday mornings we're at the Grogan's Mill
                                    market. Afternoon and evening events may
                                    work — we'll confirm.
                                </Text>
                            )}
                        </Field>
                        <Field>
                            <Label>Start time</Label>
                            <Description>Optional</Description>
                            <Input name="startTime" type="time" />
                        </Field>
                        <Field>
                            <Label>Guests</Label>
                            <Input
                                name="guests"
                                type="number"
                                inputMode="numeric"
                                required
                                min={GUEST_BOUNDS.min}
                                max={GUEST_BOUNDS.max}
                                step={1}
                                value={guestsInput.value}
                                onChange={guestsInput.onChange}
                                onBlur={guestsInput.onBlur}
                            />
                        </Field>
                        <Field>
                            <Label>Service style</Label>
                            <Select
                                name="style"
                                value={estimateInput.style}
                                onChange={(e) =>
                                    onEstimateInputChange({
                                        ...estimateInput,
                                        style: e.target.value as ServiceStyleId,
                                    })
                                }
                            >
                                {SERVICE_STYLE_IDS.map((id) => (
                                    <option key={id} value={id}>
                                        {CATERING_PRICING.styles[id].name}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field>
                            <Label>Event location / ZIP</Label>
                            <Input
                                name="location"
                                required
                                autoComplete="postal-code"
                            />
                        </Field>
                        <Field>
                            <Label>Event type</Label>
                            <Select name="eventType" required defaultValue="">
                                <option value="" disabled>
                                    Choose one
                                </option>
                                {options(EVENT_TYPES)}
                            </Select>
                        </Field>
                        <Field>
                            <Label>Budget</Label>
                            <Select name="budget" defaultValue="unsure">
                                {options(BUDGET_RANGES)}
                            </Select>
                        </Field>
                        <Field>
                            <Label>How did you hear about us?</Label>
                            <Select name="heardFrom" defaultValue="">
                                <option value="">Choose one</option>
                                {options(HEARD_FROM)}
                            </Select>
                        </Field>
                    </div>
                </Fieldset>

                <Fieldset>
                    <Legend>Food needs</Legend>
                    <div data-slot="control" className="flex flex-col gap-6">
                        <Field>
                            <Label>Dietary needs</Label>
                            <Input
                                name="dietaryNeeds"
                                placeholder="Allergies, gluten, …"
                            />
                        </Field>
                        <Field>
                            <Label>Anything else?</Label>
                            <Textarea name="notes" rows={3} />
                        </Field>
                    </div>
                </Fieldset>

                <div className="flex flex-col gap-4">
                    <Button
                        type="submit"
                        color="orange"
                        disabled={status.loading}
                        className="w-full sm:w-auto sm:self-start"
                    >
                        {status.loading ? "Sending..." : "Request my quote"}
                    </Button>
                    {status.success === true && (
                        <div
                            role="status"
                            className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/30"
                        >
                            <Text className="font-medium text-emerald-800 dark:text-emerald-300">
                                Thanks — Billy will reply within 24 hours. Need
                                it sooner? Call or text{" "}
                                <TextLink
                                    href={PHONE_CALL_HREF}
                                    onClick={successCall.onCall}
                                >
                                    {BUSINESS.phone.display}
                                </TextLink>
                                .
                            </Text>
                        </div>
                    )}
                    {status.success === false && (
                        <Text
                            role="alert"
                            className="font-medium text-rose-600 dark:text-rose-400"
                        >
                            {status.message}
                        </Text>
                    )}
                </div>
            </form>
        </CateringSection>
    );
}
