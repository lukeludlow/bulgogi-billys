import type { FormEvent } from "react";
import { Field, Label } from "@/shared/catalyst-ui-kit/fieldset.tsx";
import { Input } from "@/shared/catalyst-ui-kit/input.tsx";
import { Textarea } from "@/shared/catalyst-ui-kit/textarea.tsx";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import HoneypotField from "@/site/forms/HoneypotField.tsx";
import { useFormSubmission } from "@/site/forms/useFormSubmission.ts";

export default function ContactForm() {
    const { status, submit } = useFormSubmission();

    return (
        <div className="mx-auto max-w-xl p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-2xl font-semibold text-zinc-950 dark:text-white mb-6">
                Contact Us
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                <HoneypotField />

                <Field>
                    <Label>Name</Label>
                    <Input
                        name="name"
                        type="text"
                        required
                        placeholder="Jane Doe"
                    />
                </Field>

                <Field>
                    <Label>Email address</Label>
                    <Input
                        name="email"
                        type="email"
                        required
                        placeholder="jane@example.com"
                    />
                </Field>

                <Field>
                    <Label>Message</Label>
                    <Textarea
                        name="message"
                        required
                        rows={4}
                        placeholder="How can we help you?"
                    />
                </Field>

                <div className="pt-2">
                    <Button
                        type="submit"
                        disabled={status.loading}
                        className="w-full justify-center"
                        color={"orange"}
                    >
                        {status.loading ? "Sending..." : "Send Message"}
                    </Button>
                </div>

                {status.message && (
                    <p
                        className={`text-sm font-medium mt-4 ${status.success ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                    >
                        {status.message}
                    </p>
                )}
            </form>
        </div>
    );

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        // currentTarget is only set during dispatch — grab the form now, it's
        // still needed for the reset after the fetch.
        const form = e.currentTarget;
        const payload = Object.fromEntries(
            new FormData(form).entries(),
        ) as Record<string, string>;

        const sent = await submit(payload, {
            successMessage: "Thank you! Your message has been sent.",
        });
        if (sent) form.reset();
    }
}
