import { useState, type FormEvent } from "react";
import { Field, Label } from "@/shared/catalyst-ui-kit/fieldset.tsx";
import { Input } from "@/shared/catalyst-ui-kit/input.tsx";
import { Textarea } from "@/shared/catalyst-ui-kit/textarea.tsx";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";

export default function ContactForm() {
    const [status, setStatus] = useState<{
        loading: boolean;
        success: boolean | null;
        message: string;
    }>({
        loading: false,
        success: null,
        message: "",
    });

    return (
        <div className="mx-auto max-w-xl p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-2xl font-semibold text-zinc-950 dark:text-white mb-6">
                Contact Us
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Anti-Spam Honeypot Input: Hidden from real users, filled out by bots */}
                <input
                    type="text"
                    name="botcheck"
                    className="hidden"
                    style={{ display: "none" }}
                    tabIndex={-1}
                    autoComplete="off"
                />

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
        setStatus({ loading: true, success: null, message: "" });

        const formData = new FormData(form);

        formData.append("access_key", "e07279ae-8bec-40b4-894b-19aa0add3f0e");

        const payload = Object.fromEntries(formData.entries());

        try {
            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setStatus({
                    loading: false,
                    success: true,
                    message: "Thank you! Your message has been sent.",
                });
                form.reset(); // Clear the form on success
            } else {
                setStatus({
                    loading: false,
                    success: false,
                    message:
                        result.message ||
                        "Something went wrong with the submission.",
                });
            }
        } catch (error) {
            console.error(error);
            setStatus({
                loading: false,
                success: false,
                message: "Failed to send message. Please try again later.",
            });
        }
    }
}
