import React, { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { AuthLayout } from "@/shared/catalyst-ui-kit/auth-layout.tsx";
import { Heading } from "@/shared/catalyst-ui-kit/heading.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import { Field, Label } from "@/shared/catalyst-ui-kit/fieldset.tsx";
import { Input } from "@/shared/catalyst-ui-kit/input.tsx";
import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import DarkModeToggle from "@/shared/dark-mode-toggle/DarkModeToggle.tsx";
import PageMeta from "@/shared/PageMeta.tsx";
import { supabase } from "@/admin/data/supabase.ts";

type State = "idle" | "sending" | "sent" | "error";

export default function AdminLogin() {
    const [email, setEmail] = useState<string>("");
    const [state, setState] = useState<State>("idle");
    const [signedIn, setSignedIn] = useState<boolean>(false);

    useEffect(() => {
        let cancelled = false;
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!cancelled && session) setSignedIn(true);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    if (signedIn) return <Navigate to="/admin" replace />;

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
            {state === "sent" ? (
                <div className="w-full max-w-sm space-y-6">
                    <Heading>Check your email</Heading>
                    <Text>
                        We sent a sign-in link to <strong>{email}</strong>. Open
                        it in this browser to finish signing in.
                    </Text>
                    <Button
                        outline
                        className="w-full"
                        onClick={() => setState("idle")}
                    >
                        Use a different email
                    </Button>
                </div>
            ) : (
                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-sm space-y-6"
                >
                    <Heading>Admin sign in</Heading>
                    <Text>
                        Enter your email and we&apos;ll send you a sign-in link.
                    </Text>
                    <Field>
                        <Label>Email</Label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(
                                e: React.ChangeEvent<HTMLInputElement>,
                            ) => {
                                setEmail(e.target.value);
                                if (state === "error") setState("idle");
                            }}
                            autoComplete="email"
                            autoFocus
                            required
                        />
                    </Field>
                    {state === "error" && (
                        <Text className="text-red-600 dark:text-red-500">
                            Couldn&apos;t send the link. Check the address or
                            try again in a minute.
                        </Text>
                    )}
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={state === "sending"}
                    >
                        {state === "sending" ? "Sending…" : "Send sign-in link"}
                    </Button>
                </form>
            )}
        </AuthLayout>
    );

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setState("sending");
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    // Admins are created by invitation only; unknown emails
                    // get an error instead of a new account.
                    shouldCreateUser: false,
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            setState(error ? "error" : "sent");
        } catch {
            setState("error");
        }
    }
}
