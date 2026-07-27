import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router";
import { supabase } from "@/lib/supabase.ts";
import type { Session } from "@supabase/supabase-js";

/**
 * Client-side guard for the /admin routes: waits for the Supabase session to
 * load, bounces anonymous visitors to the login page, and reacts to sign-out
 * from anywhere via onAuthStateChange. The settings API independently
 * verifies the access token server-side, so this guard is purely navigation.
 */
export default function RequireAdmin({ children }: { children: ReactNode }) {
    // undefined = still loading, null = signed out
    const [session, setSession] = useState<Session | null | undefined>(
        undefined,
    );

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, next) => {
            setSession(next);
        });
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
        });
        return () => subscription.unsubscribe();
    }, []);

    if (session === undefined) return null;
    if (session === null) return <Navigate to="/admin-login" replace />;
    return children;
}
