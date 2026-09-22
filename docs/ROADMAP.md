# Bulgogi Billy's — Website & Dashboard Roadmap

Priorities for **bulgogibillys.com** (public site) and the **admin dashboard**,
derived from the _Family Business Growth Plan_ (PDF at repo root). Section
references like **§17.1** point to that document.

## Guiding principle

The growth plan is explicit: the immediate goal is **not more sales channels** —
it is turning current sales into predictable free cash flow:

> Control cash → protect taxes → stabilize inventory → measure event profit →
> improve margins → build reserves → generate free cash flow → test expansion →
> purchase equipment. (§31)

The site and dashboard should be built in that order. Every item below names the
business-plan section it serves, why it's high value, and what existing code it
builds on.

### What we already have

| Area        | Exists today                                                                                                                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public site | Home/story, Menu (no prices), Market schedule, Contact form (Web3Forms), Blog, strong SEO/JSON-LD. `/order-now` is a "coming soon" placeholder.                                                                            |
| Admin       | **Profit Calculator** — per-item cost sheets, margins, break-even (already covers most of §17.4 menu cost sheets). **Transaction History** — imported Square CSV, sales-over-time, price-point analysis, estimated profit. |
| Data        | Supabase Postgres: settings, ingredients, batch_lines, menu_items, variants, recipe_lines, transactions. Magic-link admin auth.                                                                                            |

---

## Priority 0 — Cash & event clarity (now / first 30 days)

The plan's Phase One (§29) is cash stabilization. The dashboard can already see
_sales_; it cannot yet see _events_, _taxes_, or _contribution_. These three
deliverables close that gap and directly power the weekly Monday review Billy is
supposed to run (§21).

### 0.1 Market tagging + Event Contribution report — **the highest-value item on this list** (§17.1–17.3, §12.1) — ✅ done (Aug 2026)

Shipped as `/admin/events`, beyond the spec below: purchase allocation across
events by sales share, monthly processor-fee allocation weighted by card volume,
per-market hourly rates, and the §17.2 classification badges.

- Auto-assign every imported transaction to a market from its timestamp — the
  schedules don't overlap: **Saturday → Grogan's Mill**, **1st/3rd Sunday → New
  Caney**, **other Sundays → Farmers Market at 1488**; anything else →
  "Other/Catering" for manual tagging.
- Add per-event expense entry (market fee, fuel, propane, employee hours, waste,
  Billy's hours) — new `events` table keyed by date+market.
- Report per event: pre-tax sales − direct costs = **cash contribution**
  (§17.1), rolled up into the five-way market classification (Growth / Core /
  Development / Probation / Exit, §17.2).
- **Why now:** §17.3 puts Farmers Market at 1488 under standing financial
  review. Today nobody can answer "did 1488 actually make money last month?"
  This report answers it with data we already import.
- Builds on: `src/admin/domain/salesAnalytics.ts` (bucketing, countable sales),
  `TransactionHistory.tsx`, the `transactions` table.

### 0.2 Sales-tax separation everywhere (§13.2, §14.2, §26 rule #1) — ✅ done (Aug 2026)

Revenue, profit, and margins are pre-tax everywhere — `salesAnalytics.ts`,
`calculations.ts` (Profit Calculator margins and break-even included), and the
event report share one `preTaxAmount`. Price matching still uses the gross
amount, and the blended food-cost % stays calibrated against gross.

- Menu prices are **tax-inclusive**, but the dashboard currently treats gross
  receipts as revenue. Add a sales-tax rate setting; show **pre-tax sales** and
  a running **sales-tax liability** ("set aside $X this week") on both admin
  pages.
- Recompute profit estimates in `salesAnalytics.ts` from pre-tax amounts —
  today's margins are overstated by the tax portion.
- **Why now:** "Sales tax is not business income" is Key Financial Rule #1, and
  protecting tax money is step 1 of the cash-allocation order (§14.1).

### 0.3 Weekly review page (§21, §15) — ✅ done (Aug 2026)

Shipped as `/admin/weekly`: week picker, per-event contribution, tax set-aside,
the prescribed 3%/2% transfers (rates editable in settings) with a one-click
"record both", and a `reserve_transfers` ledger driving balances and the §27
target ladder.

- An auto-generated Monday summary: sales by event, tax to set aside, event
  contributions, and the prescribed transfers (3% of pre-tax sales → emergency
  reserve, then 2% → expansion, §15.1–15.2) as concrete dollar amounts.
- Editable running balances for the emergency reserve and expansion fund (§14.2)
  so progress toward the $500 → two-weeks → one-month reserve targets (§27) is
  visible.
- **Why now:** the weekly financial routine is the habit the whole stabilization
  phase hangs on; the dashboard should make it a 10-minute task instead of a
  spreadsheet chore.

---

## Priority 1 — Margin improvement (days 31–90)

### Admin

**1.1 Menu engineering view (§17.5).** Classify every item×size into the four
quadrants (high/low profit × high/low volume) and say what to do about it
(promote / reprice / re-portion / cut). The inputs already exist: margins from
`calculations.ts`, volume from `pricePointBreakdown` in `salesAnalytics.ts`.
Small feature, direct pricing decisions.

**1.2 Thirteen-week cash-flow forecast (§20, §19.4).** Rolling forecast:
expected sales per scheduled event (seeded from historical averages per market),
recurring expenses, tax transfers, reserve contributions → projected ending cash
per week, flagging any week that dips below the cash floor (§14.3). This is
Luke's named responsibility in the plan and the main early-warning tool.

### Public site

**1.3 Publish menu prices (§11.2, §4.2).** The plan says the website should show
current pricing; the menu page has none. Drive prices from the same Supabase
data the admin already maintains so the public menu can never drift from what
the tent charges.

**1.4 Catering page with standard packages (§12.2, §23.2) — the top revenue
lever.** Dedicated `/catering` page: packages for ~20/40/60/100 people, starting
prices, deposit and payment terms, and a structured inquiry form (event date,
headcount, location, budget) replacing the generic contact form for catering
leads. Catering is larger, weather-proof revenue (§12.2), and every inquiry
field we capture up front saves a back-and-forth. Track inquiries in the
dashboard (feeds the §27 KPI "catering inquiries"). Full spec — pricing,
estimator, form fields — in [WEBSITE_REVENUE_PLAN.md](WEBSITE_REVENUE_PLAN.md)
§3.

---

## Priority 2 — Revenue growth (months 3–6)

### Public site

- **2.1 Market preorders (§12.4, §23.3).** Start simple: a preorder form (or
  Square payment links) for pickup at a named market — cash before the event,
  better prep planning, less waste. Promote via the site and socials.
- **2.2 Email/text signup (§11.4).** Lightweight list signup for schedule
  changes, preorder announcements, and catering promos.
- **2.3 FAQ + event calendar (§11.2).** Round out the pages the plan expects the
  website to have; add Google-review prompts (§27 tracks Google reviews).

### Admin

- **2.4 KPI dashboard (§27).** One page with the plan's headline indicators:
  pre-tax sales, free cash flow, average transaction size, event contribution by
  market, reserve/expansion balances, catering inquiries and bookings,
  repeat-visit proxy.
- **2.5 Marketing attribution (§19.5, §11.3).** UTM-tagged links for Carissa's
  campaigns and a simple view tying promos to sales/preorders — "judged by
  customer actions and sales, not likes."

---

## Priority 3 — Scale support (months 6–18)

Only after the earlier phases prove out (§24 expansion gates):

- **3.1 Real online ordering** — replace the `/order-now` placeholder, but only
  once catering and preorders demonstrate demand (§26 rule #9: prove it before
  building it).
- **3.2 Inventory module (§16).** Weekly counts, par levels (min/normal/max),
  usage-vs-sales variance to catch waste — supports David's inventory
  responsibilities (§19.2).
- **3.3 Catering pipeline.** Track inquiries → quotes → deposits → events in the
  dashboard (deposit rules from §23.2).
- **3.4 Family roles & access (§8, §9.2).** Additional dashboard logins with
  scoped views so David (inventory, events) and Ashley (closeout, hours, event
  reports) can own their pieces without full admin — reduces the
  everything-depends-on-Billy risk (§28.3).

---

## Non-goals & sequencing rules

- **No online-ordering buildout in P0/P1.** The plan repeatedly warns against
  expansion before free cash flow exists; catering and preorders come first.
- **No feature that doesn't serve cash clarity, margins, or a proven revenue
  lever** until P0/P1 are done.

## Suggested build order (high-value deliverables)

1. ~~Market tagging + Event Contribution report (0.1)~~ ✅
2. ~~Sales-tax separation (0.2)~~ ✅
3. ~~Weekly review page with reserve tracking (0.3)~~ ✅
4. Public menu prices (1.3) — small, ships alongside the above
5. Catering page + structured inquiries (1.4)
6. Menu engineering view (1.1)
7. 13-week cash forecast (1.2)
8. Preorders (2.1), then signup/FAQ (2.2–2.3)
9. KPI dashboard (2.4), attribution (2.5)
10. P3 items as expansion gates are met
