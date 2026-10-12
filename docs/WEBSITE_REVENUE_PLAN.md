# Website Revenue Plan — bulgogibillys.com

A phased, concrete plan for turning the public site into a sales tool. Written
September 2026 from four inputs:

- **ChatGPT's site review** from Billy's account ("Food Vending Legitimacy
  Review").
- **An audit of the live site and the source** under `src/site/`.
- **The _Family Business Growth Plan_**. Section references like **§12.2** point
  to it.
- **Houston catering price benchmarks** for 2026.

This document sits beside its siblings:

- **[ROADMAP.md](ROADMAP.md)** says _what_ to build and in what business order.
- **[ONLINE_ORDERING_PLAN.md](ONLINE_ORDERING_PLAN.md)** covers payments and the
  Square catalog.
- **[BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md)** decides how public
  writes are shaped.
- **This document** covers **conversion**: getting a visitor to book catering,
  show up at a market, or buy ahead of time.

---

## Summary

The site works well as a **brochure for a farmers-market vendor**. The story,
the "Seoul food, Texas style" line, the three signature dishes and the schedule
are all there. But the business is becoming a **vendor + caterer +
corporate-lunch operator** (§4.3, §12.2–12.3), and the site hasn't caught up.
Three leaks cost money today:

1. **Catering has no page and no pricing.** It is one paragraph on the home page
   that ends in a generic three-field contact form.
2. **The "Order" buttons are dead ends.** Both orange CTAs on `/menu` lead to
   "Sorry, online ordering is currently unavailable."
3. **Machines can't read the site.** The production HTML is an empty
   `<div id="root">`, so link previews, social scrapers and most AI assistants
   see nothing. That is why ChatGPT kept saying it could only see "the indexed
   version."

**Timing matters.** It is late September. Office holiday parties get booked 4–8
weeks ahead. **The catering page should be live by early October.** Everything
in Phase 1 serves that date.

---

## 1. ChatGPT's review: where I agree, and where I differ

| #   | ChatGPT priority                                     | Verdict                    | Notes                                                                                                                                                      |
| --- | ---------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Clear menu + prices                                  | **Agree**                  | Also ROADMAP 1.3 and §11.2. Phase 2.                                                                                                                       |
| 2   | Dedicated catering inquiry page                      | **Agree — top item**       | It needs pricing, not just a form (§3 below). Phase 1.                                                                                                     |
| 3   | Corporate lunch page                                 | **Agree, sequenced**       | Starts as a service style on `/catering` (Phase 1). Becomes its own `/corporate` page in Phase 2, when outreach to Fooda, property managers and HR begins. |
| 4   | Better homepage CTAs                                 | **Agree**                  | Phase 1.                                                                                                                                                   |
| 5   | Large professional food photos                       | **Agree**                  | The current photos are also ~1 MB PNGs that slow the page (T3). Fix the format first, then reshoot.                                                        |
| 6   | "This Week" schedule                                 | **Agree, and automate it** | The admin already computes which market runs on which date. Reuse that instead of hand-editing (Phase 2).                                                  |
| 7   | Viral-video / social-proof section                   | **Agree**                  | Credit the creator's account. The business has no TikTok of its own.                                                                                       |
| 8   | Reviews / testimonials                               | **Agree**                  | Pair it with Google-review prompts at the tent.                                                                                                            |
| 9   | Houston-area SEO pages                               | **Agree with changes**     | Build only 2–3 substantive local pages. Thin keyword pages like `/catering-houston` read as doorway pages to Google and get demoted.                       |
| 10  | Clean up outdated directory listings (Nextdoor etc.) | **Agree**                  | Do it together with a Google Business Profile tune-up. That profile matters more than any directory (Phase 0).                                             |

**What ChatGPT missed.** It could only see what a crawler sees. So it missed the
dead-end order buttons, the missing phone number, the page weight, the invisible
content and link previews, and the soft 404s. It also missed the revenue levers
that aren't on the site today: tent QR codes, gift cards, and deposits collected
through Square Invoices. All of these are in §2.

---

## 2. Findings

### Conversion & revenue

- **R1. Dead-end CTAs.**
    - Both orange "Order" buttons in `src/site/pages/menu/Menu.tsx` link to
      `/order-now`.
    - `OrderNow.tsx` answers "Sorry, online ordering is currently unavailable."
    - `/order-now` is also marked `indexable: true` in `src/site/routes.ts` and
      listed in `public/sitemap.xml`. We are asking Google to rank a "coming
      soon" page.
- **R2. Catering is a paragraph, not a page.**
    - "Bring the Fire to Your Next Event" in `src/site/pages/about/About.tsx`
      ends with "Reach out today for custom rates."
    - It links to `/contact`, where `ContactForm.tsx` collects only name, email
      and message.
    - There are no prices, packages, date or headcount fields, and no promise
      about response time.
    - Every lead needs a round of back-and-forth before Billy can even quote.
- **R3. No phone number anywhere.** The business line is **936-900-2705**. It is
  approved for publishing and takes both calls and texts. Office managers and
  party planners call or text, and there is no footer carrying contact details
  on every page.
- **R4. No prices anywhere** (§11.2, ROADMAP 1.3). The price ladder in §4.2 goes
  Small $11 / Regular $14 / Large $17 / Texas $24, plus tacos at $6 or three for
  $15. It is a natural upsell device, and it's invisible.
- **R5. Nav gaps.**
    - The nav (`src/site/App.tsx`) is Home / Menu / Schedule / Contact, with no
      Catering link.
    - On mobile it collapses into a hamburger with no always-visible CTA.
    - The blog stays out of the nav on purpose. It exists for SEO and is reached
      through search and the sitemap.
- **R6. The viral video is used too little.**
    - Its biggest piece of social proof, 24M+ views, is a small "As seen on
      TikTok!" text link in the hero.
    - The link points to the creator's account (@davidspov\_). The business has
      no TikTok of its own.
- **R7. The tent is the best lead source, and it isn't used.**
    - The best catering leads are people eating the food right now.
    - There is no QR code at the tent and no catering URL on the Square receipt.
- **R8. Nothing that collects cash before service.**
    - No gift cards. Square eGift Cards need close to zero build, and the
      holidays are coming.
    - No email or text signup (§11.4).
- **R9. Common catering questions go unanswered.** The site doesn't cover:
    - vegetarian and gluten options (the bulgogi marinade contains soy sauce)
    - how many people can be served
    - the service radius
    - whether Saturday mornings are even possible, since they conflict with
      Grogan's Mill
- **R10. The site still advertises pork.** Pork bulgogi is no longer on the
  menu, but the site still offers it in four places:
    - "(Beef or Pork)" on every menu card (`MenuItem.tsx`)
    - "beef or tender pork" and "your choice of beef or pork bulgogi" on the
      home page (`About.tsx`)
    - the `/menu` meta description (`Menu.tsx`), which is also what Google shows
      in search results

    A customer who walks up and asks for pork gets a "no", which is a bad first
    impression.

### Technical (every item hurts revenue indirectly)

- **T1. Client-only rendering.**
    - `curl https://www.bulgogibillys.com/` returns an empty shell. Titles,
      descriptions and the JSON-LD from `RestaurantStructuredData.tsx` exist
      only after JavaScript runs.
    - `og:title` / `og:image` are hardcoded in `index.html` for every URL. A
      `/catering` link pasted into iMessage, Slack or Teams will preview as the
      home page.
    - Google renders JavaScript, eventually. Social scrapers and most AI
      assistants don't.
- **T2. Soft 404s.** The `vercel.json` rewrite serves `index.html` with HTTP 200
  for any path. `/catering` returns 200 today, before it exists.
- **T3. Page weight.**
    - The home carousel loads three PNGs of ~1 MB each
      (`fries_h_screen_small.png` and siblings).
    - The logo is a 742 KB PNG, drawn in both the navbar and the sidebar on
      every page.
    - `bulgogi-billys-socials.png` is 2.3 MB.
    - On LTE at a market, that means a slow Largest Contentful Paint (LCP).
      Auto-rotating carousels also pull attention away from the calls to action.
- **T4. The schedule is hardcoded in three places**: `About.tsx`, `Schedule.tsx`
  and `RestaurantStructuredData.tsx`.
    - They drift. Dropping Farmers Market at 1488 and moving Grogan's Mill to
      9–1 (Oct 2026) meant editing all three by hand.
    - The canonical rule already exists: `marketForDate()` in
      `src/admin/domain/eventAnalytics.ts`.
- **T5. Alt text.** Every menu photo is alt "Bulgogi Fries" (`MenuItem.tsx`).
  The hero images are "carousel", and the family photo is "billy-and-mom". That
  costs accessibility and image search.
- **T6. No conversion measurement.**
    - `@vercel/analytics` records page views only.
    - The project is on Vercel Pro, which supports custom events, but none are
      sent.
    - Flyers and QR codes carry no UTM parameters, so we can't tell which
      promotion produced a lead (§19.5: "judged by customer actions and sales,
      not likes").

---

## 3. The #1 item: the catering page

**Goal:** turn catering interest into **qualified inquiries**. That means prices
shown openly enough to set expectations and screen out bad-fit budgets, while
staying flexible enough that Billy still quotes each event.

**Route:** `/catering`. Link it from the nav, the home hero, the footer, and the
sitemap.

### 3.1 Page structure (mobile-first, top to bottom)

1. **Hero.**
    - "**Korean Fusion catering for Houston-area offices, parties & events.**"
    - Two buttons: _Get a price estimate_ (scrolls to the estimator) and _Call /
      Text Billy_ (`tel:` / `sms:`).
    - Trust line: "24M+ views on TikTok • Mom's recipe since 2023 • We reply
      within 24 hours."
2. **Three ways to book.** Cards, each with a "from" price.

    | Service style            | What it is                                                                                                          | Public price                                                    |
    | ------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
    | **Drop-off Bulgogi Bar** | Trays: beef bulgogi, steamed rice, kimchi, Seoul sauce. Fries or tortillas as add-ons.                              | **From $15/person** ($15–$21.25 range), 20-guest minimum        |
    | **On-site Tent Service** | Billy sets up the tent and cooks to order from a short menu. The "experience" tier: the thing people saw on TikTok. | **From $22/person**. Minimum $800 Mon–Thu / $1,200 Fri–Sun      |
    | **Employee-Paid Pop-Up** | For office parks, breweries and apartment communities. Guests buy their own meals.                                  | **$0 to host.** Needs ~40+ expected buyers or a sales guarantee |

    The pop-up is §12.3 weekday vending. Test one location at a time, and prove
    positive contribution before buying equipment (§23.4).

3. **Packages for 40 / 60 / 100 guests** (§12.2). These are named cards with
   example ranges and a list of what each includes. The ranges come straight
   from the estimator (§3.3), so the two can't disagree.

    | Package                     | Guests | Suggested style | Example range   | Selected when the estimate is… |
    | --------------------------- | ------ | --------------- | --------------- | ------------------------------ |
    | **Office Lunch & Backyard** | 40     | Drop-off        | $600 – $850     | drop-off, any size             |
    | **Party**                   | 60     | On-site         | $1,320 – $1,585 | on-site, under 80 guests       |
    | **Big Event**               | 100    | On-site         | $2,200 – $2,640 | on-site, 80+ guests            |

    Once the visitor uses the estimator (or picks a package), the package their
    answers fall into is marked "Matches your estimate" and the others dim,
    though they stay clickable. A pop-up matches none.

4. **Instant estimator.** This is the "semi-transparent but flexible" part.
    - **Inputs:**
        - guests (stepper)
        - service style
        - day of week
        - distance band (≤15 mi of The Woodlands/Conroe, 16–30 mi, 31–40 mi)
        - add-ons: extra tacos, Texas-size portions, drinks, extra kimchi
    - **Output:** a **range**, not a quote. For example: "Estimated **$1,200 –
      $1,440** · weekend minimum applied · 50% deposit ($600) holds your date."
    - **CTA:** _Get my exact quote_. It scrolls to the form with the answers
      prefilled.
    - **Why a range:** it sets expectations, screens out budgets that won't
      work, and makes the price feel fair ("I already know roughly what this
      costs"). It still leaves Billy room to adjust for menu, travel and service
      hours.
5. **"What affects your price."** Menu choices, headcount, day and time, service
   hours, and travel (free within 15 miles, quoted up to 40).
6. **How booking works** (§12.2 contract terms, §23.2 deposits):
    1. You send an inquiry, and we reply with a quote within 24 hours.
    2. A **50% deposit** holds your date. It is sent as a **Square Invoice**,
       which supports deposits and milestone payments, so there is nothing to
       build.
    3. Final headcount is due 7 days before the event.
    4. The balance is due 3 days before the event.
    5. The cancellation terms are stated in plain language.

    Deposits must cover advance food and supply purchases. The plan is explicit:
    _"Bulgogi Billy's should not finance a customer's event with its own limited
    operating cash."_

7. **Social proof.**
    - 3–5 short testimonials from past catering clients
    - photos of catered events
    - "Events we've served" (names only with permission)
    - the viral video, click to play
    - Launch with the video and whatever real quotes exist. **Never invent
      testimonials.**
8. **FAQ.**
    - Is it gluten-free? (The marinade contains soy sauce, so the honest answer
      is "ask us.")
    - How spicy is it?
    - How much space and power does the tent need?
    - Are you permitted and insured?
    - How far ahead should I book?
    - Where do you travel?
    - Can you do Saturday mornings?
9. **Inquiry form.**

    | Field                     | Type / hint                                                                 | Why                                                                          |
    | ------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
    | Name                      | text, required                                                              | Basic contact.                                                               |
    | Company / organization    | text, optional                                                              | Separates corporate from private leads; corporate clients are repeat buyers. |
    | Phone                     | tel, required                                                               | Catering is closed by phone. This is the fastest route to a deposit.         |
    | Email                     | email, required                                                             | Where the written quote and Square Invoice go.                               |
    | Preferred contact         | radio: call / text / email                                                  | Respects the buyer's workday and raises the reply rate.                      |
    | Event date                | date, required, hint "Saturdays AM unavailable"                             | Billy checks availability first; this avoids a wasted quote.                 |
    | Start time                | time                                                                        | Lunch vs evening changes staffing and pricing.                               |
    | Guests                    | number, required, prefilled from estimator                                  | Drives the per-person price and whether the minimum applies.                 |
    | Service style             | select, prefilled                                                           | Drop-off / on-site / pop-up.                                                 |
    | Event location / ZIP      | text, required                                                              | Sets the travel fee and feasibility.                                         |
    | Event type                | select: office, birthday, wedding, church/school, brewery, community, other | Helps tailor the quote, and feeds reporting on which segments convert.       |
    | Budget range              | select: <$500, $500–1k, $1–2k, $2k+, not sure                               | Screens early and signals which package to offer.                            |
    | Dietary needs             | text, e.g. allergies, gluten                                                | Allergy planning.                                                            |
    | How did you hear about us | select: at a market, Instagram, Facebook, Google, friend, other             | Attribution (§19.5). Especially tells us whether the tent QR works.          |
    | Anything else             | textarea                                                                    | Catch-all.                                                                   |
    | _(hidden)_ estimate       | the estimator's range, inputs, and UTM source                               | Billy sees what the buyer already expects before he replies.                 |

    On success, show: "Thanks — Billy will reply within 24 hours. Need it
    sooner? Call or text 936-900-2705."

10. **Sticky mobile CTA bar** (this page only): _Estimate_ · _Call / Text_.

### 3.2 Pricing — proposed, pending Billy's sign-off

- **Market benchmarks (Houston, 2026):**
    - Asian fusion food-truck catering runs about **$22–35 per person**.
    - Minimums run about $1,000–1,400 on weekdays and $1,600–2,800 on Saturdays.
    - Sources: [HOUFTA](https://houfta.org/Caterings-Costs-2025),
      [Best Food Trucks](https://www.bestfoodtrucks.com/blog/how-much-does-it-cost-to-hire-a-food-truck-2026).
    - The proposal sits at the **low-to-mid** end, on purpose for a first
      season. Raise prices once bookings fill up.
- **The customer's anchor:** a Regular bowl is $14 including tax at the tent.
  Drop-off from $15 covers trays, packaging and delivery. On-site at $22 covers
  the tent crew and the live-grill experience.
- **Floor rules**, checked against the dashboard before launch:
    - Per-person prices must hold the Profit Calculator's target margin
      (`/admin`).
    - An on-site minimum on a market day must beat the **event contribution of
      the market it displaces** (`/admin/events`). On a 1st or 3rd Sunday a
      booking must beat New Caney. Since Billy left Farmers Market at 1488 (Oct
      2026), 2nd, 4th and 5th Sundays displace no market.
- **Saturday mornings** are unavailable while Grogan's Mill runs. Saturday
  afternoons and evenings are allowed if staffing works.
- **The pop-up guarantee.** A host who can't promise ~40 buyers covers the
  shortfall below a sales floor (proposed $600). Billy confirms the number.

### 3.3 Implementation shape

- **Page:** `src/site/pages/catering/`, split into
    - `Catering.tsx`
    - `ServiceStyles.tsx`
    - `Packages.tsx`
    - `Estimator.tsx`
    - `CateringFaq.tsx`
    - `CateringInquiryForm.tsx`

    Build from Catalyst kit components (`fieldset`, `input`, `select`, `radio`,
    `button`, `badge`, `description-list`). Register the route in `SITE_ROUTES`.
    The existing sitemap test keeps `sitemap.xml` honest.

- **Pricing domain:** `src/site/catering/pricing.ts`.
    - A `CATERING_PRICING` config object holds rates, minimums, distance bands,
      add-ons, the deposit share and the range spread.
    - A pure function computes the estimate:
      `estimateCateringQuote(input) → { low, high, minimumApplied, deposit }`.
    - The package cards call the same function, so their numbers can't disagree
      with the estimator's.
    - Changing prices means editing data, not code. This is the seam for moving
      the config into Supabase settings later.
    - **Unit tests:** per-person math, the minimum floor by day type, distance
      bands, add-ons, rounding to $5, deposit share, and guest-count bounds.
- **Submission v1 (ship now):** Web3Forms, the pattern `ContactForm.tsx` already
  uses.
    - Extract a `useFormSubmission` hook first, so the contact and catering
      forms share one submit/status path.
    - The email to Billy arrives with every field labeled and the estimate
      included.
- **Submission v2 (Phase 4):** `api/catering-inquiry.ts`.
    - Turnstile, validation, rate limit, then a service-role insert into an
      insert-only `catering_inquiries` table, plus a notification.
    - This is exactly the first function `BACKEND_ARCHITECTURE.md` §8–§9 already
      plans.
- **Events:** `track()` from `@vercel/analytics` fires `catering_estimate_used`,
  `catering_inquiry_submitted` and `click_to_call`.
- **Tests:**
    - the pricing module
    - the estimator (rendering and prefill handoff)
    - the form (following `ContactForm.test.tsx`)
    - the routes/sitemap test

---

## 4. Phased plan

### Phase 0 — Quick wins (this week; each under half a day)

**Status (2026-09-22):** 0.1–0.5 and 0.9 are built on the
`public-site-improvement` branch. 0.6–0.8 (off-site, tent/receipt, gift cards)
are still open. Implementation notes: contact facts live in
`src/site/business.ts`, the nav in `src/site/navigation.ts`, and photos in the
`src/site/images.ts` registry; `npm run images` regenerates the WebP
derivatives.

| #   | Change                                                                                                                                                                                                                                                                               | Why                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| 0.1 | Replace the Menu "Order" buttons with **"Find us this weekend" → `/schedule`**. Set `/order-now` to `indexable: false` and remove it from `sitemap.xml` until ONLINE_ORDERING_PLAN Phase 8.                                                                                          | Stops sending hungry visitors to a dead end (R1).                                          |
| 0.2 | **Site footer** on every page: tap-to-call / tap-to-text phone, email, service area ("The Woodlands • Conroe • New Caney • Greater Houston"), Instagram, Facebook, Catering link. The blog is not linked.                                                                            | Catering buyers want a phone number (R3).                                                  |
| 0.3 | Add **Catering** to the nav. It points at `/contact` until `/catering` ships.                                                                                                                                                                                                        | Makes catering visible from any page (R5).                                                 |
| 0.4 | **Images:** WebP/AVIF with `srcset`; the logo as SVG or a small WebP; compress the socials image; lazy-load below the fold; replace the auto-rotating carousel with **one static hero image** (the fries).                                                                           | Faster first paint on mobile at a market (T3).                                             |
| 0.5 | **Alt text** that describes each image, e.g. "Bulgogi fries topped with Seoul sauce and sour cream."                                                                                                                                                                                 | Accessibility + image search (T5).                                                         |
| 0.6 | **Off-site (Carissa / Billy, no code):** tune the Google Business Profile (service-area business; categories Caterer + Korean restaurant; weekly schedule posts; review-link QR); fix Nextdoor, Yelp and Facebook so every listing has the same description, phone and service area. | Google Maps and "catering near me" searches draw on the Business Profile, not the website. |
| 0.7 | **Tent & receipt:** a QR sign at the tent — "Book us for your office or party" → `/catering?utm_source=tent` — plus the catering URL on the Square receipt footer.                                                                                                                   | Reaches the best leads at no cost (R7).                                                    |
| 0.8 | **Square eGift Cards:** enable them and link from the footer and home page before November.                                                                                                                                                                                          | Cash before service, and holiday gifting (R8).                                             |
| 0.9 | **Beef only:** remove every pork mention from the menu cards, the home copy and the `/menu` meta description.                                                                                                                                                                        | The site shouldn't promise what the tent doesn't sell (R10).                               |

### Phase 1 — Catering page + discoverability (target: live by ~Oct 6)

**Status (2026-09-22):** built on the `public-site-improvement` branch.

- **`/catering`** follows §3. The proposed §3.2 prices are published (Luke's
  call, still pending Billy's sign-off), and every number lives in
  `CATERING_PRICING` in `src/site/catering/pricing.ts`. Add-ons and travel
  beyond 15 miles are "quoted separately" rather than priced. The FAQ leaves out
  tent space/power and permits/insurance until Billy confirms them, and there
  are no testimonials yet.
- **Prerendering.** `npm run build` ends with `scripts/prerender.ts`, which
  writes `dist/<path>.html` for every public page plus `dist/404.html`.
  `vercel.json` turns on `cleanUrls` and rewrites only the admin routes to the
  SPA shell (`dist/spa.html`). Check status codes and link previews on the first
  Vercel preview deploy.
- **Events** go to Vercel Analytics → Events: `catering_estimate_used`,
  `catering_inquiry_submitted`, `click_to_call` and `click_to_text` (the last
  two carry a `placement`).
- **Inquiries** reach the business inbox through Web3Forms with every answer
  labeled, the estimate the buyer saw, and the campaign that brought them in.
- **Update (2026-10-03, Luke):**
    - Drop-off is $15–$21.25 per person, so 40 guests is $600–$850.
    - On-site minimums are $800 Mon–Thu and $1,200 Fri–Sun.
    - Backyard and Office Lunch merged into one package, leaving three. Each
      lists what it includes and follows the estimator (§3.1 item 3).
    - Distance bands are ≤15, 16–30 and 31–40 miles.
    - The vegetarian option is off the page.

1. **`/catering`**, as specified in §3.
2. **Build-time prerendering** (fixes T1 and T2).
    - A postbuild script renders every `indexable` route in `SITE_ROUTES` with
      `react-dom/server` and writes `dist/<route>/index.html`.
    - The client then hydrates as before.
    - Extend `PageMeta` (`src/shared/PageMeta.tsx`) to emit `og:title`,
      `og:description`, `og:url`, `og:image` and `twitter:card` per page. Drop
      the hardcoded values in `index.html`.
    - Narrow the catch-all rewrite in `vercel.json` and add a real `404.html`,
      so unknown URLs return 404.
    - _This is what makes a shared `/catering` link preview with the right title
      and photo._
3. **Home hero rework.**
    - Keep "Seoul food, Texas style." as the brand line. Add the plain
      description "**Korean Fusion in Greater Houston**."
    - Three buttons: _This week's locations_ · _Menu_ · _Catering & events_.
    - The home "Bring the Fire" catering card links to `/catering`.
4. **Measurement.**
    - Fire the custom events from §3.3.
    - Adopt one UTM convention for every printed and posted link: `utm_source` =
      `tent | receipt | instagram | facebook | flyer | email`, and
      `utm_campaign` = the promotion name.
    - The site keeps a visitor's first tagged link for the session, so the
      inquiry email's **Campaign** line says which QR code or post brought them
      in. Ready-made links:

    | Where the link lives  | Link                                                                               |
    | --------------------- | ---------------------------------------------------------------------------------- |
    | Tent QR sign          | `https://www.bulgogibillys.com/catering?utm_source=tent&utm_campaign=fall-2026`    |
    | Square receipt footer | `https://www.bulgogibillys.com/catering?utm_source=receipt&utm_campaign=fall-2026` |
    | Instagram bio         | `https://www.bulgogibillys.com/catering?utm_source=instagram&utm_campaign=bio`     |
    | Facebook page button  | `https://www.bulgogibillys.com/catering?utm_source=facebook&utm_campaign=page`     |
    | A flyer               | `…/catering?utm_source=flyer&utm_campaign=<flyer-name>`                            |
    | An email              | `…/catering?utm_source=email&utm_campaign=<email-name>`                            |

### Phase 2 — Menu, schedule, proof (weeks 2–5)

1. **Menu with prices** (ROADMAP 1.3, §4.2).
    - Start with a static `src/site/menu/menu.ts` data module. Switch to the
      Square-mirror pipeline when ONLINE_ORDERING_PLAN Phase 2 lands. The
      component shouldn't care which one feeds it.
    - Show each dish's **price ladder** (Small $11 · **Regular $14 — most
      popular** · Large $17 · Texas $24) and tacos ($6 · 3 for $15).
    - Add an **add-ons** row (extra kimchi, add a taco). Upselling is how §23.1
      raises the average ticket.
    - Note that prices include tax. That is true, and customers like it.
2. **"This weekend" schedule** (fixes T4).
    - Move `marketForDate()` out of `src/admin/domain/eventAnalytics.ts` into
      `src/shared/markets.ts`, together with each market's hours, address, map
      link and website. The admin imports it from there. **One source of truth**
      for the schedule, the home card, the JSON-LD and the event report.
    - `/schedule` leads with **the next two market dates** ("Sat Oct 4 —
      Grogan's Mill, 9–1"), then the regular pattern.
    - Add **add-to-calendar** (.ics) buttons.
    - Emit per-date schema.org `Event` JSON-LD from the same module, which is
      eligible for Google event results.
    - Leave room for an override list (a cancellation or a one-off pop-up). The
      Phase 4 banner covers weather.
3. **Viral-video section** on the home page. "Yep, we're _that_ bulgogi guy —
   **24M+ views**", with a click-to-load TikTok embed that credits the creator.
   The third-party script only loads on tap.
4. **Testimonials + Google-review prompts.** 5–6 real, short quotes (used with
   permission), and a "Leave us a review" link on the site and at the tent.
5. **`/corporate` — "Bring Bulgogi Billy's to Work."**
    - A Korean Fusion lunch that isn't pizza or sandwiches.
    - It explains the **employee-paid pop-up** (zero cost to the host) vs the
      **company-sponsored lunch** (per person or a package).
    - It reuses `CateringInquiryForm` with the service style preset.
    - This is the link to send to Fooda, property managers, HR and breweries.

### Phase 3 — Retention & search (months 2–3)

1. **Email / text signup — "The Weekend Drop"** (§11.4, §23.3).
    - One message a week: where we'll be, specials, preorder windows, weather
      calls.
    - **Evaluate Square Marketing / Loyalty first.** It captures phone numbers
      at checkout, where the traffic already is. The website signup then feeds
      the same list (via a serverless function in Phase 4, or the provider's
      embed until then).
2. **FAQ page** with FAQPage schema. It collects market questions (payment,
   parking, spice) alongside the catering FAQ.
3. **Local pages, 2–3 at most:** `/the-woodlands` and `/conroe`, maybe
   `/new-caney`.
    - Each needs real, local substance: the market there and its schedule,
      catering in that area, and area-specific photos and testimonials.
    - Support them with blog posts aimed at catering searches, e.g. "Office
      lunch catering ideas in The Woodlands" or "Graduation party food in
      Conroe". The blog stays out of the nav; it's for search.
4. **Retail interest list** for jarred Seoul Sauce and kimchi. "Want a jar? Get
   notified." It measures demand before any production, labeling or regulatory
   work (§12.5, §23.5: prove it before building it).

### Phase 4 — Serverless-backed (after ONLINE_ORDERING_PLAN Phase 0)

1. **Catering inquiries into the database.**
    - `api/catering-inquiry.ts` inserts into a `catering_inquiries` table.
    - An admin pipeline view tracks inquiry → quoted → deposit paid → event →
      completed (ROADMAP 3.3).
    - Inquiry and booking counts feed the §27 KPIs and the weekly review.
2. **Site-wide announcement banner, managed from admin.** Weather cancellations
   (§28.1), sold-out notices, holiday specials. Publish it at build time with a
   deploy hook, following BACKEND_ARCHITECTURE §8.1, so the site stays static.
3. **Market preorders → online ordering**, per ONLINE_ORDERING_PLAN Phase 8.
   When it launches, the Menu buttons from 0.1 become "Preorder for pickup".

---

## 5. KPIs

Track these weekly on the Weekly Review, and later on the ROADMAP 2.4 KPI page:

| Stage               | Metric                                              | Source                             |
| ------------------- | --------------------------------------------------- | ---------------------------------- |
| Reach               | `/catering` and `/corporate` views, by `utm_source` | Vercel Analytics                   |
| Engagement          | Estimator uses; click-to-call / click-to-text       | Custom events                      |
| **Conversion**      | **Inquiries** (target: 3–5% of catering-page views) | Form submissions → Phase 4 table   |
| Sales               | Quotes sent → deposits paid → booked revenue        | Square Invoices → Phase 4 pipeline |
| Market demand       | Tent-QR scans, "how did you hear" = at a market     | UTM + form field                   |
| Retention & prepaid | List signups, gift-card sales, Google review count  | Square / Google Business Profile   |

**The real test:** catering revenue as a share of pre-tax sales, rising month
over month without weekend market revenue falling.

---

## 6. Decisions needed from Billy

**Already decided (Sept 2026):**

- **Phone:** publish 936-900-2705 site-wide. It takes calls and texts, so offer
  both `tel:` and `sms:` links.
- **Vegetarian option (revised Oct 3):** removed from the catering page — no
  form field and no FAQ entry. The menu is beef only.
- **Launch pricing (Sept 22):** `/catering` goes live with the proposed prices
  in decision 1 below, so the page can meet the early-October date. Billy's
  changes are an edit to `CATERING_PRICING`.
- **Revised prices (Oct 3):** drop-off $15–$21.25 per person; on-site minimums
  $800 Mon–Thu / $1,200 Fri–Sun; three packages; distance bands of ≤15, 16–30
  and 31–40 miles.
- **Add-ons and travel beyond 15 miles:** buyers can tick them in the estimator,
  but they are quoted by Billy, not priced on the site.

**Still open:**

1. **Catering prices**: $15–$21.25 drop-off / $22 on-site per person; on-site
   minimums of $800 on weekdays and $1,200 Fri–Sun; the 50% deposit; the 7-day
   headcount deadline; cancellation terms.
2. **Saturday rules**: morning blackout confirmed? Afternoons and evenings OK?
3. **Travel fee** for the 16–30 and 31–40 mile bands, and whether to go past 40
   miles.
4. **The pop-up sales guarantee** (proposed $600 floor).
5. **Testimonials and client names**: whom to ask, and how to get written
   permission.
6. **Photo shoot**: about six excellent shots (fries, tacos, rice bowl, the tent
   in action, a catered spread, the family). Six great photos beat a gallery of
   average ones.
7. **Tent footprint and power needs, and permit/insurance status.** The catering
   FAQ leaves both questions out until Billy confirms the facts.

---

## 7. Priority summary

| Item                                                   | Phase | Revenue impact        | Effort      | Depends on                   |
| ------------------------------------------------------ | ----- | --------------------- | ----------- | ---------------------------- |
| Fix dead-end Order CTAs; de-index `/order-now`         | 0     | Medium                | XS          | —                            |
| Remove pork from the site copy                         | 0     | Low (trust)           | XS          | —                            |
| Footer with phone; Catering in nav                     | 0     | High                  | S           | —                            |
| Image weight + single hero + alt text                  | 0     | Medium                | S           | —                            |
| Google Business Profile + listings cleanup             | 0     | High                  | S (no code) | —                            |
| Tent QR + receipt URL                                  | 0     | High                  | XS          | —                            |
| Square eGift Cards                                     | 0     | Medium                | XS          | —                            |
| **`/catering` page + estimator + form**                | **1** | **Very high**         | **M**       | Decisions 1, 3, 4            |
| Prerendering + per-page OG tags + real 404             | 1     | High                  | M           | —                            |
| Home hero rework + custom events + UTMs                | 1     | High                  | S           | —                            |
| Menu with prices + add-ons                             | 2     | High                  | S           | —                            |
| Shared market schedule + "this weekend" + Event schema | 2     | Medium–high           | M           | —                            |
| Viral-video section, testimonials, reviews             | 2     | Medium                | S           | Decision 6                   |
| `/corporate` page                                      | 2     | High                  | S           | Phase 1 form                 |
| Weekend Drop signup                                    | 3     | Medium                | S–M         | Square Marketing evaluation  |
| FAQ page; 2–3 local pages; catering blog posts         | 3     | Medium (long-term)    | M           | —                            |
| Retail interest list                                   | 3     | Low now, option value | XS          | —                            |
| Inquiries → DB + admin pipeline                        | 4     | Medium (ops)          | M           | ONLINE_ORDERING_PLAN Phase 0 |
| Announcement banner                                    | 4     | Medium                | S           | Deploy hook                  |
| Preorders / online ordering                            | 4     | High                  | L           | ONLINE_ORDERING_PLAN 1–8     |

**Immediate next action:** ship Phase 0.1–0.3 and 0.9 in one PR. In parallel,
get decisions 1–4 from Billy, so the `/catering` pricing config can be filled in
with real numbers.
