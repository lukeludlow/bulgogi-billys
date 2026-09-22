# Online Ordering & Native Payments — Phased Plan

A phased plan to replace the `/order-now` placeholder with a native payment flow
built on the **Square Web Payments SDK** and **Vercel serverless functions**.
Written August 2026 against the current codebase, after a survey of `src/`,
`supabase/`, `vercel.json`, and the test suite. Every file citation below was
verified directly.

This plan sits between its two siblings: [ROADMAP.md](ROADMAP.md) says _what_ to
build and in what business order;
[BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) already decided _how_ a
public money-handling feature must be shaped (no server, serverless functions,
no browser-to-database writes). This document sequences those decisions into
shippable phases, and records the two places where reality has moved since they
were written. [REFACTOR_PLAN.md](REFACTOR_PLAN.md) supplies the working method —
characterization-first, one gate per phase — which is reused verbatim in §6.

Each phase is sized for solo work in a short session and ships independently.
There is no big-bang moment: the app is deployable after every phase, and no
customer sees a payment form until Phase 5.

---

## 1. Why this jumps the roadmap queue

[ROADMAP.md](ROADMAP.md) is explicit, and this plan does not pretend otherwise:

> **No online-ordering buildout in P0/P1.** The plan repeatedly warns against
> expansion before free cash flow exists; catering and preorders come first.

Real online ordering is item **3.1** (months 6–18), gated on §26 rule #9 — "new
locations must prove themselves before permanent equipment is purchased." Market
preorders are **2.1**, and the roadmap suggests starting them with Square
payment links.

The resolution is that **2.1 and 3.1 need the same machinery**. A preorder taken
on the website and a full online order are the same request shape: a
server-priced cart, a Square payment, a signed webhook, an order record, and a
notification to Billy. Payment links would be a throwaway detour that still
leaves that machinery unbuilt.

So Phases 0–6 build shared infrastructure and ship nothing customer-facing
except menu prices (a standing P1 item). **The product decision — launch as
preorders or as full ordering — is deferred to Phase 8**, made with the
infrastructure already proven and behind a feature flag either way. That keeps
the growth plan's sequencing intact: nothing goes live until Billy decides it
should.

Two supporting points from the growth plan: §8.4 names Luke's responsibilities
as including "improving online ordering and catering inquiries," and §4.3 lists
online ordering among the business's intended future offerings. The gate is on
_launching_ it, not on being ready for it.

---

## 2. What changed since the sibling docs were written

Both sibling docs predate the payments migration, and both are now misleading on
one point each.

### 2.1 The business migrated from SwipeSimple to Square

The `transactions` table, `src/admin/import/parseTransactionsCsv.ts`,
`mergeTransactions.ts`, and `src/admin/components/ImportData.tsx` were built to
ingest **SwipeSimple** CSV exports, because SwipeSimple had no usable API. The
code, `README.md`, and ROADMAP's "what we already have" table all describe this
as the "Square CSV import" — that label is wrong and predates the migration.

Now that the business runs on Square, ingestion moves to the Square API and the
CSV path is deleted (Phase 7). The naming is corrected at the same time.

### 2.2 Square becomes the catalog master

Billy edits items and prices in the Square Dashboard, and they flow through to
the site. This inverts today's arrangement, where the priced catalog lives in
Supabase (`menu_items` → `variants.sell_price`) and is edited in the admin
Profit Calculator.

This has a consequence that is easy to miss: `variants.sell_price` is not just a
menu price. It feeds contribution margin and break-even in
`src/admin/domain/calculations.ts`, and `recipe_lines` is keyed by
`(item_id, variant_id)`. Square owning prices therefore means the local tables
become a **mirror keyed by Square object IDs**, with recipe and cost data —
which Square has no concept of — staying local and hanging off the Square
variation ID. That is Phase 3, and it is the riskiest change in this plan.

---

## 3. Decisions baked in

| Decision              | Choice                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------- |
| **Sequencing**        | Payment infrastructure first, behind a feature flag; preorder-vs-ordering decided at Phase 8 |
| **Catalog master**    | Square, mirrored into Supabase and refreshed by the `catalog.version.updated` webhook        |
| **Profit Calculator** | Recipes re-keyed to Square variation IDs; name and price become read-only + "Edit in Square" |
| **Sales ingestion**   | Square API sync replaces CSV upload; the importer is deleted, the analytics are kept         |
| **Fulfillment**       | `/admin/orders` page, Square Orders API into Billy's POS, and a Twilio SMS alert             |
| **Customer accounts** | None — guest checkout. `admin_users` stays the only identity table                           |

**Rejected alternatives, deliberately:**

- _Square Catalog read live on every request._ Simpler, no sync code, but it
  leaves no stable local key for `recipe_lines` to reference, and a Square API
  outage would take the public menu down with it.
- _Build-time catalog snapshot + deploy hook_ (what BACKEND_ARCHITECTURE §8.1
  prescribes). Zero runtime cost, but prices and sold-out state lag until a
  redeploy — unusable for live ordering. See §4.2.
- _Full deprecation of the `transactions` table_ in favor of Square's built-in
  reporting. Square reports sales; it does not produce per-market cash
  contribution (§17.1), the five-way market classification (§17.2), pre-tax
  separation (§13.2), or the 3%/2% reserve ladder — all of which shipped in P0
  and are the dashboard's reason for existing.

---

## 4. Architecture

### 4.1 The request shape (BACKEND_ARCHITECTURE §8.2, binding)

Every public write follows the rule that doc already set:

> browser → serverless function → Turnstile + validation + rate limit →
> service-role insert into an insert-only table

with its money-specific corollary, which this plan treats as non-negotiable:
**the server computes prices from the catalog mirror; client-submitted amounts
are never trusted; Square webhooks land on a function that verifies
signatures.**

The client tells the server _which variation IDs and quantities_ it wants. It
never tells the server what they cost. The payment amount is recomputed
server-side immediately before `CreatePayment`, and the **webhook — not the
browser's response — is what marks an order paid.**

### 4.2 Amendment to BACKEND_ARCHITECTURE §8.1

§8.1 currently says public menu data should be snapshotted into the static
bundle at build time, and that runtime public reads should be avoided. It also
anticipates its own exception: "If runtime public reads ever become necessary
(P2 preorders), expose a dedicated public view containing only public columns."

**This plan takes that exception.** Live ordering needs current prices and
availability without a redeploy. The replacement rule:

- Public catalog reads go through **`/api`**, which reads the mirror with the
  service-role key and returns only public columns.
- **No anon RLS policies are added to any table, ever.** RLS filters rows, not
  columns, so an anon policy on `menu_items`/`variants` would leak cost and
  margin data (§10 risk #4). This is unchanged and remains absolute.

§8.1 should be amended in place in Phase 0 to point here.

### 4.3 Constraints this repo imposes

These are the ways a plausible-looking implementation breaks the build:

- **`vercel.json` currently swallows `/api`.** The SPA rewrite source is
  `/((?!@vite|@react-refresh|@id|@fs|.*\..*).*)`. The negative lookahead
  excludes paths containing a dot; `/api/orders/quote` has no dot, so it matches
  and is rewritten to `index.html`. The rewrite must exclude `api` before any
  function is reachable.
- **`api/` belongs to no TypeScript project.** `tsconfig.app.json` includes
  `src` only, `tsconfig.node.json` includes the config files and
  `supabase/tests`. A third project reference is needed or `npm run build` will
  not typecheck the functions at all.
- **The public bundle is guarded.** `./verify.sh --dist` greps the built entry
  chunk for `GoTrueClient` and `CartesianGrid` and fails if either appears. A
  public ordering page must therefore **never** import
  `@/admin/data/supabase.ts`. All customer-facing data comes from `/api`.
- **Load the Square SDK from Square's CDN.** `web.squarecdn.com` via a
  `<script>` tag, not npm — Square requires it for PCI scope, and it keeps the
  SDK out of the bundle the guard inspects.
- **ESLint boundaries are enforced.** `src/site/**` cannot import `@/admin/**`.
  Cart and checkout types go in `src/shared/`, not `src/admin/domain/`.
- **Routes are manifest-driven.** A new public route is one `SITE_ROUTES` entry
  in `src/site/routes.ts` _plus_ a `public/sitemap.xml` update —
  `src/test/sitemap.test.ts` cross-checks them. Checkout routes are
  `indexable: false`. A new admin page is one `ADMIN_ROUTES` entry in
  `src/admin/routes.ts`; keep the `lazy()` wrapper or the public bundle picks up
  supabase-js.
- **Every migration ends with `npm run db:types`.** Standing rule from
  REFACTOR_PLAN B1.
- **New domains never join the `Settings` blob.** Each gets its own
  `src/admin/data/<domain>.ts` from day one (BACKEND_ARCHITECTURE §7).

### 4.4 Tax-inclusive pricing — verify before anything reads a price

Menu prices **include** sales tax (§4.2: $11 / $14 / $17 / $24 for the four fry
and rice sizes, $6 and $15 for tacos), and the dashboard backs the 8.25% out via
`Settings.salesTaxRatePercent` to get pre-tax revenue.

If Square's catalog is configured to _add_ tax on top, every online order
double-taxes the customer. Square must be set to tax-inclusive pricing, and this
is a **hard gate on Phase 1** — before any code reads a price, not after.
Relatedly, §22.3 warns against changes that violate card-network rules, so no
surcharging or fee pass-through on the online channel.

### 4.5 Secrets — the repo's first

There are none today. The only existing public POST is
`src/site/pages/contact/ContactForm.tsx`, which ships a Web3Forms access key in
the client bundle; that is not a precedent to follow.

| Variable                       | Side   | Notes                                    |
| ------------------------------ | ------ | ---------------------------------------- |
| `VITE_SQUARE_APPLICATION_ID`   | Client | Safe to expose; required by the Web SDK  |
| `VITE_SQUARE_LOCATION_ID`      | Client | Safe to expose                           |
| `SQUARE_ACCESS_TOKEN`          | Server | **Never** `VITE_`-prefixed               |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Server | Webhook signature verification           |
| `SUPABASE_SERVICE_ROLE_KEY`    | Server | The function layer is its only holder    |
| `TWILIO_*`                     | Server | Account SID, auth token, from/to numbers |
| `TURNSTILE_SECRET_KEY`         | Server | Site key is public                       |

Server variables are Vercel environment variables only, never in the repo (§10
risk #6). Phase 0 also adds the `.env.example` the repo currently lacks.

### 4.6 Paid tiers

BACKEND_ARCHITECTURE §5: the Supabase free tier pauses after 7 days idle, which
becomes a customer-facing outage the moment money depends on the database at
runtime. **Supabase Pro and Vercel Pro must both be active before Phase 5 ships
publicly** — this is the trigger §9 of that doc already defined for P2.

---

## 5. Data model

New tables, all with RLS enabled and an admin-only policy matching the existing
`is_admin()` pattern. No anon policies.

- **`square_catalog_items`** / **`square_catalog_variations`** — the mirror,
  keyed by Square object IDs, carrying name, price, description, sold-out state,
  and the Square catalog version.
- **`variants.square_variation_id`** — a new column linking the existing cost
  model to its Square counterpart (Phase 3).
- **`orders`** — insert-only for the function layer: pickup market and slot,
  customer name and phone, status, Square order and payment IDs, totals.
- **`order_items`** — line items captured at **server-computed** prices, so an
  order's history survives a later price change in Square.

Status flow: `new → prepping → ready → picked_up`, plus `cancelled`.

---

## 6. Testing and definition of done

`CLAUDE.md` requires tests for everything testable, and the tier is chosen by
file extension — see REFACTOR_PLAN §5.1.

### 6.1 A fourth test tier

`vitest.config.ts` has three projects (`unit`, `browser`, `db`). Serverless
functions are Node code with no DOM, so they need a fourth: **`api`**, node
environment, `api/**/*.test.ts`, with a matching stage added to `./verify.sh`.

Square is stubbed at the module boundary using the repo's existing idiom
(`vi.mock` of the client module, as `src/test/postgrestStub.ts` does for
PostgREST), against checked-in fixtures captured from the Square sandbox. No
test ever calls Square over the network.

### 6.2 Characterization-first (REFACTOR_PLAN §5.4)

| Before  | Pin                                                                   |
| ------- | --------------------------------------------------------------------- |
| Phase 2 | Menu page renders its three items with current copy and images        |
| Phase 3 | `calculations.ts` margins and break-even; `MenuItemEditor` edit flows |
| Phase 7 | `salesAnalytics` / `eventAnalytics` output for a known week, pre-swap |

The phase lands only when the pinned tests pass unmodified.

### 6.3 Definition of done, per phase

1. `./verify.sh` green — with `--db` where the phase touches SQL, and `--dist`
   where it could affect bundling.
2. Verify-skill runtime pass of every touched page (local Supabase + Playwright,
   per `.claude/skills/verify/SKILL.md`), mobile 390 and desktop 1440.
3. For Phases 5–7, a Square **sandbox** transaction driven end to end.
4. Then push — each phase is a normal Vercel deploy with instant rollback.

---

## 7. The phases

### Phase 0 — Serverless foundation

Plumbing only; nothing business-facing.

- Create `api/` with one trivial health function. Amend `vercel.json` to exclude
  `api` from the SPA rewrite (§4.3) — without this, nothing else in this plan is
  reachable.
- Add the third TypeScript project reference for `api/`.
- Add the `api` Vitest project and the matching `./verify.sh` stage.
- Register a Square application; capture sandbox credentials and a catalog
  response fixture. Add `.env.example`.
- Amend BACKEND_ARCHITECTURE §8.1 to point at §4.2 here, and add a ROADMAP
  cross-link from items 2.1 and 3.1.
- **Why now:** every later phase assumes a function can be deployed,
  typechecked, and tested. This proves all three with nothing at stake.
- **Gate:** the deployed function returns 200 in production; `./verify.sh` green
  with the new stage.

### Phase 1 — Catalog mirror

Square becomes the master.

- Migration for `square_catalog_items` / `square_catalog_variations`; then
  `npm run db:types`.
- `api/catalog/sync.ts` pulls the Square Catalog;
  `api/webhooks/square-catalog.ts` refreshes it on `catalog.version.updated`,
  verifying the signature.
- `src/admin/data/catalog.ts` as its own domain module (§4.3).
- **Confirm Square is configured for tax-inclusive pricing (§4.4) before
  proceeding.**
- **Builds on:** the repo/`unwrap` idiom in `src/admin/data/postgrest.ts`.
- **Gate:** `./verify.sh --db`; a price edited in the Square Dashboard appears
  in the mirror without a deploy.

### Phase 2 — Public menu prices (ROADMAP 1.3)

The first customer-visible improvement, and a standing roadmap item.

- `api/menu.ts` serves public columns only, with CDN cache headers.
- Rewrite `src/site/pages/menu/Menu.tsx` to render from it, replacing the three
  hardcoded `<MenuItem>` blocks. Keep the existing images and descriptions —
  Square holds price and availability, not the marketing copy.
- **Why now:** §11.2 says the site should show current pricing, and this proves
  the public read path end to end before any money moves through it.
- **Gate:** `./verify.sh --dist` (public page, new data path); menu renders with
  prices on mobile and desktop.

### Phase 3 — Re-key the Profit Calculator

The riskiest change in the plan; isolated into its own phase for that reason.

- Pin `calculations.ts` behavior first (§6.2).
- Migration adding `variants.square_variation_id`, plus a backfill mapping
  today's items to their Square objects.
- `MenuItemEditor.tsx` and the variant price table show name and price read-only
  with an "Edit in Square" link. `ingredients`, `recipe_lines`, and the batch
  model stay local and fully editable — Square has no concept of them.
- Decide how the beef/pork choice (`has_protein`, and the
  `PROTEIN_INGREDIENT_ID` sentinel) maps to Square: modifier lists or separate
  variations. See §9.
- **Gate:** pinned tests pass unmodified; `./verify.sh --db`.

### Phase 4 — Cart and server-priced quotes

Still no payment.

- `orders` / `order_items` migrations, insert-only, service-role writes.
- Cart state local to `src/site/`; shared types in `src/shared/` (§4.3).
- `api/orders/quote.ts` recomputes every total from the mirror.
- Rebuild `/order-now` as a real ordering UI behind a feature flag, using
  Catalyst components per `CLAUDE.md`, mobile-first. Update `public/sitemap.xml`
  for any new route.
- **Gate:** `./verify.sh --db --dist`; a quote for a tampered client payload
  returns the server's price, not the client's.

### Phase 5 — Square Web Payments SDK

The payment flow itself.

- Load the SDK from `web.squarecdn.com`; card plus Apple Pay and Google Pay.
- `api/orders/create.ts` creates a real Square Order via the Orders API, so it
  lands in Billy's POS and in Square's own reporting.
- `api/payments/create.ts` calls `CreatePayment` with an **idempotency key** and
  a server-recomputed amount.
- `api/webhooks/square-payment.ts` verifies the signature and marks the order
  paid. The browser response is a UX convenience; the webhook is the truth.
- Turnstile, honeypot, and function-side rate limiting (§10 risk #5).
- **Gate:** Supabase Pro and Vercel Pro active (§4.6); a sandbox order completes
  end to end and appears in Square; a replayed webhook is idempotent.

### Phase 6 — Fulfillment surface

- `/admin/orders`: one `ADMIN_ROUTES` entry plus a content component —
  `AdminLayout` builds all the chrome. Keep the `lazy()` wrapper.
- `src/admin/data/orders.ts` as its own domain module; status flow per §5.
- Twilio SMS alert fired from the payment webhook, so Billy is notified at a
  loud outdoor market without watching a dashboard. Orders already reach POS
  from Phase 5.
- **Builds on:** `src/admin/components/ui/` primitives (`Card`, `StatCard`,
  `EmptyState`) — reach for these before writing a class string twice.
- **Gate:** `./verify.sh`; runtime pass on mobile 390 (this page gets used on a
  phone, at a tent).

### Phase 7 — Retire the SwipeSimple pipeline

- `api/sales/sync.ts` pulls Square Payments/Orders into `transactions`,
  replacing CSV upload. Backfill history; run both paths against one known week
  and diff before deleting anything.
- Then delete `ImportData.tsx`, `parseTransactionsCsv.ts`,
  `mergeTransactions.ts` and their tests.
- **Keep `salesAnalytics.ts`, `eventAnalytics.ts`, `weeklyReview.ts`, and the
  events page.** Square's built-in analytics does not produce per-market cash
  contribution (§17.1), the §17.2 classifications, pre-tax separation (§13.2),
  or the reserve ladder (§14.1). Only the _ingestion_ path is being replaced.
- Online orders must be tagged to a market/event so event contribution stays
  correct, and must not double-count against the same Square payment.
- Correct the stale "Square CSV" naming in `README.md` and `ROADMAP.md` (§2.1).
- **Gate:** pinned analytics output for a known week is unchanged after the
  swap; `./verify.sh --db`.

### Phase 8 — Launch decision (not a build)

With everything proven and flagged off, Billy decides how it goes live:

- **As market preorders (ROADMAP 2.1, §12.4):** pickup windows tied to the
  existing market schedule, cash collected before the event, better prep
  planning, less waste. This is the roadmap-sanctioned step.
- **As full online ordering (ROADMAP 3.1):** the flag simply opens wider.

Then flip the flag, make `/order-now` indexable, add it to the site nav in
`src/site/App.tsx` (it is currently absent), and start tracking the §27 KPIs —
preorders, average transaction size, website inquiries.

---

## 8. Phase table

| #   | Phase                     | Contents                                                        | Size      | Depends on | Status |
| --- | ------------------------- | --------------------------------------------------------------- | --------- | ---------- | ------ |
| 0   | **Serverless foundation** | `api/` + `vercel.json` fix + tsconfig + `api` test tier + creds | 0.5–1 day | —          | ⏸      |
| 1   | **Catalog mirror**        | Mirror tables, sync + webhook functions, tax-inclusive check    | 1–2 days  | 0          | ⏸      |
| 2   | **Public menu prices**    | `api/menu.ts`; `Menu.tsx` renders live prices (ROADMAP 1.3)     | 0.5–1 day | 1          | ⏸      |
| 3   | **Re-key cost model**     | `square_variation_id` + backfill; price read-only in admin      | 1–2 days  | 1          | ⏸      |
| 4   | **Cart + quotes**         | `orders` tables, cart UI, server-priced quote endpoint          | 2–3 days  | 2, 3       | ⏸      |
| 5   | **Web Payments SDK**      | Orders API, CreatePayment, signed webhook, Turnstile            | 2–3 days  | 4          | ⏸      |
| 6   | **Fulfillment**           | `/admin/orders`, status flow, Twilio SMS                        | 1–2 days  | 5          | ⏸      |
| 7   | **Retire CSV pipeline**   | Square sales sync; delete importer; keep analytics              | 2–3 days  | 5          | ⏸      |
| 8   | **Launch decision**       | Preorder vs full ordering; flag flip; nav + sitemap             | 0.5 day   | 6, 7       | ⏸      |

- Phases 2 and 3 both depend only on Phase 1 and can be done in either order.
- Phase 7 depends on Phase 5 (it needs Square API access and credentials) but
  not on Phase 6, and can interleave.
- Nothing is customer-visible before Phase 2, and no payment form exists before
  Phase 5.

---

## 9. Open questions

- **Sandbox vs production credentials.** Which Square application and location
  ID each environment uses, and whether preview deployments point at sandbox.
- **How the protein choice maps to Square.** `has_protein` and the
  `PROTEIN_INGREDIENT_ID` sentinel let one recipe describe both beef and pork.
  Square modifier lists or separate variations — this decides Phase 3's backfill
  shape.
- **Refunds and cancellations.** Who can cancel, until when, and whether refunds
  are issued from the dashboard or from Square directly.
- **Twilio A2P 10DLC registration** has a lead time measured in days to weeks.
  Start it during Phase 0 if Phase 6 is anywhere close.
- **Pickup slot capacity.** Whether the tent can cap orders per 15-minute
  window, and what happens when a market sells out.

---

## 10. Immediate next action

**Phase 0, first commit: fix `vercel.json` and stand up one function.**

The rewrite rule currently routes `/api/*` into `index.html` (§4.3), so this is
a genuine blocker rather than a formality — worth confirming with a deployed
health-check endpoint before any Square work begins. Register the Square
application in parallel, since sandbox credentials gate Phase 1.
