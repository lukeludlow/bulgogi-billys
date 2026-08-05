import { Button } from "@/shared/catalyst-ui-kit/button.tsx";
import { supabase } from "@/admin/data/supabase.ts";

export default function LogoutButton() {
    async function handleLogout() {
        await supabase.auth.signOut();
        // Hard navigation also clears in-memory dashboard state.
        window.location.href = "/admin-login";
    }

    return (
        <Button plain onClick={handleLogout}>
            Log out
        </Button>
    );
}
