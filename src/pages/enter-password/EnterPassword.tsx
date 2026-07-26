import React, { useState } from "react";
import PageMeta from "@/components/PageMeta.tsx";

export default function EnterPassword() {
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<boolean>(false);

    return (
        <main className="grid min-h-0 h-full flex-1 place-items-center bg-zinc-100 px-6 py-24 sm:py-32 lg:px-8 dark:bg-zinc-900 transition-colors duration-200">
            <PageMeta
                title="Enter Password | Bulgogi Billy's"
                description="Password-protected preview of Bulgogi Billy's."
                noindex
            />
            <div className="w-full max-w-md text-center">
                {/* Icon / Top Badge */}
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950/50">
                    <svg
                        className="h-6 w-6 text-orange-600 dark:text-orange-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                        />
                    </svg>
                </div>

                {/* Typography Header */}
                <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance text-zinc-900 sm:text-5xl dark:text-white">
                    Pull up a chair!
                </h1>
                <p className="mt-3 text-base font-medium text-pretty text-zinc-500 dark:text-zinc-400">
                    We're just putting the finishing touches on our new online
                    home. Enter the secret passcode below to head on in.
                </p>

                {/* Form Container mimicking Catalyst UI input structures */}
                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                    <div className="relative">
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(
                                e: React.ChangeEvent<HTMLInputElement>,
                            ) => {
                                setPassword(e.target.value);
                                if (error) setError(false);
                            }}
                            required
                            className={`block w-full rounded-lg border bg-white px-4 py-3 text-zinc-900 shadow-xs transition-colors placeholder:text-zinc-400 focus:outline-hidden sm:text-sm dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500 ${
                                error
                                    ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                    : "border-zinc-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700 dark:focus:border-orange-400 dark:focus:ring-orange-400/20"
                            }`}
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <p className="text-left text-sm font-medium text-red-600 dark:text-red-400 transition-all">
                            ⚠️ Incorrect password. Try again.
                        </p>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full rounded-lg bg-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-xs hover:bg-orange-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 dark:bg-orange-500 dark:hover:bg-orange-400 dark:focus-visible:outline-orange-500 cursor-pointer transition-colors duration-150"
                    >
                        Head Inside
                    </button>
                </form>
            </div>
        </main>
    );

    function handleSubmit(e) {
        e.preventDefault();

        const sitePassword = (import.meta.env.VITE_SITE_PASSWORD ||
            import.meta.env.SITE_PASSWORD) as string;

        if (password === sitePassword) {
            // Save the token cookie valid for 30 days
            const maxAge = 60 * 60 * 24 * 30;
            document.cookie = `site_auth_token=${password}; path=/; max-age=${maxAge}; SameSite=Strict; Secure`;

            // Reload the page. The middleware will now see the cookie and let the user through!
            window.location.href = "/";
        } else {
            setError(true);
        }
    }
}
