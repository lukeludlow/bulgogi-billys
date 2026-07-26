import React, { useState } from "react";
import { AuthLayout } from "@/components/catalyst-ui-kit/auth-layout.tsx";
import { Heading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Text } from "@/components/catalyst-ui-kit/text.tsx";
import { Field, Label } from "@/components/catalyst-ui-kit/fieldset.tsx";
import { Input } from "@/components/catalyst-ui-kit/input.tsx";
import { Button } from "@/components/catalyst-ui-kit/button.tsx";
import DarkModeToggle from "@/components/dark-mode-toggle/DarkModeToggle.tsx";
import PageMeta from "@/components/PageMeta.tsx";

export default function AdminLogin() {
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<boolean>(false);

    return (
        <AuthLayout>
            <PageMeta
                title="Admin Sign In | Bulgogi Billy's"
                description="Bulgogi Billy's internal admin sign in."
                noindex
            />
            <div className="fixed top-4 right-4">
                <DarkModeToggle />
            </div>
            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
                <Heading>Admin sign in</Heading>
                <Text>Enter the admin password to continue.</Text>
                <Field>
                    <Label>Password</Label>
                    <Input
                        type="password"
                        value={password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setPassword(e.target.value);
                            if (error) setError(false);
                        }}
                        autoFocus
                        required
                    />
                </Field>
                {error && (
                    <Text className="text-red-600 dark:text-red-500">
                        Incorrect password. Try again.
                    </Text>
                )}
                <Button type="submit" className="w-full">
                    Sign in
                </Button>
            </form>
        </AuthLayout>
    );

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        try {
            const response = await fetch("/api/admin-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });

            if (response.ok) {
                // Force a real navigation so edge middleware sees the
                // freshly-issued session cookie on the next request.
                window.location.href = "/admin";
            } else {
                setError(true);
            }
        } catch {
            setError(true);
        }
    }
}
