---
name: verify
description: Build, launch, and drive this app to verify changes at runtime (Vite dev server + Playwright from node_modules).
---

# Verifying changes in bulgogi-billys

React 19 + React Router v7 Vite SPA. Public site at `/`, admin SPA at `/admin`
(Profit Calculator) and `/admin/transactions` (Transaction History).

## Launch

```bash
npm run dev -- --port 5199 --strictPort   # background it; sandbox blocks listen()
```

- The Vercel edge middleware (admin password gate) does NOT run under `vite dev`
  — `/admin` is directly reachable locally. `/api/*` functions also don't run;
  "Save to cloud" / "Load from cloud" will fail locally. That's expected.

## Drive

Playwright is in `node_modules` (via @vitest/browser-playwright). In a script,
import it by absolute path: `import { chromium } from "<repo>/node_modules/playwright/index.mjs"`.

Gotchas that cost time:
- The admin top nav renders twice (mobile header + desktop bar); one copy is
  always CSS-hidden. Use `>> visible=true` on locators for nav links and
  sidebar jump buttons, never bare `.first()`.
- Sidebar jump links use smooth scroll — wait ~2s before asserting position.
  Sections land at y=96 (`scroll-mt-24`).
- Admin state lives in localStorage key `bb_admin_settings`. To seed it, the
  payload MUST have `ingredients` and `items` arrays or `loadSettings()`
  discards it. Easiest: load `/admin` once so the app saves defaults, navigate
  to the public site `/` (the admin app flushes settings on pagehide and will
  otherwise overwrite your patch), patch the saved JSON via `page.evaluate`,
  then navigate back to `/admin`.

## Flows worth driving

- Desktop 1440px + mobile 390px. Mobile: page links live in the header, jump
  links in the hamburger drawer.
- Shared state: edit "Bulgogi Fries Small price" on the calculator, hop pages
  via top nav, come back — value must survive (settings live in the /admin
  layout's SettingsProvider).
- Transaction History: seed transactions (see above), check stat cards react to
  the single `#range-window` select, and the table's Itemize editor opens.
