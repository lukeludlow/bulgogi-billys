<div align="center">

<img src="src/assets/bulgogi_billys_icon.png" alt="Bulgogi Billy's Logo" width="120" />

# Bulgogi Billy's — Official Website

*A production web app built for a viral Korean-American food business.*

[![Live Site](https://img.shields.io/badge/Live%20Site-bulgogibillys.com-orange?style=for-the-badge)](https://bulgogibillys.com)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Live Site](#live-site)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Running Locally](#running-locally)

---

## Overview

Bulgogi Billy's is a Korean-American fusion food business based in the greater Houston, Texas area, serving farmers
markets
across The Woodlands, Conroe, and New Caney every weekend. After a candid video of the owner — filmed with smart
glasses — went viral on TikTok with over 24 million views, the business needed a professional web presence to match the
moment.

This site was built from the ground up to serve as the business's digital home: showcasing the menu, publishing the
weekly market schedule, handling catering inquiries, and telling the brand's story. It is deployed to production on
Vercel and fully optimized for search engines and social sharing. All food photography featured on the site was shot by me — I'm also a professional photographer.

---

## Live Site

**[bulgogibillys.com](https://bulgogibillys.com)**

---

## Features

**User-facing**

- Auto-playing image carousel with manual navigation controls (homepage hero)
- Menu page with all 3 signature items, photos, and descriptions
- Schedule page with market locations, hours, and direct Google Maps links
- Catering inquiry contact form with anti-spam honeypot (Web3Forms integration)
- Blog with individual post pages
- Dark mode toggle — respects OS preference, persists via `localStorage`
- Fully responsive, mobile-first design
- Social media links (Instagram, Facebook)

**Technical**

- Per-route SEO: unique `<title>`, `<meta description>`, and `<link rel="canonical">` on every page
- Open Graph meta tags for rich social media sharing previews
- JSON-LD structured data (`FoodEstablishment` + `LocalBusiness` schema.org types)
- `sitemap.xml` and `robots.txt` for search engine crawlability
- Vercel Analytics for traffic monitoring
- SPA routing with Vercel rewrite rules (`vercel.json`)

---

## Tech Stack

| Category      | Technology                      | Notes                                 |
|---------------|---------------------------------|---------------------------------------|
| Framework     | React 19 + TypeScript 6         | Strict TypeScript config              |
| Build Tool    | Vite 8                          | Path aliasing (`@/`) configured       |
| Styling       | Tailwind CSS 4                  | CSS-first config, custom dark variant |
| Routing       | React Router 7                  | Nested routes, SPA rewrites           |
| UI Components | Headless UI 2 + Catalyst UI Kit | Accessible, composable primitives     |
| Icons         | Heroicons 2                     |                                       |
| Animation     | Motion 12                       | Carousel transitions                  |
| Deployment    | Vercel                          | Auto-deploy from `main` branch        |
| Analytics     | Vercel Analytics 2              | Zero-config traffic tracking          |
| Forms         | Web3Forms                       | No-backend form submissions           |
| Typography    | Inter variable font             | `@fontsource-variable/inter`          |
| Linting       | ESLint 10 + TypeScript-ESLint   | `react-hooks` plugin                  |
| Formatting    | Prettier 3                      |                                       |

---

## Project Structure

```
src/
├── components/
│   ├── catalyst-ui-kit/          # Headless UI component library (27 components)
│   ├── dark-mode-toggle/
│   ├── icons/                    # Instagram, Facebook, Email SVG components
│   ├── PageMeta.tsx              # Per-route SEO head management
│   └── RestaurantStructuredData.tsx  # JSON-LD schema markup
├── pages/
│   ├── home/                     # Hero carousel + embedded About section
│   ├── menu/                     # Menu items with images and descriptions
│   ├── schedule/                 # Market locations with hours and map links
│   ├── contact/                  # Web3Forms catering inquiry
│   ├── blog/                     # Blog index and individual posts
│   └── not-found/
├── App.tsx                       # Layout shell (navbar + mobile sidebar)
└── main.tsx                      # Router config + Analytics bootstrap
public/
├── images/                       # Original food photography (shot by me) and brand assets
├── sitemap.xml
└── robots.txt
```

---

## Running Locally

```bash
git clone https://github.com/lukeludlow/bulgogi-billys.git
cd bulgogi-billys
npm install
npm run dev
```

Open `http://localhost:5173`. Requires Node 18+. No `.env` variables are needed to run the dev server — the Web3Forms
access key is public by design.
