# Backend Architecture Recommendations

How the backend should evolve as the site grows into the
[ROADMAP.md](ROADMAP.md) goals — catering inquiries, preorders, online ordering,
and multi-user family roles. Written July 2026 against the current codebase;
hosting facts carry source links and should be re-verified before acting on
them.

## 1. Summary of decisions

| Question                       | Recommendation                                                                                                                                    | Revisit when                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Backend server vs serverless?  | **Neither for as long as possible; then one serverless function per need. Never a standing server.**                                              | A feature needs websockets, long-lived jobs, or queue consumers — nothing on the roadmap does.                   |
| Kotlin or TypeScript?          | **TypeScript everywhere.**                                                                                                                        | Never for this project.                                                                                          |
| Hosting?                       | **Vercel Pro ($20/mo) — decided.** Resolves the Hobby non-commercial ToS problem with zero migration; future serverless code is Vercel Functions. | If the bill ever stops being worth it — Cloudflare Pages + Workers remains the documented free alternative (§4). |
| Keep Supabase Postgres + auth? | **Yes** (decided). Upgrade to Pro the day a _public_ feature depends on the DB at runtime.                                                        | —                                                                                                                |
| ORM?                           | **No. supabase-js + generated types + Postgres RPC.**                                                                                             | P3, inside server functions only, and only if RPC proves insufficient.                                           |
| What about `settingsRepo`?     | **Split by data lifecycle, incrementally, riding roadmap work** — see §7.                                                                         | —                                                                                                                |

The one-sentence rule that drives most of this document:

> Code runs in the browser under the user's own RLS-enforced identity **until an
> anonymous user must cause a write, or a secret must be used** — then, and only
> then, that one interaction becomes a serverless function.

## 2. Where we are (and why it's a strength)

- Pure static SPA (Vite + React). `vercel.json` is nothing but an SPA rewrite.
  No API routes, no middleware, no edge functions, **no server code and no
  secrets anywhere in the deployable**.
- Public pages (menu, schedule, blog) never touch Supabase — they are static
  files.
- All security is enforced **in Postgres**: every table has RLS gated by
  `public.is_admin()` (SECURITY DEFINER, checks the caller's JWT email against
  the `admin_users` allowlist —
  `supabase/migrations/20260727000000_initial_schema.sql`). The browser holds
  only the publishable key. `RequireAdmin.tsx` is a navigation guard, not a
  security boundary — and that's correct, because RLS is the boundary.
- All table access is centralized in `src/admin/data/settingsRepo.ts`, synced by
  the whole-app-state engine in `src/admin/SettingsContext.tsx` (optimistic
  edits, 800 ms debounced diff/save, localStorage crash journal, backoff retry).

This "zero server code, database-enforced security" shape is not technical debt
— it is the cheapest, most secure architecture this project could have, and
every recommendation below is about **preserving it as long as possible**. The
genuine debt is narrower: `settingsRepo` has outgrown its name (§7).

## 3. Server vs serverless — and why not Kotlin

**Everything in P0 (market tagging, event contribution, tax separation, weekly
review) needs zero server code.** It is admin analytics over data the admin's
JWT already grants. Building a backend now would add a deploy target, a secret
store, and an ops burden to protect nothing.

**The first server code appears at P1.4, the catering inquiry form** — the first
time an _anonymous_ visitor must cause a database write. That needs spam
protection, validation, and a notification email: one small serverless function,
not a server.

**A standing backend server (Kotlin or otherwise) is the wrong shape for this
project, permanently:**

- Nothing on the roadmap — including P3 online ordering — needs a process that
  exists _between_ requests. Ordering is request/response plus payment webhooks:
  serverless-shaped.
- Traffic is one admin today, a handful of family members later, and a
  farmers-market food site's public load. A JVM server would idle 99.9% of the
  time — and idling now costs money:
  [Fly.io and Railway have eliminated their free tiers, and Render's free tier cold-starts after 15 minutes idle](https://hostim.dev/blog/render-vs-railway-vs-fly-pricing/).
- A second language splits a solo-maintained codebase in two. The domain types
  in `src/admin/domain/types.ts` and `persistence/rows.ts` would need
  duplicating or codegen. TypeScript-everywhere means shared types between SPA
  and functions, one toolchain, one test runner (vitest), one deploy story.

Kotlin is a fine tool; this just isn't the project where it pays rent. If a
future venture needs a real backend, that's the place for it.

## 4. Hosting (decided): Vercel Pro

**Decision: stay on Vercel and upgrade to Pro ($20/mo).** This resolves the
compliance problem — bulgogibillys.com is a commercial site, and Vercel's free
Hobby plan is restricted to personal, non-commercial use
([Vercel Hobby plan docs](https://vercel.com/docs/plans/hobby),
[free-tier breakdown](https://www.promptstoproduct.com/vercel-free-tier-limits))
— with zero migration risk: no DNS cutover, no Supabase auth redirect-allowlist
changes, no analytics swap, no new vendor.

What Pro buys beyond compliance:

- **Vercel Functions** in the same repo and language as the SPA — the natural
  home for every serverless function this document calls for (catering inquiries
  at P1, preorders and payment webhooks later), with Pro limits far above this
  site's traffic.
- **Vercel Cron Jobs**, which cover the Supabase keep-alive ping (§5).
- Unchanged deploy workflow, domains, and `@vercel/analytics`.

One non-dependency worth noting: **Cloudflare Turnstile** (the free CAPTCHA
planned for the catering form, §8) is a standalone service that works on any
host — using it does not require Cloudflare hosting.

### Alternatives considered

- **Cloudflare Pages + Workers** — $0 and commercial-use-clean (100K
  requests/day;
  [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/),
  [Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/)),
  but a real migration: `_redirects` SPA rule, Supabase magic-link redirect
  allowlist updated before DNS cutover, analytics swap, new vendor. **This
  remains the documented escape hatch** if the Pro bill ever stops being worth
  $20/mo.
- **Stay on Vercel Hobby** — free, but a standing ToS violation with the risk of
  a forced migration at the worst possible time.
- **Vercel static + Supabase Edge Functions** — free Deno functions (500K
  invocations/mo,
  [Supabase pricing breakdown](https://uibakery.io/blog/supabase-pricing)), but
  it leaves the static site's Hobby ToS problem unresolved and adds a second
  runtime.

## 5. Supabase: operational notes

- **Free-tier pausing is the biggest operational risk:** free projects pause
  after 7 days of inactivity
  ([Supabase free-tier limits](https://uibakery.io/blog/supabase-pricing)).
  Today the weekly Monday review keeps it warm, but a vacation could pause the
  admin dashboard. Cheap mitigation: a scheduled daily ping running a trivial
  query — Vercel Cron Jobs (included on Pro) is the natural home, GitHub Actions
  cron the fallback.
- **Hard upgrade trigger:** the day a _public-facing_ feature reads or writes
  the DB at runtime (preorders, P2.1), a paused database becomes a
  customer-facing outage. At that point Supabase Pro ($25/mo) is mandatory, not
  optional. Until then, engineer around it (build-time menu publishing, §6) so
  the free tier stays safe.

## 6. Data access & ORM: no ORM — supabase-js + generated types + RPC

An ORM is the one "nice to have" this architecture should refuse, because of how
RLS works:

- **supabase-js preserves the security model.** Every query goes through
  PostgREST carrying the signed-in user's JWT, so the `is_admin()` policies
  evaluate on every request.
- **Prisma and Drizzle connect directly to Postgres as a database role, which
  bypasses RLS entirely.** Making an ORM RLS-aware (per-transaction role
  switching and claim injection — Drizzle has helpers for this) is fiddly and
  fails _silently open_. That is exactly the sharp edge a solo maintainer
  shouldn't hold, and adopting it would mean re-implementing in application code
  the authorization the database already enforces. Prisma additionally wants to
  own the schema, fighting the existing `supabase/migrations/*.sql` + CLI
  workflow.

What to do instead — three moves that deliver most of what an ORM promises:

1. **Generated types** _(done, Aug 2026)_: `npm run db:types` generates
   `src/admin/data/database.types.ts` from the local schema; the `*Row` types in
   `src/admin/data/rows.ts` are aliases onto it and the client is
   `createClient<Database>`. Typed rows and compile-time schema-drift detection
   — 80% of ORM value, 0% of the RLS risk. Regenerating is part of every
   migration's definition of done.
2. **Postgres views/functions via `supabase.rpc()`** when queries outgrow
   PostgREST filters (event-contribution rollups, 13-week forecast seeding).
   Still RLS-governed, transactional for free, no new dependency.
3. **Drizzle's future slot, precisely bounded:** P3, inside server functions
   that hold the service-role key anyway (RLS already bypassed there by design),
   for multi-table transactional writes — and even then, try an RPC function
   first. Never in the browser bundle.

## 7. The `settingsRepo` refactor: split by data lifecycle

`settingsRepo.ts` made sense when everything was "settings." It now conflates
three data shapes with different lifecycles behind one 9-table `fetchSettings()`
/ `applyChangeSet()` gateway:

| Data                    | Tables                                                                 | Lifecycle                                       | Right sync model                                                                   |
| ----------------------- | ---------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Config document**     | settings, ingredients, batch_lines, menu_items, variants, recipe_lines | Small, interdependent, edited as a whole        | The existing whole-state optimistic sync — it's genuinely good for this            |
| **Transaction history** | transactions                                                           | Append-only, thousands of rows, imported weekly | Plain paged reads + insert-only import; should not ride the diff/journal machinery |
| **Operational records** | events, market_classifications                                         | Keyed rows, edited one at a time                | Per-row upsert/delete, plain async calls                                           |

Loading the entire transactions table through `fetchSettings()` on every
dashboard visit, and diffing it on every autosave, gets worse with every Square
import. Sequenced fix — each step rides roadmap work already touching that code,
no big-bang rewrite:

- **P0 (with roadmap 0.1, which touches transactions anyway):** _transactions
  half done (Aug 2026)_ — `src/admin/data/transactions.ts` (paged reads +
  insert-only import) + `TransactionsProvider`, with transactions removed from
  `Settings`, `diff.ts`, and the crash journal; shared paging helpers live in
  `src/admin/data/postgrest.ts`. Still to do: `eventsRepo` (keyed
  upserts/deletes + classifications), after which the context and its crash
  journal keep doing what they're good at, for the 6-table config document only
  — `fetchSettings()` gets small and fast.
- **P0/P1 hardening:** replace `applyChangeSet`'s sequential delete-then-insert
  statements with a single Postgres function `apply_config(jsonb)` called via
  RPC — one atomic transaction, closing the partial-save risk `settingsRepo`'s
  own comment acknowledges. Transactionality without a server or an ORM.
- **Standing convention:** every new domain (catering_inquiries, preorders, KPI
  snapshots, inventory) gets its own module under `src/data/<domain>.ts` from
  day one and never enters the Settings blob. Migrate the existing repos into
  `src/data/` opportunistically when touched.
- **Payoff at P3:** family roles become an RLS-policy change, not a repo rewrite
  — the domain split is exactly what makes "David sees events + inventory only"
  cheap.

## 8. Security model for public ordering + private admin

Four layers, each with one hard rule:

1. **Public reads — publish at build time, don't open the database.** For menu
   prices (P1.3): do **not** add anon SELECT policies to `menu_items`/`variants`
   — those tables carry cost and margin data, and RLS filters _rows, not
   columns_, so any anon policy is a leak footgun. Instead, a build step
   snapshots name/size/price into the static bundle, and an admin "Publish menu"
   button hits a deploy hook to rebuild. The public site stays fully static,
   immune to DB pauses, with zero anon grants. If runtime public reads ever
   become necessary (P2 preorders), expose a dedicated public view containing
   only public columns — never the admin tables.
2. **Public writes — never browser → database.** Catering inquiries, preorders,
   orders: always browser → serverless function → CAPTCHA (Turnstile) +
   validation + rate limit → service-role insert into an insert-only table. The
   function layer is the _only_ holder of the service-role key. For anything
   involving money: the server computes prices from the database;
   client-submitted amounts are never trusted; payment webhooks (Square) land on
   a function that verifies signatures.
3. **Admin — unchanged.** JWT + RLS, `RequireAdmin` as a UX guard only. Don't
   weaken this to make something else convenient.
4. **P3 family roles — extend, don't rework.** Add a `role` column to
   `admin_users` and replace the single `is_admin()` predicate with role-scoped
   policies per table. The current design (a SECURITY DEFINER function checking
   the JWT against a table) extends to this naturally.

## 9. Phase-by-phase triggers

| Phase                       | Stays the same                                   | Changes                                                                                                                                                                                                                                                    | Trigger being answered                                                          |
| --------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Now / P0**                | Static SPA + supabase-js + RLS; zero server code | Upgrade Vercel to Pro (§4); add DB keep-alive ping (Vercel Cron); extract transactions/events repos; adopt generated types                                                                                                                                 | Hobby ToS compliance; transactions-table growth                                 |
| **P1**                      | Admin path unchanged                             | **First Vercel Function** (catering inquiries: Turnstile + service-role insert + notification email). The first secret appears — server-side Vercel environment variables only, **never** in a `VITE_`-prefixed var (those compile into the public bundle) | First anonymous write + first secret                                            |
| **P2**                      | Admin stays direct-to-Supabase                   | More functions (preorders, Square payment links, list signup). **Upgrade Supabase to Pro** the day a public feature depends on the DB at runtime                                                                                                           | Money flows through the site; a paused DB becomes an outage                     |
| **P3**                      | Same shape — more functions, not a server        | Square checkout + webhook functions; role-scoped RLS policies; Drizzle _permitted_ inside functions if RPC proves insufficient                                                                                                                             | Order volume; multi-user access                                                 |
| **Never** (on this roadmap) | —                                                | A standing backend server                                                                                                                                                                                                                                  | Would need websockets / long-running jobs / sustained throughput — none planned |

## 10. Risks & gotchas register

| #   | Risk                                                                                     | Mitigation                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Vercel Hobby non-commercial ToS** — the site was out of compliance on the free plan    | **Resolved by the Pro upgrade (§4)**; make the upgrade before adding any new public features                                     |
| 2   | **Supabase free-tier 7-day pause**                                                       | Scheduled ping now (Vercel Cron); build-time menu publish keeps the public site immune; hard Pro-upgrade trigger defined (§5)    |
| 3   | **RLS bypass via ORM / connection strings** — silently skips the entire security model   | Codify "supabase-js or RPC only" until P3; no Postgres connection string ever ships in app code                                  |
| 4   | **Anon read policies leaking cost data** — RLS is row-level, not column-level            | No anon policies on admin tables, ever; build-time publish or dedicated public views only                                        |
| 5   | **Catering-form spam** — a public POST endpoint will be found by bots                    | Turnstile + honeypot field + function-side rate limiting; insert-only table with no anon SELECT (inquiries contain customer PII) |
| 6   | **Secrets-management debut** — the first Vercel Function introduces the service-role key | Server-side Vercel environment variables only; never in the repo; never `VITE_`-prefixed; rotate immediately if ever exposed     |
| 7   | **Non-transactional config saves** — acknowledged in `settingsRepo` today                | `apply_config(jsonb)` RPC (§7) makes the save atomic                                                                             |

## 11. Immediate action list

Small, ordered, all cheap:

1. **Upgrade the Vercel account to Pro** (§4).
2. **Add a daily DB keep-alive ping** via Vercel Cron Jobs.
3. ~~**Adopt `supabase gen types typescript`** and retire the hand-written row
   types in `rows.ts`.~~ Done (Aug 2026, `npm run db:types`).
4. **Extract `transactionsRepo` + `eventsRepo`** while building roadmap 0.1
   (which touches that code anyway). _transactionsRepo done (Aug 2026,
   `src/admin/data/transactions.ts` + `TransactionsContext`); eventsRepo is
   REFACTOR_PLAN Phase 4._
5. **Add the `apply_config` RPC** to make config saves atomic.
