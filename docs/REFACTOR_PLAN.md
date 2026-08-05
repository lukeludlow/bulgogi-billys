# Refactor & Cleanup Plan — Dashboard, Backend, and the Public/Private Boundary

A phased, zero-regression plan to take the admin dashboard, its subpages, and
the Supabase persistence layer from "grown organically" to a structure that can
absorb the [ROADMAP.md](ROADMAP.md) feature set — and unexpected feedback
requests — without accumulating mess. Written August 2026 against the current
codebase, after a full survey of `src/`, `supabase/`, and the test suite. Every
file/line citation below was verified directly.

This plan **operationalizes** [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md)
— it sequences the decisions that doc already made (no ORM, no server, generated
types, the §7 repo split, the `apply_config` RPC) into shippable steps. Nothing
here contradicts it.

Three decisions were made up front and are baked in:

1. **Naming:** the source tree splits into `src/site/` (public website),
   `src/admin/` (private dashboard), and `src/shared/` — "site" rather than
   "public" to avoid colliding with Vite's `/public` static-assets directory.
2. **Regression gate:** a local **`./verify.sh`** script run manually before
   pushing — not GitHub CI (Actions run _after_ a push lands, so they can't stop
   a Vercel deploy for a solo dev pushing to `main`) and not a git hook. The
   script is staged so it can become a CI workflow verbatim if a second
   developer ever joins and PRs begin.
3. **Scope:** includes the cheap backend hardening items from
   BACKEND_ARCHITECTURE §11 (generated DB types, atomic `apply_config` RPC, the
   revoke fix) — behavior-preserving from the user's perspective, and cheapest
   to do while the persistence layer is being restructured anyway.

---

## 1. Diagnosis — what's actually wrong

Short and factual; each item is verified in the code. The app _works_ — this is
about the cost of the next twenty changes, not the last twenty.

### 1.1 The public/private boundary exists de facto, not de jure

- `src/main.tsx` is already the only file where public and admin meet (7 lazy
  `import()`s), and code-splitting already keeps supabase-js and recharts out of
  the public bundle (verified in `dist/assets/`). The _runtime_ boundary is
  real.
- But nothing in the tree or tooling encodes it: admin is just a sibling folder
  under `src/pages/`, `src/components/` and `src/lib/` are undifferentiated
  shared buckets (`lib/supabase.ts` is admin-only in practice but lives in the
  shared bucket; `components/RestaurantStructuredData.tsx` is public-only but
  likewise), and `eslint.config.js` is stock — no import-boundary rules. Nothing
  prevents a public page from importing the Supabase client tomorrow.
- Security is _not_ the issue: RLS in Postgres is the real boundary (correctly,
  per BACKEND_ARCHITECTURE §2). This is about blast-radius legibility and bundle
  hygiene — the "at-a-glance: this change only touches the private site"
  property.

### 1.2 The Settings blob conflates three data lifecycles (BACKEND_ARCHITECTURE §7)

- All 12 data tables ride one `fetchSettings()` / `applyChangeSet()` gateway
  (`src/pages/admin/dashboard/persistence/settingsRepo.ts`, 297 lines). The
  entire `transactions` table is paged into memory on every dashboard visit,
  re-diffed on every 800 ms autosave, and JSON-serialized into the localStorage
  crash journal on every dirty `pagehide` (a quota risk that grows with every
  Square import).
- The save path is non-transactional and admits it — `settingsRepo.ts:1–5`:
    > "Not transactional over PostgREST — a mid-save failure leaves a partial
    > config until the caller's retry succeeds, which the tiny data size makes
    > acceptable." The worst window: `batch_lines`/`recipe_lines` are rewritten
    > DELETE-all-then-INSERT, so a failure between the two leaves _zero_ lines
    > until a retry lands — and a browser close in that window strands the
    > correct state in one browser's localStorage.
- `market_overrides` is fetched unpaged despite unbounded growth (one row per
  corrected day) — a silent 1000-row PostgREST cliff.
- `rows.ts` (400 lines) hand-maintains 12 row interfaces with unchecked `as`
  casts for every check-constrained enum. Nothing verifies them against the
  schema; drift surfaces only at runtime.

### 1.3 Admin frontend smells

- **`EventsTable.tsx` (509 lines) is a god component:** an add-event dialog with
  its own form state, four `Settings` mutators including the 54-line
  `overrideMarket` (which merges two expense rows by summing fields — real
  business logic), a 16-column table, and a 177-line `EventRow`, all
  interleaved.
- **Two incompatible state conventions:** four leaf components take a drilled
  `setSettings` (EventsTable, MarketRollups, PurchasesEditor,
  ProcessorFeesEditor) while ProfitCalculator instead drills six granular
  callbacks — and ~145 lines of ProfitCalculator are pure state reducers wearing
  a page component's clothes.
- **Duplication:** the card wrapper class string is repeated verbatim 15× across
  14 files (no `Card` component); an ad-hoc label class appears 7× while
  Catalyst's `Field`/`Label` is used in only 2 of 33 admin files; three
  near-identical editor tables (Purchases, ProcessorFees, Events) reimplement
  the same add/remove/empty-state/sort shape.
- **Shared primitives live in leaf files:** chart theming in `MarginCharts.tsx`
  (imported by 3 other files), `StatCard` in `SummaryCards.tsx`, `MARKET_LABELS`
  in `eventAnalytics.ts` (UI strings inside the pure math engine),
  `formatCurrency`/`formatPercent` in `calculations.ts` (imported by 9 UI
  files), `splitUnits`/`joinUnits` in `DualUnitField.tsx`.
- **Route identity has three sources of truth:** `main.tsx` routes,
  `AdminTopNav`'s hardcoded `PAGES`, and each page's own `SECTIONS` — plus a
  sitemap test that hardcodes the public route list and will silently drift.
- **No memoization where it matters:** `SummaryCards` (sticky, always visible)
  recomputes `summaryStats` on every keystroke; MarginCharts and WeeklySales
  likewise call analytics in render bodies.

### 1.4 Test and tooling gaps

- **No CI, no hooks, no verify script.** The only automated gate is Vercel's
  build (`tsc -b`). Lint and tests run only when someone remembers. Prettier is
  configured but wired to nothing.
- **Every test runs in three real browsers** (chromium, firefox, webkit) —
  including pure function tests for parsers and math, which is pure overhead.
- **Coverage is lopsided:** persistence, import parsing, analytics, and the
  SettingsContext sync contract are genuinely well tested (~3,200 test lines).
  But: public pages have zero tests except ContactForm; `ImportData` (the CSV
  upload flow) has none; `EventsTable` has no direct test and the
  `overrideMarket` merge branch is uncovered; `TransactionHistory` has one; a
  dozen admin components have none.
- **No test touches real Postgres.** RLS policies, grants, CHECK constraints,
  cascades, and `is_admin()` are entirely unverified — `settingsRepo` is tested
  against a stub that never rejects. Migrations are never test-applied.
- `noImplicitAny: false` in `tsconfig.app.json`.

### 1.5 Stale and dead artifacts (all small, all cheap)

| Artifact                               | Problem                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ImportData.tsx:109`                   | "Remember to Save to cloud to keep it." — no such control exists; saving is automatic                                                                                                                                                                                                                                          |
| `ProfitCalculator.tsx:171`             | "Edits save to this browser automatically." — edits save to Supabase                                                                                                                                                                                                                                                           |
| `RequireAdmin.tsx:9–10`                | Comment claims "The settings API independently verifies the access token server-side" — **no such API exists**; RLS is the boundary. The conclusion is right, the stated reason is fiction that could be trusted during a future refactor                                                                                      |
| `defaults.ts` (216 lines)              | Production-dead: imported by 12 test files and nothing else (empty DB now shows an error rather than seeding)                                                                                                                                                                                                                  |
| Orphaned `__screenshots__/` dirs       | For deleted/renamed tests (`AdminDashboard.test.tsx`, `storage.test.ts`, the old "seeds the defaults" SettingsContext test)                                                                                                                                                                                                    |
| `20260727000000_initial_schema.sql:23` | `revoke execute on function public.is_admin() from anon` is likely a no-op — Postgres grants EXECUTE to `PUBLIC` by default and revoking from one role doesn't remove the inherited PUBLIC grant. Harmless in practice, but it reads as a lock that isn't engaged; `revoke ... from public` + explicit grant is the real thing |
| `BACKEND_ARCHITECTURE.md` §2           | Still says "two pieces of dead code imply security that doesn't exist (§9)" — those pieces (`/enter-password`, `Order.tsx`) were already deleted in commit `7a42e01`; the cross-reference dangles                                                                                                                              |
| Import style                           | 19 relative `../` imports inside `dashboard/` vs `@/` alias everywhere else                                                                                                                                                                                                                                                    |

---

## 2. Target architecture

### 2.1 Directory split: `src/site/` · `src/admin/` · `src/shared/`

```
src/
├── main.tsx            # composition root — the ONLY file importing both sides
├── site/               # PUBLIC website (bulgogibillys.com)
│   ├── App.tsx         # public layout shell (today's src/App.tsx)
│   ├── routes.ts       # public route manifest (new)
│   ├── pages/          # home, menu, schedule, order-now, contact, blog, about, not-found
│   └── components/     # RestaurantStructuredData, (icons if public-only)
├── admin/              # PRIVATE dashboard — everything behind RequireAdmin
│   ├── routes.ts       # admin route manifest (new)
│   ├── AdminLayout.tsx, AdminLogin.tsx, AuthCallback.tsx, RequireAdmin.tsx, SettingsContext.tsx
│   ├── pages/          # ProfitCalculator, TransactionHistory, Events
│   ├── components/     # editors, tables, charts, shell, nav, fields (+ ui/ primitives later)
│   ├── domain/         # pure logic: calculations, salesAnalytics, eventAnalytics, types
│   ├── data/           # supabase client + per-domain repos (settingsRepo → split over phases)
│   └── import/         # parseTransactionsCsv, mergeTransactions
├── shared/             # imported by BOTH sides — kept deliberately small
│   ├── catalyst-ui-kit/
│   ├── PageMeta.tsx    # genuinely bidirectional (6 public + 4 admin importers, exports BASE_URL)
│   ├── dark-mode-toggle/
│   └── theme.ts
└── test/               # renderWithProviders, setup, sitemap test, fixtures/ (new home of defaults.ts)
```

File-by-file mapping (moves only — no renames or refactors during the move):

| Current                                                                                           | Target                                                                                                  |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/App.tsx`, `src/App.css`                                                                      | `src/site/`                                                                                             |
| `src/pages/{home,menu,schedule,order-now,contact,blog,about,not-found}/**`                        | `src/site/pages/**`                                                                                     |
| `src/components/RestaurantStructuredData.tsx`                                                     | `src/site/components/`                                                                                  |
| `src/components/icons/*`                                                                          | `src/site/components/icons/` if only public imports them; else `src/shared/icons/` (check at move time) |
| `src/components/PageMeta.tsx` (+test)                                                             | `src/shared/`                                                                                           |
| `src/components/dark-mode-toggle/*`                                                               | `src/shared/dark-mode-toggle/`                                                                          |
| `src/components/catalyst-ui-kit/*`                                                                | `src/shared/catalyst-ui-kit/`                                                                           |
| `src/lib/theme.ts`                                                                                | `src/shared/theme.ts`                                                                                   |
| `src/lib/supabase.ts`                                                                             | `src/admin/data/supabase.ts`                                                                            |
| `src/pages/admin/{AdminLayout,AdminLogin,AuthCallback,RequireAdmin,SettingsContext}.tsx` (+tests) | `src/admin/`                                                                                            |
| `src/pages/admin/dashboard/persistence/*`                                                         | `src/admin/data/`                                                                                       |
| `src/pages/admin/dashboard/import/*`                                                              | `src/admin/import/`                                                                                     |
| `src/pages/admin/dashboard/{calculations,salesAnalytics,eventAnalytics,types}.ts` (+tests)        | `src/admin/domain/`                                                                                     |
| `src/pages/admin/dashboard/defaults.ts`                                                           | `src/test/fixtures/defaultSettings.ts` (test-only fixture)                                              |
| `src/pages/admin/dashboard/{ProfitCalculator,TransactionHistory,Events}.tsx` (+tests)             | `src/admin/pages/`                                                                                      |
| `src/pages/admin/dashboard/*.tsx` (everything else)                                               | `src/admin/components/`                                                                                 |

Two placement decisions worth calling out:

- **The Supabase client and all repos live _inside_ `src/admin/data/`**, not a
  top-level `src/data/`. This deliberately refines `BACKEND_ARCHITECTURE`'s
  "`src/data/<domain>.ts`" convention: §8 of that doc guarantees public code
  never touches the database at runtime (build-time publishing for menu prices,
  serverless functions for public writes), so the browser data layer _is_ admin
  code — and putting it inside the boundary makes "the public site cannot ship
  supabase-js" a lint-enforced fact rather than a bundle-inspection observation.
  When a public feature someday needs data, it gets it from a build step or a
  Vercel Function, never from this directory.
- **`src/shared/` stays small on purpose.** Anything that _could_ live on one
  side does. The test for admission is "both sides genuinely import it today,"
  which currently admits exactly four things: the UI kit, PageMeta, the
  dark-mode toggle, and theme.ts.

### 2.2 Boundary enforcement: ESLint `no-restricted-imports`, nothing heavier

Four small blocks in `eslint.config.js`:

- `files: ["src/site/**"]` → error on importing `@/admin/*`
- `files: ["src/admin/**"]` → error on importing `@/site/*`
- `files: ["src/shared/**"]` → error on importing `@/admin/*` **and** `@/site/*`
- Repo-wide: error on parent-relative imports (`../*`) — everything uses the
  `@/` alias, permanently fixing today's 19 stragglers

`src/main.tsx` sits outside all three globs, so the composition root needs no
exemption machinery. Rejected alternatives, deliberately:
`eslint-plugin-boundaries` (a dependency for what four config blocks do) and a
TS project-reference split of `src` (build-graph ceremony a solo maintainer will
fight; the existing `tsconfig.json → app/node` references stay as-is). Also in
this bucket: turn on `noImplicitAny` if the resulting error count is small;
otherwise defer it to a standalone chore so it never blocks a phase.

### 2.3 Route manifests: one source of truth per side

- `src/site/routes.ts` — `{ path, Component, title }` for the 8 public pages;
  consumed by `main.tsx` and by the sitemap test (which today hardcodes the list
  and will drift).
- `src/admin/routes.ts` — `{ path, label, Component }` for the 3 admin pages;
  consumed by `main.tsx` and `AdminTopNav` (deleting its hardcoded `PAGES` array
  — the current second source of truth).
- Later (Phase 6): `AdminLayout` renders `DashboardShell` once with the route
  manifest, so pages become content-only and adding an admin page = one manifest
  entry.

---

## 3. Persistence refactor (BACKEND_ARCHITECTURE §7, made concrete)

Five steps, strictly sequenced, each independently shippable with zero behavior
change. The whole-state optimistic sync engine (`SettingsContext.tsx` — 800 ms
debounce, coalescing save loop, backoff retry, crash journal) is **not
rewritten**; it's explicitly endorsed by the architecture doc and well-tested.
It ends up owning only what it's good at: the 6-table config document.

### B1 — Generated DB types

- Add
  `"db:types": "supabase gen types typescript --local > src/admin/data/database.types.ts"`.
- In `rows.ts`, replace the 12 hand-written `*Row` interfaces with aliases:
  `type IngredientRow = Database["public"]["Tables"]["ingredients"]["Row"]`,
  etc. `settingsToRows`/`rowsToSettings` stay untouched.
- Check-constrained enums generate as `string`; replace today's unchecked `as`
  casts with tiny assertion functions (`assertMarket(s): asserts s is Market`)
  at the rows boundary — the one place drift could still hide, now
  runtime-checked.
- Regenerating types becomes part of every future migration's definition of
  done.
- **Gate:** `tsc -b` green (this step _is_ the test — any hand-type/schema
  mismatch surfaces at compile time); `rows/diff/settingsRepo` tests green
  unchanged.

### B2 — `market_overrides` pagination fix

- Route it through `fetchAllRows` like the other growing tables (requires
  parameterizing that function's hardcoded `date` sort column — also removes a
  footgun for future callers).
- **Gate:** settingsRepo test extended with a >1000-row overrides stub asserting
  all pages load.

### B3 — Extract `transactionsRepo`

1. **Pin behavior first:** write the missing `ImportData` component test (CSV →
   preview → confirm → asserted upsert payload with `ignoreDuplicates`) and a
   `TransactionHistory` characterization test.
2. Create `src/admin/data/transactions.ts`: `fetchAllTransactions()` (the paged
   read moves here) and `importTransactions(rows)` (the insert-only upsert moves
   here). The code already exists; it moves.
3. Add a `TransactionsProvider`/`useTransactions()` beside `SettingsProvider` in
   `AdminLayout` — same load-once-into-memory UX as today, just outside the
   Settings blob. The analytics functions already take transactions as
   arguments; pages pass them from the new hook.
4. Remove `transactions` from `Settings`, `diff.ts`, `rows.ts` — and thereby
   from the localStorage journal, eliminating the quota risk of serializing
   thousands of transactions on every dirty `pagehide`.
5. `ImportData` calls `importTransactions` directly (await + refresh) instead of
   routing an import through the autosave diff; its stale copy is fixed in the
   same change since the copy describes the old flow.

- **Gate:** updated SettingsContext contract tests green; new import tests
  green; verify-skill runtime pass of Import + Transaction History + Events
  (Events consumes transactions for contribution).

### B4 — Extract events + operational records

- `src/admin/data/events.ts` (events, market_settings) and
  `src/admin/data/operations.ts` (purchases, market_overrides, processor_fees).
  Per-row `upsert`/`delete`, plain awaited calls; the in-memory optimistic
  pattern the pages rely on is preserved (state updates immediately, the awaited
  row write replaces the debounced diff), and the existing sync-status UI
  reports in-flight state.
- **Prerequisite:** pin `EventsTable.overrideMarket`'s expense-row-summing merge
  with a unit test _before_ touching it — the branch is uncovered today.
- Remove events/purchases/overrides/fees from `Settings`, `diff.ts`, `rows.ts`.
  `Settings` is now purely the 6-table config document; `fetchSettings()` is 6
  small tables (fast, as §7 promises); the crash journal is config-only.
- **Gate:** Events page characterization tests green; verify-skill runtime pass.

### B5 — `apply_config(jsonb)` RPC: atomic config saves

- New migration:
  `create function public.apply_config(config jsonb) returns void language plpgsql security invoker`
  — upserts `settings`, rewrites `ingredients` / `batch_lines` / `menu_items` /
  `variants` / `recipe_lines` inside the function's single transaction.
  `security invoker` so RLS still gates it; execute granted to `authenticated`
  only.
- The config save in `settingsRepo` becomes one
  `supabase.rpc("apply_config", …)` call with `settingsToRows` output. `diff.ts`
  collapses to a config dirty-check (after B3/B4 that's all it has left). The
  partial-save window acknowledged in the file header closes for good —
  transactionality without a server or an ORM.
- **Gate:** the new db test tier (§5.3) asserts atomicity — inject a constraint
  violation mid-payload, assert the previous config is fully intact;
  SettingsContext tests green with the stub updated to the RPC shape.

**Standing convention from here on** (unchanged from BACKEND_ARCHITECTURE §7):
every new domain — catering inquiries, preorders, KPI snapshots, inventory —
gets its own `src/admin/data/<domain>.ts` from day one and never enters the
Settings blob.

---

## 4. Admin frontend cleanup, prioritized

Not everything needs doing. High-value items below are in the roadmap (Phase
4/6); medium items are opportunistic; the "skip" list is deliberate.

**High value:**

1. **`settingsMutations.ts`** (`src/admin/domain/`): extract ProfitCalculator's
   ~145 lines of pure state reducers and EventsTable's 4 mutators (including
   `overrideMarket`) as pure `(settings, args) => Settings` functions with node
   unit tests. Then bless **one** convention: components call `useSettings()`
   and apply mutators — deleting both the `setSettings`-drilling (4 components)
   and the 6-callback drilling (ProfitCalculator).
2. **EventsTable decomposition:** `AddEventDialog.tsx` + `EventRow.tsx` + a lean
   `EventsTable.tsx`, mutators already gone to the mutations module. Rides Phase
   4 since B4 changes the file anyway.
3. **Shared admin primitives** in `src/admin/components/ui/`: `Card` (kills the
   15× repeated class string), `StatCard` (out of SummaryCards), `charts/theme`
   (ChartCard/ChartTooltip/ chartTheme out of MarginCharts), `labels.ts`
   (MARKET_LABELS out of the pure analytics engine, CATEGORY_LABELS out of
   PurchasesEditor), `format.ts` (formatCurrency/formatPercent out of
   calculations.ts), `units.ts` (splitUnits/joinUnits out of DualUnitField).
4. **Route manifest as single source of truth** (§2.3) + chrome moves from
   per-page `DashboardShell` into `AdminLayout`.
5. **Targeted memoization:** `useMemo` around
   `allCombinations`/`summaryStats`/`weeklyStats` in
   MarginCharts/SummaryCards/WeeklySales. Policy: memoize derived analytics at
   the page/section level only; no blanket `React.memo`.

**Medium value (opportunistic, when touching the file anyway):**

6. **SyncStatusBar split** into `ProteinSelector` + `SyncStatus` +
   `LogoutButton` — an auth control currently lives in a sync-status component.
7. **`EditorTable` primitive** generalizing the shape
   Purchases/ProcessorFees/Events tables share (header + Add + per-row Remove +
   empty state + newest-first sort). Justified by the roadmap: catering
   inquiries (P1.4), inventory (P3.2), and KPI inputs all want exactly this.
8. **Catalyst `Field`/`Label` adoption** — only when touching a file, never as a
   big-bang restyle; visual regressions are the enemy of the zero-regression
   rule.

**Skip for now:** renames for their own sake; restructuring
`useActiveSection`/`useIsDarkMode`; any change to the math in `calculations.ts`
beyond the formatter extraction.

---

## 5. Testing plan — the zero-regression machinery

### 5.1 Vitest `projects`: three tiers

Replace the single 3-browser config with a root config defining:

| Project   | Environment                                           | Runs                                                | Contents                                                                                                                           |
| --------- | ----------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `unit`    | node (near-instant)                                   | every `verify.sh`                                   | calculations, salesAnalytics, eventAnalytics, diff, rows, journal (localStorage stub), CSV parse/merge, settingsMutations, sitemap |
| `browser` | the existing chromium+firefox+webkit playwright setup | every `verify.sh`                                   | component/integration tests only: SettingsContext, pages, editors, forms                                                           |
| `db`      | node + local Supabase (Docker)                        | `verify.sh --db`, and before any phase touching SQL | RLS matrix, apply_config, migrations, cascades                                                                                     |

Pure functions currently run in three real browsers for no benefit; the split
makes the fast tier fast enough to run constantly.

### 5.2 `./verify.sh` — the gate

Run manually before pushing (deliberate choice: no hook, no CI — see preamble).
Stages:

```
1. eslint .                      (includes the boundary rules)
2. prettier --check .            (finally wired to something)
3. tsc -b                        (typecheck)
4. vitest run --project unit
5. vitest run --project browser
6. [--db flag] supabase running? → vitest run --project db
7. [--dist flag] npm run build → assert public entry chunk contains no supabase-js/recharts
```

Each stage prints a clear pass/fail line so the script can be lifted verbatim
into a GitHub Actions workflow the day PRs start. New `package.json` scripts
riding along: `typecheck`, `format:check`, `test:unit`, `test:db`, `db:types`.

### 5.3 The `db` tier (new capability — nothing tests real Postgres today)

Runs against the local Supabase stack (same Docker setup the verify skill uses):

- **RLS matrix, every table:** anon client denied select/insert/update/delete; a
  signed-in **non-admin** user denied (exercises `is_admin()` and the
  never-exercised `admin_users` policy); the admin allowed.
- **`apply_config`:** happy path; atomicity on injected failure; anon RPC
  denied.
- **Migrations:** `supabase db reset` applies the full chain from scratch,
  exit 0.
- **Cascade/constraint spot checks** the PostgREST stub can't see
  (batch_lines/recipe_lines FK cascades, check constraints).

### 5.4 Characterization-first rule

Before each phase, pin current behavior; the phase lands only when the pinned
tests pass unmodified (mechanical import-path updates excepted):

| Before           | Pin                                                                                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 (moves)  | Public-page smoke tests (render each of the 8 site pages, assert PageMeta title — currently zero public-page tests except ContactForm); dist-chunk assertion that the public bundle stays admin-free |
| Phase 3 (B3)     | ImportData flow test + TransactionHistory characterization test                                                                                                                                      |
| Phase 4 (B4)     | `overrideMarket` expense-merge unit test (becomes the extracted mutator's test)                                                                                                                      |
| Phase 5 (B5)     | SettingsContext save-shape test; db-tier atomicity test written to _fail_ against sequential writes and _pass_ against the RPC                                                                       |
| Phase 1, ongoing | Sitemap test rewritten to consume `src/site/routes.ts` — route drift becomes impossible                                                                                                              |

### 5.5 Definition of done, per phase

1. `./verify.sh` green (with `--db` where the phase touches SQL).
2. Verify-skill runtime pass of every touched page (local Supabase + Playwright,
   screenshots for anything visual).
3. `--dist` assertion green when the phase could affect bundling.
4. Then push — each phase is a normal Vercel deploy with instant rollback if
   anything slips.

---

## 6. Phased roadmap

| #   | Phase                                      | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Size                          | Depends on                                    | Status               |
| --- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------- | -------------------- |
| 0   | **Safety net + quick wins**                | `verify.sh`; vitest projects split; new scripts; copy fixes (`ImportData.tsx:109`, `ProfitCalculator.tsx:171`); `RequireAdmin.tsx` comment corrected to name RLS as the boundary; delete orphaned `__screenshots__` dirs; `defaults.ts` → `src/test/fixtures/` (update the two "keep in sync" comments in `seed.sql` and the events migration); migration replacing the no-op `revoke … from anon` with `revoke … from public` + explicit `authenticated` grant; normalize the 19 relative imports; fix the dangling §2/§9 references in BACKEND_ARCHITECTURE.md | 1–2 days                      | —                                             | ✅ Done (Aug 1 2026) |
| 1   | **Boundary restructure**                   | `git mv` per the §2.1 mapping (moves only); ESLint boundary rules; `site/routes.ts` + `admin/routes.ts` consumed by `main.tsx`; manifest-driven sitemap test; public-page smoke tests; dist-chunk assertion                                                                                                                                                                                                                                                                                                                                                      | 1–2 days                      | 0                                             | ✅ Done (Aug 1 2026) |
| 2   | **Generated types + pagination**           | B1 + B2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 0.5–1 day                     | 0 (1 first is recommended so paths are final) | ✅ Done (Aug 5 2026) |
| 3   | **transactionsRepo**                       | B3 — natural to ride ROADMAP 0.1 follow-up work, which touches transactions anyway                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | 2–3 days                      | 2                                             | ✅ Done (Aug 5 2026) |
| 4   | **eventsRepo + EventsTable decomposition** | B4 + settingsMutations (events side) + EventsTable split                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 2–3 days                      | 3                                             | —                    |
| 5   | **apply_config RPC**                       | B5 + diff.ts collapse + config-only journal + db-tier atomicity tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 1–2 days                      | 3, 4                                          | —                    |
| 6   | **Admin UI consolidation**                 | settingsMutations (ProfitCalculator side); `ui/` primitives (Card, StatCard, chart theme, labels, format, units); chrome into AdminLayout; targeted memoization; then items 6–8 opportunistically                                                                                                                                                                                                                                                                                                                                                                | 2–4 days, splittable per item | 1; independent of 2–5                         | —                    |

- Phases 2–5 are strictly sequential. Phase 6 can interleave anywhere after
  Phase 1.
- Every phase is behavior-preserving except the explicitly listed copy fixes in
  Phase 0.
- Each phase is sized for solo work in spare hours and ships independently —
  there is no big-bang moment, and the app is deployable after every phase.

---

## 7. Why this structure absorbs "unexpected feedback requests"

The flexibility goal, made concrete:

- **A new admin domain** (catering inquiries, inventory, KPI snapshots, preorder
  tracking) = one migration + `npm run db:types` +
  `src/admin/data/<domain>.ts` + pure logic in `src/admin/domain/` + a page
  registered in `src/admin/routes.ts` (nav and shell come free) +
  `EditorTable`/`Card`/`StatCard` for the UI. No touch of the sync engine, no
  Settings-blob growth — and at P3, family roles become an RLS policy change
  against per-domain repos, not a repo rewrite.
- **A new public page** = a folder in `src/site/pages/` + one `routes.ts` entry
  (sitemap updates itself). The boundary lint proves at a glance that the change
  cannot affect the dashboard, and the dist assertion proves it ships no admin
  weight — the "changes only affect the public part" property, enforced rather
  than implied.
- **Schema changes surface at compile time** (generated types), **behavior
  changes surface in `verify.sh`** (three tiers), and **copy/UX tweaks stay
  cheap** because chrome, labels, formatters, and cards each live in exactly one
  place.
- **Feedback that crosses the boundary** (e.g. "publish menu prices on the
  site") already has a prescribed shape — build-time publishing per
  BACKEND_ARCHITECTURE §8 — and the structure makes the wrong shape (public page
  importing admin data code) a lint error instead of a code review catch.

---

## 8. Immediate next action

Phase 4 (B4, extract events + operational records, plus the EventsTable
decomposition it unlocks). **Prerequisite per §5.4: pin
`EventsTable.overrideMarket`'s expense-row-summing merge with a unit test before
touching it — that branch is uncovered today.** Phases 0–3 all landed by Aug 5
2026: the safety net (`verify.sh`, vitest split, grants migration), the boundary
restructure (`src/site` · `src/admin` · `src/shared`, ESLint boundary rules,
route manifests, smoke tests), generated DB types (`npm run db:types`, part of
every migration's definition of done) + paged `market_overrides`, and the
transactions extraction (`src/admin/data/transactions.ts` +
`TransactionsContext`; transactions no longer ride the Settings blob, the
autosave diff, or the crash journal).
