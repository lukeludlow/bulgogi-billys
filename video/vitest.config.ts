import { defineConfig } from "vitest/config";

// Runs with the repo root's vitest (npm puts ../node_modules/.bin on PATH).
// Every pure module of the video, including the ones that need this
// package's own dependencies (d3-geo). The root `npm test` runs the
// dependency-free subset so verify.sh works without installing video/.
export default defineConfig({
    test: {
        environment: "node",
        include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    },
});
