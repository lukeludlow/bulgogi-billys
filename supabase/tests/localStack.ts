// Local-stack access for the `db` test tier (REFACTOR_PLAN §5.3). These tests
// run against real Postgres, so they can see what the PostgREST stub cannot:
// RLS policies, grants, constraints, cascades, and transaction boundaries.
//
// Two ways in, deliberately:
//   psql()      — as the `postgres` superuser, for setup and inspection. It
//                 bypasses RLS, which is exactly what a fixture wants, and it
//                 is the only way in: 20260727000002_grants.sql grants the data
//                 tables to `authenticated` only, so even service_role gets a
//                 403 over PostgREST.
//   clientAs()  — a real supabase-js client holding a real GoTrue session, so
//                 the behavior under test goes through the same path the app
//                 does.
//
// This overlaps ~50 lines with .claude/skills/verify/harness.mjs on purpose:
// that harness serves a plain-node Playwright skill and top-level-awaits
// Playwright, which no db test should pay for. Keep the two in step by hand.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/admin/data/database.types.ts";

export const REPO_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
);

/** Every table the app's data lives in, in FK-safe order for inserts. */
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
] as const;

/** An account that exists in auth but not in public.admin_users. */
export const NON_ADMIN_EMAIL = "not-an-admin@example.test";

/** The seeded allowlisted admin (supabase/migrations/…_seed_admin.sql). */
export const ADMIN_EMAIL = "lukeludlow@live.com";

interface LocalStatus {
    API_URL: string;
    PUBLISHABLE_KEY: string;
    SERVICE_ROLE_KEY: string;
}

let statusCache: LocalStatus | undefined;

/** URLs and keys from `supabase status`, cached for the process. */
export function localStatus(): LocalStatus {
    if (statusCache) return statusCache;
    const raw = execFileSync("npx", ["supabase", "status", "-o", "json"], {
        cwd: REPO_ROOT,
        encoding: "utf8",
    });
    // The CLI may print a "Stopped services: [...]" notice above the JSON.
    statusCache = JSON.parse(raw.slice(raw.indexOf("{"))) as LocalStatus;
    return statusCache;
}

function dbContainer(): string {
    const config = readFileSync(
        path.join(REPO_ROOT, "supabase/config.toml"),
        "utf8",
    );
    const projectId = /^project_id\s*=\s*"(.+)"/m.exec(config)?.[1];
    if (!projectId) throw new Error("no project_id in supabase/config.toml");
    return `supabase_db_${projectId}`;
}

/** Run SQL as the superuser inside the local database container. */
export function psql(sql: string): string {
    return execFileSync(
        "docker",
        [
            "exec",
            "-i",
            dbContainer(),
            "psql",
            "-U",
            "postgres",
            "-d",
            "postgres",
            "-At",
            "-v",
            "ON_ERROR_STOP=1",
            "-f",
            "-",
        ],
        // Capture stderr rather than letting it through to the console: the
        // constraint tests expect failures, and a passing run shouldn't look
        // like a broken one. Node appends it to the thrown error either way.
        {
            encoding: "utf8",
            input: sql,
            stdio: ["pipe", "pipe", "pipe"],
        },
    ).trim();
}

/**
 * Empty every data table and replay supabase/seed.sql, so each test file starts
 * from the same baseline menu. Auth users and the admin allowlist survive.
 */
export function resetData(): void {
    psql(
        `truncate ${DATA_TABLES.map((t) => `public.${t}`).join(", ")} cascade;`,
    );
    psql(readFileSync(path.join(REPO_ROOT, "supabase/seed.sql"), "utf8"));
}

/**
 * Run SQL that is expected to be rejected, and return the message Postgres
 * rejected it with. Throws if the statement unexpectedly succeeded, so a
 * constraint that quietly disappears fails the test rather than passing it.
 */
export function sqlError(sql: string): string {
    try {
        psql(sql);
    } catch (error) {
        return String((error as { stderr?: string }).stderr ?? error);
    }
    throw new Error(`expected this SQL to be rejected:\n${sql}`);
}

/** Read a table back as the superuser; `where` is raw SQL. */
export function readRows<T = Record<string, unknown>>(
    table: string,
    where = "",
): T[] {
    const clause = where ? ` where ${where}` : "";
    return JSON.parse(
        psql(
            `select coalesce(json_agg(t), '[]') from (select * from public.${table}${clause}) t;`,
        ),
    ) as T[];
}

/** Insert one row as the superuser, bypassing RLS. */
export function insertRow(table: string, row: Record<string, unknown>): void {
    const columns = Object.keys(row);
    const values = columns.map((column) => sqlLiteral(row[column]));
    psql(
        `insert into public.${table} (${columns.join(", ")}) values (${values.join(", ")}) on conflict do nothing;`,
    );
}

function sqlLiteral(value: unknown): string {
    if (value === null || value === undefined) return "null";
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    return `'${String(value).replaceAll("'", "''")}'`;
}

// ── clients ─────────────────────────────────────────────────────────────────

export type Role = "anon" | "nonAdmin" | "admin";

const clientCache = new Map<Role, SupabaseClient<Database>>();

/**
 * A client acting as one of the three roles the RLS policies distinguish.
 * The session is attached as a request header rather than through
 * `setSession`, so nothing depends on token storage in a node process.
 */
export async function clientAs(role: Role): Promise<SupabaseClient<Database>> {
    const cached = clientCache.get(role);
    if (cached) return cached;

    const { API_URL, PUBLISHABLE_KEY } = localStatus();
    const options = {
        auth: { persistSession: false, autoRefreshToken: false },
    };
    let client: SupabaseClient<Database>;
    if (role === "anon") {
        client = createClient<Database>(API_URL, PUBLISHABLE_KEY, options);
    } else {
        const email = role === "admin" ? ADMIN_EMAIL : NON_ADMIN_EMAIL;
        if (role === "nonAdmin") await ensureUser(email);
        const accessToken = await mintAccessToken(email);
        client = createClient<Database>(API_URL, PUBLISHABLE_KEY, {
            ...options,
            global: { headers: { Authorization: `Bearer ${accessToken}` } },
        });
    }
    clientCache.set(role, client);
    return client;
}

let authReady: Promise<void> | undefined;

/**
 * `supabase db reset` restarts GoTrue, and Kong answers "invalid response from
 * the upstream server" until it is back. Wait for it once per process rather
 * than letting the first test of a `verify.sh --db` run lose that race.
 */
function waitForAuth(): Promise<void> {
    authReady ??= (async () => {
        const { API_URL } = localStatus();
        const deadline = Date.now() + 30_000;
        for (;;) {
            try {
                const response = await fetch(`${API_URL}/auth/v1/health`);
                if (response.ok) return;
            } catch {
                // Not listening yet.
            }
            if (Date.now() > deadline) {
                throw new Error("GoTrue never became healthy");
            }
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
    })();
    return authReady;
}

async function adminApi(
    endpoint: string,
    body: unknown,
): Promise<Record<string, unknown>> {
    await waitForAuth();
    const { API_URL, SERVICE_ROLE_KEY } = localStatus();
    const response = await fetch(`${API_URL}/auth/v1/${endpoint}`, {
        method: "POST",
        headers: {
            apikey: SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        throw new Error(`${endpoint} failed: ${await response.text()}`);
    }
    return (await response.json()) as Record<string, unknown>;
}

/** Create the non-admin account if a previous run hasn't already. */
async function ensureUser(email: string): Promise<void> {
    try {
        await adminApi("admin/users", { email, email_confirm: true });
    } catch (error) {
        // Already registered — the account survives `truncate`, which only
        // touches the public schema.
        if (!String(error).includes("already been registered")) throw error;
    }
}

/** Have GoTrue mint a real session the way a magic link would. */
async function mintAccessToken(email: string): Promise<string> {
    const { API_URL, PUBLISHABLE_KEY } = localStatus();
    const generated = await adminApi("admin/generate_link", {
        type: "magiclink",
        email,
    });
    const verified = await fetch(`${API_URL}/auth/v1/verify`, {
        method: "POST",
        headers: {
            apikey: PUBLISHABLE_KEY,
            "Content-Type": "application/json",
        },
        // token_hash, not token: GoTrue rejects a bare `token` unless the
        // email rides along with it.
        body: JSON.stringify({
            type: "magiclink",
            token_hash: generated.hashed_token,
        }),
    });
    if (!verified.ok) {
        throw new Error(`verify failed: ${await verified.text()}`);
    }
    const session = (await verified.json()) as { access_token: string };
    return session.access_token;
}
