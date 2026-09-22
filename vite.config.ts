import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
        },
    },
    // The SSR build (src/entry-server.tsx) only feeds scripts/prerender.ts at
    // build time. Bundle its dependencies rather than leaving them to Node's
    // ESM/CJS interop, and leave public/ to the client build.
    ssr: { noExternal: true },
    build: { copyPublicDir: !isSsrBuild },
}));
