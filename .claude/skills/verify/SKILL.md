---
name: verify
description: Build, launch, and drive this app to verify changes at runtime (Vite dev server + local Supabase stack + Playwright).
---

# Verifying changes in bulgogi-billys

React 19 + React Router v7 Vite SPA. Public site at `/`; admin SPA at `/admin`
(Profit Margin Calculator), `/admin/transactions` and `/admin/events`, all behind
Supabase magic-link auth (`/admin-login`, `/auth/callback`). Admin data lives in
Postgres — there is no localStorage settings blob to seed any more.

## Launch

```bash
npx supabase start                        # local stack (npx — not Homebrew)
npm run dev -- --port 5199 --strictPort   # background it
```

Port 5199 is what `supabase/config.toml` allowlists for the auth redirect;
`.env.local` should point `VITE_SUPABASE_URL` at `http://127.0.0.1:54321`. If
`curl http://127.0.0.1:54321` returns `000`, the agent sandbox is blocking
localhost and the Docker socket — rerun those commands with the sandbox off.

## Drive it (local stack)

`.claude/skills/verify/harness.mjs` does the setup; scripts stay short:

```js
import {
    BASE, chromium, localContext, readTable, resetLocalData, seedLocal,
    signInViaMagicLink,
} from "/Users/ellie/WebstormProjects/bulgogi-billys/.claude/skills/verify/harness.mjs";

resetLocalData();                    // truncate + re-apply supabase/seed.sql
seedLocal({                          // replaces only the tables you name
    events: [{ date: "2026-07-25", market: "grogans-mill", market_fee: 20,
               waste: 0, employee_hours: 1.5, billys_hours: 6 }],
});

const browser = await chromium.launch();
const { context, blocked } = await localContext(browser);
const page = await context.newPage();
await signInViaMagicLink(page, { email: "lukeludlow@live.com" });

await page.goto(`${BASE}/admin/events`);
await page.locator("select[aria-label='Market for 2026-07-19']").selectOption("grogans-mill");
await page.waitForTimeout(2000);     // 800ms autosave debounce + round trip
console.log(readTable("market_overrides"));   // proves the write hit Postgres
console.log(blocked);                // must be only the vercel-analytics URL
await browser.close();
```

Row shapes for `seedLocal` are the `*Row` interfaces in
`src/admin/data/rows.ts`; omitted columns keep their
schema defaults. `readTable(table, where)` takes raw SQL for `where`.

**Nothing can reach the hosted project.** `denyRemote` (installed by
`localContext` and `stubbedContext`) aborts every http(s) request that isn't to
localhost and records it in `blocked`, and fixtures go through
`docker exec … psql` rather than PostgREST — the data tables are granted to
`authenticated` only, so service_role gets a 403 anyway.

`resetLocalData()` wipes the **local** data tables and replays
`supabase/seed.sql` (baseline menu + a local auth identity for every email in
`admin_users`). `signInDirect(context, { email })` skips the login UI when the
test isn't about signing in.

## Fallback: no Docker

`stubbedContext` fakes the session and answers PostgREST from fixtures, so
layout and rendering can be checked with the stack down. It cannot tell you
whether anything persisted — `writes` only records what the app *tried* to send.

```js
const { context, writes, blocked } = await stubbedContext(browser, {
    tables: { ...DEFAULT_TABLES, events: [/* … */] },
});
// … drive the page …
writes.includes("POST events");   // the edit would have been persisted
```

## Gotchas that cost time

- The admin top nav renders twice (mobile header + desktop strip in
  `DashboardShell.tsx`); one copy is always CSS-hidden. Use `>> visible=true` on
  nav links, never `.first()`.
- Headings differ from sidebar titles: `/admin`'s `h1` is "Profit Margin
  Calculator" while its sidebar says "Profit Calculator".
- `aria-label`s are composed at render time — `Market for 2026-07-25`,
  `Market fee for 2026-07-25 Grogan's Mill`, `Bulgogi Fries Small price`,
  `Hourly rate for Grogan's Mill`. Read the component (`EventsTable.tsx`,
  `MenuItemEditor.tsx`, `MarketRollups.tsx`) instead of guessing.
- Sidebar "Jump to" entries are `<button>`s using smooth `scrollIntoView`; wait
  ~2 s, and sections land at y=96 (`scroll-mt-24` in `Section.tsx`).
- Autosave debounces 800 ms (`SAVE_DEBOUNCE_MS` in `SettingsContext.tsx`), then
  retries with backoff on failure ("Offline — retrying…" in the status bar).
  Wait ≥2 s before asserting a write landed.
- An empty `settings` table renders "Couldn't load the dashboard data", not an
  empty dashboard — `fetchSettings()` returns null without that row.
- `@vercel/analytics` always tries `va.vercel-scripts.com`; expect exactly that
  URL in `blocked` plus a matching console error, and filter it out of
  page-error assertions.
- If you edit `supabase/seed.sql`, keep the `auth.users` token columns as `''`.
  A NULL there makes every sign-in fail with "Database error finding user"
  (GoTrue scans them into non-nullable Go strings).
- Changing `[auth]` in `supabase/config.toml` needs
  `npx supabase stop && npx supabase start`; changing migrations or the seed
  needs `npx supabase db reset`.

## Flows worth driving

- Desktop 1440 and mobile 390. Assert
  `document.documentElement.scrollWidth - clientWidth <= 1` on mobile.
- Shared state: edit "Bulgogi Fries Small price" on the calculator, switch pages
  via the top nav, come back — the value must survive (the `SettingsProvider`
  lives in the `/admin` layout route) and `readTable("variants", …)` must show
  it persisted.
- Events: contribution math, plus retagging a day's market and confirming the
  row appears in `market_overrides`.
- Transaction History: one `#range-window` select drives every section on the
  page.
