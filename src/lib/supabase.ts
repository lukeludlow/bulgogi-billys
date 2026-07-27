import { createClient } from "@supabase/supabase-js";

// Single shared client for admin auth. PKCE flow: the magic link redirects to
// /auth/callback with a ?code= that supabase-js exchanges automatically on
// init (detectSessionInUrl), persisting the session to localStorage.
export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            flowType: "pkce",
            detectSessionInUrl: true,
            persistSession: true,
        },
    },
);
