import { Heading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Text } from "@/components/catalyst-ui-kit/text.tsx";
import { Button } from "@/components/catalyst-ui-kit/button.tsx";
import DarkModeToggle from "@/components/dark-mode-toggle/DarkModeToggle.tsx";

export default function AdminDashboard() {
    return (
        <main className="grid min-h-dvh place-items-center bg-zinc-100 px-6 py-24 sm:py-32 lg:px-8 dark:bg-zinc-900">
            <div className="fixed top-4 right-4">
                <DarkModeToggle />
            </div>
            <div className="text-center">
                <Heading level={1} className="text-4xl sm:text-5xl">
                    Admin Dashboard
                </Heading>
                <Text className="mt-4">Coming soon.</Text>
                <Button className="mt-8" onClick={handleLogout}>
                    Log out
                </Button>
            </div>
        </main>
    );

    async function handleLogout() {
        await fetch("/api/admin-logout", { method: "POST" });
        window.location.href = "/admin-login";
    }
}
