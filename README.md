<div align="center">

<img src="src/assets/bulgogi_billys_icon.png" alt="Bulgogi Billy's Logo" width="120" />

# Bulgogi Billy's — Official Website

_A production website and operations platform, built solo for a viral
Korean-American food business._

[![Live Site](https://img.shields.io/badge/Live%20Site-bulgogibillys.com-orange?style=for-the-badge)](https://bulgogibillys.com)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Live Site](#live-site)
- [Features](#features)
- [Admin Dashboard](#admin-dashboard)
- [Architecture & Engineering](#architecture--engineering)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Running Locally](#running-locally)
- [Roadmap](#roadmap)

---

## Overview

Bulgogi Billy's is a Korean-American fusion food business based in the greater
Houston, Texas area, serving farmers markets across The Woodlands, Conroe, and
New Caney every weekend. After a candid video of the owner — filmed with smart
glasses — went viral on TikTok with over 24 million views, the business needed a
professional web presence to match the moment.

What began as a marketing site has grown into a complete product: the public
website, plus a private operations dashboard and Postgres backend that run the
business's weekly financial routine — profit modeling, imported sales analytics,
per-event profitability, and cash-reserve tracking. I designed, built, and
maintain the entire system solo: frontend, database schema, test infrastructure,
and deployment. All food photography featured on the site was shot by me — I'm
also a professional photographer.

---

## Live Site

**[bulgogibillys.com](https://bulgogibillys.com)**

---

## Features

**User-facing**

- Homepage hero with this week's locations, menu, and catering calls to action
- Catering page: service styles, packages, an instant price estimator, FAQ, and
  a qualifying inquiry form that arrives prefilled from the estimate
- Menu page with all 3 signature items, photos, and descriptions
- Schedule page with market locations, hours, and direct Google Maps links
- Tap-to-call / tap-to-text footer on every page
- Contact and catering forms with an anti-spam honeypot (Web3Forms integration)
- Blog engine with per-post routes and per-post sitemap entries
- Dark mode toggle — respects OS preference, persists via `localStorage`
- Fully responsive, mobile-first design
- Social media links (Instagram, Facebook)

**Technical**

- Per-route SEO: unique `<title>`, `<meta description>`, and
  `<link rel="canonical">` on every page
- Per-page Open Graph and Twitter card tags, with a generated link-preview JPEG
- JSON-LD structured data (`FoodEstablishment` + `LocalBusiness` schema.org
  types)
- `sitemap.xml` and `robots.txt` for search engine crawlability — the sitemap is
  asserted against the route manifest by a test, so it can't drift
- Build-time prerendering: every public page ships as real HTML
  (`react-dom/server` + React Router's static router) and hydrates in the
  browser, so crawlers and link previews see content without JavaScript; unknown
  URLs return a real 404, and only the admin routes rewrite to the SPA shell
  (`vercel.json`)
- Responsive WebP images generated from a typed registry (`npm run images`)
- Vercel Analytics page views plus custom conversion events (estimator use,
  inquiries, click-to-call/text) and first-touch UTM attribution

---

## Admin Dashboard

A private, owner-only dashboard turns raw sales data into the numbers the
business runs on. Four pages:

- **Profit Calculator** — live cost sheets for every menu item and size:
  ingredient and batch pricing with dual-unit (lb/oz) inputs, gross margins,
  break-even points, a Beef/Pork toggle, and three interactive charts that
  update as you type.
- **Transaction History** — real sales imported from Square: sales over time,
  price-point analysis, and at-a-glance KPI cards, all driven by a single
  time-range selector.
- **Weekly Review** — an auto-generated Monday summary: last week's events,
  sales tax to set aside, prescribed reserve transfers with one-click recording,
  and running progress toward cash-reserve targets.
- **Events** — cash contribution per market event (pre-tax sales minus direct
  costs), with supply purchases allocated across events by sales share, monthly
  card-processing fees weighted by card volume, and labor cost from logged
  employee hours.

Sales data arrives through a Square CSV importer that parses, deduplicates, and
merges new exports into the existing history. Every number is pre-tax everywhere
— sales tax is separated out as a liability, not counted as revenue.

Admin routes sit behind Supabase Auth (magic-link sign-in); authorization is
enforced in Postgres via row-level security, not in the client — the deployed
bundle contains no secrets. The dashboard is mobile-first, follows the site's
light/dark theme, and syncs edits to the cloud so they follow the owner across
devices.

---

## Architecture & Engineering

**Zero-secret static SPA.** There is no server code to operate or exploit: the
app deploys as static files, and every security boundary lives in Postgres
row-level security policies. Serverless functions are deliberately deferred
until a feature actually needs one (design rationale in
`docs/BACKEND_ARCHITECTURE.md`).

**Enforced module boundaries.** The codebase is split into `src/site`,
`src/admin`, and `src/shared`. ESLint forbids cross-imports between site and
admin (and from shared into either), with `main.tsx` as the single composition
root allowed to import both. Admin pages are lazy-loaded, and
`./verify.sh --dist` builds the app and asserts the public entry chunk contains
no admin-only dependencies — so dashboard code can never leak into the public
bundle.

**Route manifests as the single source of truth.** `src/site/routes.ts` drives
both the router and the sitemap test; `src/admin/routes.ts` drives the router,
top nav, page headings, and per-page meta. Adding a page is one manifest entry
plus a component.

**Typed data layer.** Supabase Postgres with 8 versioned migrations. TypeScript
bindings are generated from the live schema (`npm run db:types`), so schema
drift is a compile error. Config saves go through a transactional
`apply_config(jsonb)` RPC — one atomic statement instead of six. A custom
optimistic-sync engine applies edits instantly, then diffs and saves on an 800
ms debounce, journals pending changes to `localStorage` for crash recovery, and
retries with backoff behind a live sync-status indicator.

**Three-tier testing.** ~335 tests across 43 files, split by cost: a fast `unit`
tier (pure logic on happy-dom), a `browser` tier running in real Chromium,
Firefox, and WebKit via Playwright with committed screenshot snapshots, and an
opt-in `db` tier that exercises the schema, the row-level security matrix, and
RPC atomicity against a real local Postgres. `verify.sh` is the staged,
fail-fast regression gate: lint → format check → typecheck → unit → browser,
with `--db` (resets the local database, proving the migration chain applies from
scratch) and `--dist` (the bundle-boundary assertion above).

---

## Tech Stack

| Category      | Technology                      | Notes                                 |
| ------------- | ------------------------------- | ------------------------------------- |
| Framework     | React 19 + TypeScript 6         | Strict TypeScript config              |
| Build Tool    | Vite 8                          | Path aliasing (`@/`) configured       |
| Styling       | Tailwind CSS 4                  | CSS-first config, custom dark variant |
| Routing       | React Router 7                  | Nested routes, build-time prerender   |
| Backend       | Supabase                        | Postgres + Auth, row-level security   |
| UI Components | Headless UI 2 + Catalyst UI Kit | Accessible, composable primitives     |
| Charts        | Recharts 3                      | Interactive dashboard charts          |
| Icons         | Heroicons 2                     |                                       |
| Animation     | Motion 12                       | Catalyst navbar indicator             |
| Testing       | Vitest 4 + Playwright           | Unit, real-browser, and db tiers      |
| Deployment    | Vercel                          | Auto-deploy from `main` branch        |
| Analytics     | Vercel Analytics 2              | Page views + custom conversion events |
| Forms         | Web3Forms                       | No-backend form submissions           |
| Typography    | Inter variable font             | `@fontsource-variable/inter`          |
| Linting       | ESLint 10 + TypeScript-ESLint   | `react-hooks` plugin, boundary rules  |
| Formatting    | Prettier 3                      |                                       |

---

## Project Structure

```
src/
├── site/                    # Public website (bulgogibillys.com)
│   ├── App.tsx              # Layout shell (navbar + mobile sidebar)
│   ├── routes.ts            # Public route manifest (drives router, prerender + sitemap test)
│   ├── pages/               # home, menu, schedule, catering, order-now, contact, blog, not-found
│   ├── catering/            # Pure catering logic: pricing model, inquiry payload, FAQ
│   └── components/          # Footer, responsive images, JSON-LD markup, social icons
├── admin/                   # Private dashboard, everything behind RequireAdmin
│   ├── routes.ts            # Admin route manifest (drives router, nav, headings, meta)
│   ├── AdminLayout.tsx      # Dashboard shell; RequireAdmin gates every admin route
│   ├── *Context.tsx         # Settings / Records / Transactions state, split by data lifecycle
│   ├── useOptimisticSync.ts # Debounced diff/save engine: crash journal, retry, sync status
│   ├── pages/               # ProfitCalculator, TransactionHistory, WeeklyReview, Events
│   ├── components/          # Editors, tables, charts, dashboard chrome (+ ui/ primitives)
│   ├── domain/              # Pure logic: calculations, analytics, mutations, types
│   ├── data/                # Supabase client, repos, diffing, generated DB types
│   └── import/              # Square CSV parsing + dedupe merging
├── shared/                  # Imported by both sides — kept deliberately small
│   ├── catalyst-ui-kit/     # Headless UI component library (27 components)
│   ├── dark-mode-toggle/
│   ├── PageMeta.tsx         # Per-route SEO head management
│   └── theme.ts
├── test/                    # Test infra, fixtures, cross-cutting tests
├── entry-server.tsx         # Build-time prerender entry (public site only)
└── main.tsx                 # Composition root — the only file importing both sides
scripts/                     # optimize-images (WebP/OG derivatives), prerender (postbuild)
supabase/
├── migrations/              # 8 versioned schema migrations
├── tests/                   # db tier: schema, RLS matrix, transactional RPC
└── seed.sql                 # Local development seed data
docs/                        # Design docs: backend architecture, roadmap, refactor plan
public/
├── images/                  # Original food photography (shot by me) and brand assets
├── sitemap.xml
└── robots.txt
verify.sh                    # Staged regression gate (lint → format → types → tests → dist)
```

ESLint enforces the boundary: `src/site/` can't import `src/admin/` (and vice
versa), `src/shared/` can't import either side, and the public bundle is
asserted free of admin-only dependencies at build time (`./verify.sh --dist`).

---

## Running Locally

```bash
git clone https://github.com/lukeludlow/bulgogi-billys.git
cd bulgogi-billys
npm install
npm run dev
```

Open `http://localhost:5173`. Requires Node 20+. No environment variables are
needed for the public dev server.

**Admin development** (optional) uses a local Supabase stack (Supabase CLI +
Docker):

```bash
supabase start     # local Postgres + Auth
npm run db:types   # regenerate typed DB bindings from the local schema
npm test           # unit + browser test tiers
npm run test:db    # db tier against the local Postgres
./verify.sh        # full staged regression gate
```

---

## Roadmap

Development follows a written roadmap (`docs/ROADMAP.md`) derived from the
family's business growth plan, sequenced around cash clarity before expansion.
Priority 0 — per-event contribution tracking, sales-tax separation, and the
weekly review — shipped in August 2026. Next up: publishing menu prices from the
same data the dashboard already maintains, a catering packages page, a
menu-engineering view, and a 13-week cash-flow forecast.
