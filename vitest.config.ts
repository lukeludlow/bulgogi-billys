import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import react from "@vitejs/plugin-react";
import path from "path";

// Two tiers, split by file extension: pure-logic tests are .test.ts and run
// in the fast `unit` project; component tests are .test.tsx and run in the
// `browser` project against real browsers. A `db` project against the local
// Supabase stack arrives with the apply_config work (REFACTOR_PLAN §5.1).
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
        "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
            "test-publishable-key",
        ),
    },
    test: {
        projects: [
            {
                extends: true,
                test: {
                    name: "unit",
                    // happy-dom rather than node for the two DOM touchpoints:
                    // journal.ts (localStorage) and sitemap.test.ts (DOMParser).
                    environment: "happy-dom",
                    include: ["src/**/*.test.ts"],
                },
            },
            {
                extends: true,
                test: {
                    name: "browser",
                    include: ["src/**/*.test.tsx"],
                    setupFiles: ["./src/test/setup.ts"],
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: playwright(),
                        // https://vitest.dev/config/browser/playwright
                        instances: [
                            { browser: "chromium" },
                            { browser: "firefox" },
                            { browser: "webkit" },
                        ],
                    },
                },
            },
        ],
    },
});
