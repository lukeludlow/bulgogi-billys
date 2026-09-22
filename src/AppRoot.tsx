import { StrictMode, type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";

/**
 * Everything around the router, shared by main.tsx and entry-server.tsx.
 * Hydration needs the server and the browser to render the same tree shape:
 * useId derives ids from it, and Headless UI's aria wiring uses those ids.
 */
export default function AppRoot({ children }: { children: ReactNode }) {
    return (
        <StrictMode>
            {children}
            <Analytics />
        </StrictMode>
    );
}
