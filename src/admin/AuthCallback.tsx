import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { AuthLayout } from "@/shared/catalyst-ui-kit/auth-layout.tsx";
import { Heading } from "@/shared/catalyst-ui-kit/heading.tsx";
import { Text } from "@/shared/catalyst-ui-kit/text.tsx";
import PageMeta from "@/shared/PageMeta.tsx";
import { supabase } from "@/admin/data/supabase.ts";

/**
 * Landing page for the magic-link redirect. supabase-js exchanges the ?code=
 * from the URL itself on init (detectSessionInUrl); this component just waits
 * for the session to appear and then enters the dashboard. Supabase reports
 * failures (expired/used links) via error params in the query or hash.
 */
export default function AuthCallback() {
    const navigate = useNavigate();
    const location = useLocation();
    const search = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
    const failed = Boolean(
        search.get("error_description") || hash.get("error_description"),
    );

    useEffect(() => {
        if (failed) return;

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) navigate("/admin", { replace: true });
        });
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) navigate("/admin", { replace: true });
        });
        return () => subscription.unsubscribe();
    }, [failed, navigate]);

    return (
        <AuthLayout>
            <PageMeta
                title="Signing In | Bulgogi Billy's"
                description="Bulgogi Billy's internal admin sign in."
                noindex
            />
            <div className="w-full max-w-sm space-y-6">
                {failed ? (
                    <>
                        <Heading>Sign-in link expired</Heading>
                        <Text>
                            This sign-in link is invalid or has already been
                            used. Request a new one from the{" "}
                            <Link
                                to="/admin-login"
                                className="underline decoration-zinc-950/50 data-hover:decoration-zinc-950 dark:decoration-white/50 dark:data-hover:decoration-white"
                            >
                                sign-in page
                            </Link>
                            .
                        </Text>
                    </>
                ) : (
                    <>
                        <Heading>Signing you in…</Heading>
                        <Text>One moment while we finish signing you in.</Text>
                    </>
                )}
            </div>
        </AuthLayout>
    );
}
