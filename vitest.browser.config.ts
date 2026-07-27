import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
        },
    },
    // Dummy Supabase config so modules that create the client at import time
    // (src/lib/supabase.ts) load in tests without a real project. Tests that
    // exercise auth behavior mock @/lib/supabase.ts instead.
    define: {
        "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
            "https://test-project.supabase.co",
        ),
        "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY":
            JSON.stringify("test-publishable-key"),
    },
    test: {
        setupFiles: ["./src/test/setup.ts"],
        browser: {
            enabled: true,
            provider: playwright(),
            // https://vitest.dev/config/browser/playwright
            instances: [
                { browser: "chromium" },
                { browser: "firefox" },
                { browser: "webkit" },
            ],
        },
    },
});
