// Playwright harness for verifying this app at runtime. Two paths:
//
//   local stack  — sign in for real against `supabase start` and read/write the
//                  local Postgres. Exercises RLS, migrations and the persistence
//                  layer, so a passing run means the feature actually works.
//   network stub — no Docker: fake the session and answer PostgREST from
//                  fixtures. Fine for layout and rendering, blind to the DB.
//
// Both go through `denyRemote`, which aborts every non-localhost request. That,
// not the value in .env.local, is what guarantees a verification run can never
// reach the hosted project.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const REPO_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../..",
);

/** Dev server origin; must match the redirect URLs in supabase/config.toml. */
export const BASE = process.env.VERIFY_BASE ?? "http://localhost:5199";

// Re-exported so scripts don't have to know where Playwright lives (it ships
// inside @vitest/browser-playwright, not as a top-level dependency).
export const { chromium } = await import(
    path.join(REPO_ROOT, "node_modules/playwright/index.mjs")
);

/** Every table fetchSettings() reads, in FK-safe order for inserts. */
export const DATA_TABLES = [
    "settings",
    "ingredients",
    "batch_lines",
    "menu_items",
    "variants",
    "recipe_lines",
    "transactions",
    "events",
    "purchases",
    "market_overrides",
    "processor_fees",
    "market_settings",
    "reserve_transfers",
];

// ── local stack ─────────────────────────────────────────────────────────────

let statusCache;

/** URLs and keys from `supabase status`, cached for the process. */
export function localStatus() {
    if (statusCache) return statusCache;
    const raw = execFileSync("npx", ["supabase", "status", "-o", "json"], {
        cwd: REPO_ROOT,
        encoding: "utf8",
    });
    // The CLI may print a "Stopped services: [...]" notice above the JSON.
    statusCache = JSON.parse(raw.slice(raw.indexOf("{")));
    return statusCache;
}

function dbContainer() {
    const config = readFileSync(
        path.join(REPO_ROOT, "supabase/config.toml"),
        "utf8",
    );
    const projectId = /^project_id\s*=\s*"(.+)"/m.exec(config)?.[1];
    if (!projectId) throw new Error("no project_id in supabase/config.toml");
    return `supabase_db_${projectId}`;
}

/**
 * Run SQL as postgres inside the local DB container.
 *
 * Fixtures deliberately do NOT go through PostgREST: 20260727000002_grants.sql
 * grants the data tables to `authenticated` only, so service_role gets a 403.
 * Going through the container also means seeding can't reach a remote database
 * even by accident.
 */
function psql(sql) {
    return execFileSync(
        "docker",
        ["exec", "-i", dbContainer(), "psql", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-f", "-"],
        { encoding: "utf8", input: sql },
    ).trim();
}

function sqlLiteral(value) {
    if (value === null || value === undefined) return "null";
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    return `'${String(value).replaceAll("'", "''")}'`;
}

/**
 * Empty every data table in the LOCAL database and re-apply supabase/seed.sql,
 * so a run starts from the same baseline menu every time (the admin allowlist
 * and auth users survive either way). Call at the start of a run, not the end,
 * so a failed run leaves its state around to inspect.
 *
 * Pass `{ baseline: false }` for a completely empty database — but remember an
 * empty `settings` table renders the dashboard's error screen.
 */
export function resetLocalData({ baseline = true } = {}) {
    psql(`truncate ${DATA_TABLES.map((t) => `public.${t}`).join(", ")} cascade;`);
    if (baseline) {
        psql(readFileSync(path.join(REPO_ROOT, "supabase/seed.sql"), "utf8"));
    }
}

/**
 * Replace the contents of each named table, in FK-safe order — a table you
 * don't name keeps whatever the baseline seed put there. Row shapes are the
 * *Row interfaces in src/pages/admin/dashboard/persistence/rows.ts; columns you
 * leave out keep their schema defaults.
 */
export function seedLocal(tables) {
    for (const table of DATA_TABLES) {
        const rows = tables[table];
        if (!rows?.length) continue;
        const statements = [`delete from public.${table};`];
        statements.push(...rows.map((row) => {
            const columns = Object.keys(row);
            const values = columns.map((column) => sqlLiteral(row[column]));
            return `insert into public.${table} (${columns.join(", ")}) values (${values.join(", ")});`;
        }));
        psql(statements.join("\n"));
    }
}

/**
 * Read a table back to prove a UI edit reached Postgres.
 * `where` is raw SQL, e.g. `readTable("variants", "id = 'small'")`.
 */
export function readTable(table, where = "") {
    const clause = where ? ` where ${where}` : "";
    return JSON.parse(
        psql(
            `select coalesce(json_agg(t), '[]') from (select * from public.${table}${clause}) t;`,
        ),
    );
}

/**
 * Sign in the way a person does: submit the login form, pull the magic link out
 * of Mailpit, and follow it in the same context (the PKCE verifier lives in
 * that context's localStorage, so a second context can't finish the exchange).
 */
export async function signInViaMagicLink(page, { email }) {
    const mailpit = localStatus().MAILPIT_URL ?? "http://127.0.0.1:54324";
    await fetch(`${mailpit}/api/v1/messages`, { method: "DELETE" });

    await page.goto(`${BASE}/admin-login`);
    await page.fill('input[type="email"]', email);
    await page.click('button[type="submit"]');
    await page.waitForSelector("text=Check your email", { timeout: 20_000 });

    const link = await waitForMagicLink(mailpit, email);
    await page.goto(link);
    await page.waitForURL(/\/admin(\/|$)/, { timeout: 20_000 });
}

async function waitForMagicLink(mailpit, email, timeoutMs = 20_000) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        const list = await (
            await fetch(`${mailpit}/api/v1/messages?limit=20`)
        ).json();
        const message = list.messages?.find((m) =>
            m.To?.some((to) => to.Address?.toLowerCase() === email.toLowerCase()),
        );
        if (message) {
            const body = await (
                await fetch(`${mailpit}/api/v1/message/${message.ID}`)
            ).json();
            const match = /https?:\/\/[^"'\s<>]*\/auth\/v1\/verify[^"'\s<>]*/.exec(
                `${body.HTML ?? ""}\n${body.Text ?? ""}`,
            );
            if (match) return match[0].replaceAll("&amp;", "&");
            throw new Error("magic-link email has no /auth/v1/verify URL");
        }
        if (Date.now() > deadline) {
            throw new Error(`no magic-link email for ${email} within ${timeoutMs}ms`);
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
}

/**
 * Skip the login UI: have GoTrue mint a real session and drop it into storage.
 * Use when the test is about the dashboard, not about signing in.
 */
export async function signInDirect(context, { email }) {
    const { API_URL, SERVICE_ROLE_KEY, PUBLISHABLE_KEY } = localStatus();
    const generated = await fetch(`${API_URL}/auth/v1/admin/generate_link`, {
        method: "POST",
        headers: {
            apikey: SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "magiclink", email }),
    });
    if (!generated.ok) {
        throw new Error(`generate_link failed: ${await generated.text()}`);
    }
    const { hashed_token: token } = await generated.json();

    const verified = await fetch(`${API_URL}/auth/v1/verify`, {
        method: "POST",
        headers: { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "magiclink", token }),
    });
    if (!verified.ok) {
        throw new Error(`verify failed: ${await verified.text()}`);
    }
    const session = await verified.json();

    // supabase-js keys storage by the API host's first label — "127" locally.
    const storageKey = `sb-${new URL(API_URL).hostname.split(".")[0]}-auth-token`;
    await context.addInitScript(
        ([key, value]) => localStorage.setItem(key, value),
        [storageKey, JSON.stringify(session)],
    );
}

// ── safety net ──────────────────────────────────────────────────────────────

/**
 * Abort every http(s) request that isn't going to this machine and record it.
 * Register before any other route: Playwright matches routes in reverse order,
 * so stubs added later still win for the URLs they claim.
 *
 * @returns the growing list of blocked URLs — assert on it at the end of a run.
 */
export async function denyRemote(context) {
    const blocked = [];
    await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        const local =
            !url.protocol.startsWith("http") ||
            ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
        if (local) return route.continue();
        blocked.push(url.href);
        return route.abort();
    });
    return blocked;
}

/** Browser context wired to the local stack, with the remote guard installed. */
export async function localContext(browser, { viewport } = {}) {
    const context = await browser.newContext({
        viewport: viewport ?? { width: 1440, height: 1000 },
    });
    const blocked = await denyRemote(context);
    return { context, blocked };
}

// ── network stub (no Docker) ────────────────────────────────────────────────

/** Minimum that renders a dashboard; spread it and override per test. */
export const DEFAULT_TABLES = {
    settings: [
        {
            id: 1,
            selected_protein: "beef",
            grocery_weekly_spend: 400,
            packaging_cost_per_order: 0.25,
            blended_food_cost_percent: 32,
            employee_hourly_rate: 12,
            sales_tax_rate_percent: 8.25,
        },
    ],
    ingredients: [],
    batch_lines: [],
    menu_items: [],
    variants: [],
    recipe_lines: [],
    transactions: [],
    events: [],
    purchases: [],
    market_overrides: [],
    processor_fees: [],
    market_settings: [
        { market: "grogans-mill", classification: null, employee_hourly_rate: null },
        { market: "new-caney", classification: null, employee_hourly_rate: null },
        { market: "fm-1488", classification: null, employee_hourly_rate: null },
        { market: "other", classification: null, employee_hourly_rate: null },
    ],
};

const FAKE_USER = {
    id: "00000000-0000-0000-0000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "admin@example.test",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
};

/**
 * Context that believes it's signed in and answers PostgREST from `tables`.
 * `writes` collects "<METHOD> <table>" for every non-GET, which is how a stub
 * run asserts that an edit would have persisted.
 */
export async function stubbedContext(browser, { tables, viewport } = {}) {
    const rowsFor = { ...DEFAULT_TABLES, ...tables };
    const context = await browser.newContext({
        viewport: viewport ?? { width: 1440, height: 1000 },
    });
    const blocked = await denyRemote(context);
    const writes = [];

    const session = {
        access_token: "stub-access-token",
        token_type: "bearer",
        expires_in: 86_400,
        expires_at: Math.floor(Date.now() / 1000) + 86_400,
        refresh_token: "stub-refresh-token",
        user: FAKE_USER,
    };

    // Answer for whatever storage key supabase-js derives from the configured
    // URL, so the stub doesn't care whether .env points at localhost or a
    // hosted project ref.
    await context.addInitScript((value) => {
        const original = Storage.prototype.getItem;
        Storage.prototype.getItem = function (key) {
            if (/^sb-.*-auth-token$/.test(key)) return value;
            return original.call(this, key);
        };
    }, JSON.stringify(session));

    await context.route("**/rest/v1/**", async (route) => {
        const request = route.request();
        const table = new URL(request.url()).pathname
            .split("/rest/v1/")[1]
            .split("?")[0];
        if (request.method() !== "GET") {
            writes.push(`${request.method()} ${table}`);
            return route.fulfill({
                status: 201,
                contentType: "application/json",
                body: "[]",
            });
        }
        const rows = rowsFor[table] ?? [];
        // .maybeSingle() on settings asks for an object, not an array.
        const wantsObject = (request.headers()["accept"] ?? "").includes(
            "vnd.pgrst.object",
        );
        return route.fulfill({
            status: 200,
            contentType: "application/json",
            headers: { "content-range": `0-${rows.length}/${rows.length}` },
            body: JSON.stringify(wantsObject ? (rows[0] ?? null) : rows),
        });
    });

    await context.route("**/auth/v1/**", async (route) => {
        const url = route.request().url();
        const body = url.includes("/user")
            ? FAKE_USER
            : url.includes("/token")
              ? session
              : {};
        return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(body),
        });
    });

    return { context, writes, blocked };
}
