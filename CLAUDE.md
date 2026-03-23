# CLAUDE.md — Vietnam Dental Tourism Landing Page

## Overview

Single-page static landing page for dental tourism marketing, targeting international patients (primarily AU, US, UK). Promotes Greenfield Dental's implant, veneer, crown, and orthodontic services with cost-savings messaging.

**Live:** https://dentalvietnam.vn

## Repo & Deployment

- **Repo:** `github.com/trungdang712/vietnamdentaltourism` (branch: `master`)
- **Deploy:** Vercel (team: `greenfield-dental`, project: `vietnamdentaltourism`, ID: `prj_gA6UP1rPoX2K75J6PQYJkH8LiIWw`)
- **Auto-deploy:** Push to `master` → production on `dentalvietnam.vn`
- No build step — static HTML served directly

## File Structure

```
index.html              — Entire site: HTML + CSS + JS (~9,000 lines, single file)
google-apps-script.js   — Google Sheets webhook for lead backup (deployed separately in Apps Script)
robots.txt              — Basic crawl config
sitemap.xml             — Single-page sitemap
```

## Architecture

Everything is in `index.html` — no framework, no bundler, no dependencies. Inline `<style>` and `<script>` tags.

### CSS Variables

```css
--navy: #0c3535;
--navy-light: #164444;
--gold: #c49a6c;
--gold-light: #d4b080;
```

### Fonts

- **Headings:** Playfair Display (Google Fonts, loaded async)
- **Body:** DM Sans (Google Fonts, loaded async)

## Lead Capture — 5-Layer Safety Net

Leads are submitted through a multi-step consultation form (3 steps: Treatment → Contact → Timeline).

1. **Primary:** Greenfield API (`POST https://api.greenfield.clinic/api/contacts/dental-tourism`)
2. **Fallback:** Google Sheets webhook (`google-apps-script.js` — routes to `dentalvietnam` tab)
3. **LocalStorage backup** — stores unsent leads for retry
4. **Console logging** — for debugging
5. **Error alerting** — notifies on failure

### Google Apps Script

- Webhook URL is in `index.html` (search `SHEET_WEBHOOK`)
- Routes leads by form prefix: `dental-tourism-*` → `dentalvietnam` tab, others → `allon4vietnam` tab
- Alert email: `anass.l@nhakhoagreenfield.com`, CC: `trung@nhakhoagreenfield.com, hello@nhakhoagreenfield.com`
- Deploy via: Google Apps Script → Manage deployments → New version → Deploy

## Tracking & Analytics

- **GTM:** `GTM-P9F52DWS` (deferred load on first interaction)
- **Facebook Pixel:** `26443098325275263`
- **Google Ads:** Conversion `AW-11508258289/ak2wCKyC3PwZEPGryO8q` (fires on lead submit)
- **Google Consent Mode v2:** Default denied, updates on cookie accept

## Key Sections (in order)

1. Hero with quick assessment form
2. Trust bar (brand logos)
3. Why Vietnam / cost comparison
4. Treatment cards grid (implants, veneers, crowns, etc.)
5. Before/after gallery
6. Patient reviews
7. Doctor profiles
8. Journey steps (how it works)
9. Multi-step consultation form (main conversion)
10. FAQ
11. Footer

## Conventions

- **Never commit `.md` files** — markdown files (e.g. `SUMMARY-FOR-ANASS.md`, `lead-capture.md`, `SEO-DENTALVIETNAM-PROMPT.md`) are local docs only, not part of the deployed site
- **No build process** — edit `index.html` directly
- All CSS is inline in `<style>` tags (base styles + overrides + responsive)
- All JS is inline in `<script>` tags at the bottom
- Responsive breakpoints: 900px (tablet), 600px (small tablet), 480px (mobile)
- Images are in `/images/` directory (gitignored, hosted externally or inlined as base64)

## Related Projects

- **Greenfield Platform:** `/Users/trungdang/Dev - Greenfield Dental/greenfield-platform/` — main monorepo (API, staff portal, website)
- **AllOn4 Vietnam:** `allon4vietnam` Vercel project — separate landing page at `allon4vietnam.com`
- Both landing pages share the same Greenfield API for lead capture and Google Sheets webhook for backup
