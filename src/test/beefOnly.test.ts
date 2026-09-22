import { expect, test } from "vitest";

// Every public-site source file plus the HTML shell, as raw text. Tests are
// excluded so assertions like this one don't trip over themselves.
const sources = import.meta.glob<string>(
    ["/index.html", "/src/site/**/*.{ts,tsx}", "!/src/site/**/*.test.*"],
    { query: "?raw", import: "default", eager: true },
);

test("the public site never offers pork — the menu is beef-only", () => {
    const files = Object.keys(sources);
    expect(files).toContain("/index.html");
    expect(files.length).toBeGreaterThan(10);
    for (const [file, text] of Object.entries(sources)) {
        expect(text, file).not.toMatch(/\bpork\b/i);
    }
});
