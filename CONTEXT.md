Project: A1 Service Expert — automotive booking platform

Monorepo (pnpm workspaces)

- apps/booking-api: NestJS + Prisma (Postgres) + Redis. Domains: auth, catalog, availability/holds, vehicles (DVLA), bookings, documents, contact, settings, admin, rate limits, security.
- apps/booking-web: React + Vite + TypeScript + Tailwind. Public site, booking wizard, account area, admin console.
- packages/shared: shared pricing utils/types (engine tiers, service codes, mappings).

Key flows

- Catalog: GET /catalog serves services, tiers, prices. DB is the pricing source of truth.
- Vehicle (DVLA): POST /vehicles/vrm (rate-limited) returns { ok, allowManual, data? }. POST /vehicles/recommend-tier maps engine size to tier and price.
- Availability/Holds: GET /availability?date. POST /holds + DELETE /holds/:id manage short-lived Redis holds for slots.
- Booking: POST /bookings (JWT) creates draft/held booking; PATCH /bookings/:id/confirm (JWT + rate limit + Cloudflare Turnstile) finalizes, generates invoice/quote, emails.
- Account: GET /auth/me, GET /bookings/mine, GET /documents/:id/download (authz checked).
- Admin: /admin/\* (JWT + AdminGuard) for catalog/calendar/recipients/settings. Settings manages encrypted DVLA key and test lookup.

Security & rate limits

- Guards for signup rate limit, VRM lookup rate limit, booking confirmation rate limit.
- Turnstile guard: enforced when `TURNSTILE_SECRET` is set (or forced via settings); dev mode can allow bypass when disabled.

Important environment variables (apps/booking-api/.env)

- DATABASE_URL=postgresql://postgres:postgres@localhost:5433/a1_booking?schema=public (port must match Docker)
- REDIS_URL=redis://localhost:6379
- TURNSTILE_SECRET=<server key>
- SMTP_HOST/SMTP_PORT/SMTP_SECURE/SMTP_USER/SMTP_PASS
- MAIL_FROM_NAME="A1 Service Expert"
- MAIL_FROM_EMAIL=support@a1serviceexpert.com
- JWT_SECRET=change_me
- DVLA_API_KEY=... (stored encrypted in DB via Settings API)
- SETTINGS_ENCRYPTION_KEY=exactly 32 bytes (32 ASCII chars)
- DOCUMENTS_STORAGE_DIR=storage/documents, DOCUMENTS_BASE_URL=http://localhost:3000
- EMAIL_VERIFICATION_URL=http://localhost:5173/verify-email

Frontend routes (apps/booking-web/src/routes.tsx)

- Public: /, /services, /air-con, /diagnostics, /contact, /terms, /privacy
- Auth: /login, /register, /verify-email; Account: /account
- Booking wizard under /online-booking: services → vehicle → pricing → date-time → details-confirm → success
- Admin: /admin (Catalog, Calendar, Recipients, Settings)
- Dev: /dev (development utilities; restrict to admins in production)

Notable implementation details

- DVLA: API key resolved from encrypted DB settings with .env fallback; vehicle data briefly cached in-memory; engine size → tier mapping uses shared pricing helpers and DB prices.
- Holds: Redis keys `hold:{id}` and `slot-hold:{date}:{time}`; TTL based on Settings.holdMinutes.
- Documents: stored on disk and exposed via base URL; use pending URLs until finalization.

Testing

- Pricing regression test ensures catalog pricing matches booking totals.

Production hardening TODOs

- Add throttling/auth/CAPTCHA to holds endpoints.
- Restrict /dev page and remove from non-admin navigation.
- Add Turnstile or rate limits to contact form.

Windows quick start (PowerShell)

1. `pnpm.cmd install`
2. `docker-compose up -d`
3. Set env files as noted above (ensure DB port 5433 matches compose)
4. `pnpm.cmd --filter apps/booking-api prisma migrate deploy`
5. `pnpm.cmd --filter apps/booking-api prisma db seed`
6. Optional: `node scripts/create-demo-users.js`
7. API: `pnpm.cmd --filter apps/booking-api dev` Web: `pnpm.cmd --filter apps/booking-web dev`

---

# Booking UI Redesign — Status, Requirements & Plan

## Completed UI tweaks (October 2025)

- **Header**: logo swap to `logo-a1.png`, 2× sizing (desktop & mobile), WhatsApp + Call buttons retained, Back-to-Top button added.
- **Footer**: new grid layout with scaled logo, CTA buttons (Call / Email / WhatsApp), socials, and centered credit line linking to Nicolae Sterian on LinkedIn.
- **Home & Contact pages**: WhatsApp CTA added to “Get in touch” section and contact hero; contact form now enforces Name/Email/Phone/Message with inline validation + honeypot.
- **Changelog**: entries logged under 2025-10-27 for header/footer updates and Back-to-Top addition.
- **Phase 1 plumbing (2025-10-27)**: surfaced Turnstile + SMTP env configuration everywhere, switched Admin settings to the new captcha toggles, moved booking emails to Nodemailer, tightened API build output (`tsconfig.json` scoped to `src/**/*`, dev script uses `nest start --watch --entryFile main`), and verified builds with `pnpm --filter booking-web build` / `pnpm --filter booking-api build`.

## Work paused before redesign

No schema or booking-flow changes have been merged yet. We halted before partially-implemented changes could land to avoid mixing legacy and new UI/logic. Tag `pre-booking-redesign` marks the clean baseline. Pending work (listed below) remains outstanding.

## Original requirements (user brief)

> Booking UI Redesign, DVLA Modal, Turnstile, Admin wiring, Emails, Backups
>
> 0. Scope & invariants
>    Stack: React + Vite + Tailwind (web), NestJS + Prisma + Postgres + Redis (api), shared package for pricing helpers.
>    Do not break existing routes, auth, sessions, DVLA integration, holds, or booking confirmation logic.
>    One service at a time.
>    Keep existing time-slot logic; visual restyle only.
>    Append to docs/CHANGELOG.md in the same format already used (date, brief summary, files modified, testing notes).
>    Create a git tag and a feature flag so we can revert quickly.
>
> A) Step 1 – Services page redesign (Select service)
> Goal: Replace the current tier button rows with three service cards in our site style (dark cards, orange CTAs).
> ...
> _(full prompt preserved in repository history; see original user request dated 2025-10-27 for exhaustive detail)_

### Provided marketing copy for SERVICE 1/2/3 cards

```
SERVICE 1:
OIL AND FILTER — For all services please ensure your vehicle is dropped off between 09:00 am - 10:00 am so that we can have it ready for you by the end of the day. Please note, this is a booking only, card details are not required and payment will only be due after the work has been completed.

SERVICE 2:
INTERIM SERVICE — (same paragraph as above)

SERVICE 3:
FULL SERVICE — (same paragraph as above)
```

These snippets should be hard-coded in the new service cards while pricing, service names, and descriptions continue to come from the database/Admin panel.

## Clarifications received after Q&A

- Use the exact “SERVICE 1/2/3” titles and paragraphs above in the cards.
- Styling should extrapolate from current dark-slate/orange theme (no external mockups provided).
- Reuse existing DVLA lookup hooks/services, wrapped in a new modal with manual fallback.
- Turnstile keys are not yet available; document required env vars and prompt when needed.
- Email template should reuse `logo-a1.png` and match site colour palette.
- Admin refresh covers the entire panel (all screens) with new theme while ensuring flows still work (DVLA integration already verified).
- “Fixed Price Menu Servicing” table must be driven from DB prices and stay in sync between Services page and booking table. If data is missing, extend schema/seed to provide it.
- Feature flag named `USE_NEW_BOOKING_UI`; truthy values enable new flow.
- For the pricing table, mirror existing public-site layout (Service 1/Service 2/Service 3 columns) and ensure Admin edits immediately update both pages.
- Required SMTP + Turnstile env keys must be listed for quick population (see Env section below).

## Outstanding scope (high level)

1. **Service selection overhaul**

   - Replace legacy tier buttons with three dark-theme service cards using copy above.
   - Responsive grid: 3-up desktop, stacked on mobile/tablet.
   - “Price from £X” (lowest tier price) pulled live from DB. Guidance: use catalog summary endpoint once extended for pricing mode/fixed price.
   - Selecting a card opens the vehicle modal (see next section). Feature flag `USE_NEW_BOOKING_UI` controls access; fallback renders legacy UI.
   - Content source: service names/descriptions from DB/Admin; card body text overrides with supplied copy when relevant.

2. **Vehicle modal (DVLA + manual)**

   - Modal overlay (desktop) / full-height sheet (mobile) with focus trap & escape handling.
   - VRM input: yellow background, placeholder “Enter your registration”, disabled Continue state until input.
   - On submit: show “Searching DVLA…” with spinner while reusing existing lookup hooks. Rate limits and error handling respect current back-end guards.
   - DVLA success: show Make, Engine size (cc), options to “Search again” or “Enter manually”.
   - Manual entry collects registration/make/engine size (required). Use shared pricing helpers to resolve tier.
   - Once tier known, compute final price for selected service/tier (or fixed price). Buttons: Add to booking (primary), Cancel.
   - After Add: close modal, populate cart sidebar with service + vehicle + price.

3. **Cart sidebar & flow integration**

   - Desktop: right sidebar always visible summarising selection (service name, description excerpt, vehicle reg, price). Include actions: Continue, Start again, Login (if not authenticated), Remove service.
   - Mobile: collapsible drawer accessible via icon/button.
   - Transition to Date/Time step shows compact summary (service + reg + price) at top.

4. **Remaining booking steps**

   - Date/Time: visual restyle only, but include summary ribbon from cart.
   - Account/Details/Confirm: require login/register before confirm. Provide inline login form; on success show “Welcome back …”.
   - Registration block collects Title*, First name*, Surname*, optional company, Mobile*, Landline, address info with postcode search box (stub for future provider), address lines, Town/City*, County, Postcode*.
   - Booking preferences: SMS/email reminder checkboxes, notes textarea, T&C acceptance (links to /terms, /privacy).
   - Confirmation step integrates Cloudflare Turnstile token; show helpful error if missing/invalid.
   - On success, show styled confirmation page summarising booking and provide CTA to view booking.

5. **Pricing table refresh**

   - Shared component (services page + booking flow) that reads DB pricing (tiered or fixed).
   - Table headings: “Fixed Price Menu Servicing” + subheading text. Columns: Engine size | Service 1 | Service 2 | Service 3. Rows: Small (≤1200cc), Medium (≤1600cc), Large (≤2200cc), Extra-Large (>2200cc). Prices reflect DB values; missing price shows “—”.
   - Footnotes appended exactly as provided.

6. **Security & infrastructure**

   - Replace Google reCAPTCHA with Cloudflare Turnstile (web + API). Admin toggle “Require CAPTCHA in dev” forces usage locally.
   - Add feature flag `USE_NEW_BOOKING_UI` (env-driven, default true). Any falsy value (false/0/empty) serves legacy booking pages.
   - Migrate email delivery to SMTP (Microsoft 365 via GoDaddy). Remove Resend dependency.

7. **Admin upgrades**

   - Data model changes: add `pricingMode`, `fixedPricePence`, `footnotes` to services; ensure seeds include pricing data matching marketing table.
   - Admin Catalog editor: allow switching between tiered/fixed pricing, editing footnotes, managing both price modes.
   - Full UI restyle to match front-end theme (dark backgrounds, orange CTAs) while keeping functionality intact (catalog, calendar, recipients, settings, DVLA test, etc.).
   - Settings: replace `recaptchaEnabled` with `captchaEnabled` + `captchaRequireInDev` booleans.

8. **Email template**
   - Branded HTML email (logo, orange accent) summarising booking (service, vehicle, date/time, price) with CTA: “View my booking”.
   - Plain text fallback. If SMTP env values missing, log email instead (development behaviour).

## Phased implementation plan (recommended)

1. **Platform plumbing**: swap reCAPTCHA → Turnstile (web/API), introduce SMTP mailer, update settings/admin toggles.
2. **Data model**: extend Prisma schema (`ServicePricingMode`, `fixedPricePence`, footnotes; `captchaEnabled` fields; relax booking-service tier constraints). Update seeds and migrations.
3. **Feature flag**: read `USE_NEW_BOOKING_UI` in web app to choose legacy vs new booking flow.
4. **Service selection**: build new cards, integrate modal + cart, ensure DB-driven pricing.
5. **Vehicle modal & cart**: DVLA/manual workflows, price resolution, summary state.
6. **Downstream flow**: restyle Date/Time, build account/register forms, integrate Turnstile on confirm, send new email.
7. **Pricing table**: reusable component showing live data across pages.
8. **Admin theming & wiring**: update forms/theme, verify catalog/price edits, DVLA test, settings toggle.
9. **Testing & docs**: document env keys, update changelog, note revert steps.

The above plan keeps the repo stable between milestones; each phase should conclude with a changelog entry and verification notes.

## What changed so far (files and rationale)

This session introduced non-breaking prep for the redesign (Turnstile/SMTP/plumbing) and UI upgrades already visible. No legacy booking logic was removed; feature work stops short of mixing old/new flows.

- apps/booking-web/src/components/HeaderLogo.tsx — swapped to `logo-a1.png` and adjusted sizes (2× mobile/desktop).
- apps/booking-web/src/components/Footer.tsx — added new responsive footer with CTA buttons (Call/Email/WhatsApp), socials, and centered credit.
- apps/booking-web/src/components/BackToTop.tsx — added accessible back-to-top button with reduced-motion support.
- apps/booking-web/src/App.tsx — integrated Footer + BackToTop; maintained header buttons and centered mobile menu links.
- apps/booking-web/src/pages/HomePage.tsx — added WhatsApp CTA to “Get in touch” block.
- apps/booking-web/src/pages/ContactPage.tsx — required Name/Email/Phone/Message; inline errors; honeypot; WhatsApp CTA.
- apps/booking-api/prisma/schema.prisma — added `ServicePricingMode` enum; extended `Service` with `pricingMode`, `fixedPricePence`, `footnotes`; replaced `recaptchaEnabled` with `captchaEnabled`/`captchaRequireInDev`; set `Booking.serviceCode` to text; made `BookingService.engineTierId` optional.
- apps/booking-api/prisma/migrations/20251027120000_booking_redesign/migration.sql — migration for the schema changes above (non-destructive in dev; review carefully for prod).
- apps/booking-api/prisma/seed.ts — preserved SERVICE_1/2/3 with footnotes, ensured price seeds; set `captchaEnabled` fields.
- apps/booking-api/tsconfig.json — restrict compilation to `src/**/*` so Nest outputs `dist/main.js` for dev runs.
- apps/booking-api/src/catalog/dto/create-service.dto.ts — DTO extended for `pricingMode`, `fixedPricePence`, `footnotes`.
- apps/booking-api/src/catalog/dto/update-service.dto.ts — DTO extended for `pricingMode`, `fixedPricePence`, `footnotes`.
- apps/booking-api/src/catalog/catalog.service.ts — service summary now exposes pricing fields; create/update honor them.
- apps/booking-api/src/security/\* — replaced Google reCAPTCHA with Cloudflare Turnstile: added `turnstile.guard/service/decorator`, removed recaptcha files, updated `security.module.ts`.
- apps/booking-api/src/bookings/bookings.controller.ts — switched confirm guard to Turnstile.
- apps/booking-api/src/auth/auth.controller.ts — switched register guard to Turnstile.
- apps/booking-api/src/bookings/dto/create-booking.dto.ts — made `engineTierId` optional to support fixed-price services.
- apps/booking-api/src/bookings/bookings.service.ts — createBooking now supports fixed-price or tiered services, choosing price accordingly; stores `serviceCode` (string) and optional `engineTierId` on line item.
- apps/booking-api/src/email/email.service.ts — replaced Resend with Nodemailer SMTP and a branded HTML template using `logo-a1.png`; logs emails if SMTP not configured.
- apps/booking-api/package.json — removed Resend, added Nodemailer.
- apps/booking-api/.env.example & apps/booking-web/.env.example — refreshed with Turnstile/SMTP keys and `USE_NEW_BOOKING_UI` flag.
- apps/booking-web/src/features/admin/SettingsManager.tsx — switched to `captchaEnabled` + `captchaRequireInDev` toggles.
- README.md — updated instructions for Turnstile, SMTP, new env keys, and fallback guidance.
- docs/CHANGELOG.md — entries for header/footer/back-to-top, scoping/context update.

Note: A git tag `pre-booking-redesign` was created before these changes for quick rollback.

## Remaining to implement / verify

- Frontend

  - Feature flag wiring: `USE_NEW_BOOKING_UI` to toggle new booking UI (legacy retained when false).
  - Service cards UI (dark/orange), “Price from £X” (DB, lowest tier), click opens modal.
  - Vehicle modal (DVLA/manual), focus trap, animations, manual engine size → tier mapping, “Add to booking”.
  - Cart sidebar/drawer; compact summary at Date/Time step.
  - Account/Register in-flow, address lookup stub, Turnstile widget on Confirm.
  - Shared pricing table component (services + booking) from live DB; footnotes.
  - Admin theme refresh (dark/orange) and overall polish (captcha toggles now live).

- Backend

  - Catalog summary: ensure web gets `pricingMode`, `fixedPricePence`, `footnotes` (partially done). Add “lowest tier price” helper if useful.
  - Admin endpoints/forms: surface `pricingMode` and `fixedPricePence`; persist `footnotes`.
  - Confirm endpoint: already wired to Turnstile guard; verify end-to-end once site key/secret exist.
  - Email confirmation: confirm payload includes vehicle make/reg and booking link; verify with SMTP.

- Data

  - Ensure seeds/prices match “Fixed Price Menu Servicing” table and are editable in Admin.
  - Validate engine tier thresholds: Small 1200, Medium 1600, Large 2200, XL >2200.

- Testing / a11y
  - Keyboard navigation, focus rings, contrast, touch targets ≥44px, prefers-reduced-motion.
  - End-to-end booking flow with both fixed and tiered services.
- Ensure API dev server (`pnpm --filter booking-api dev`) is running alongside the web app; otherwise `/catalog` fetches will fail with `net::ERR_CONNECTION_REFUSED` in the browser console.
- After swapping from Resend to SMTP, delete `apps/booking-api/dist` or run `pnpm --filter booking-api build` to regenerate compiled output—otherwise the Nest dev server may still require the old `resend` module.
  - `pnpm --filter booking-api dev` now runs `nest start --watch --entryFile main`; combined with the `tsconfig.json` update it stops the dev server from looking for `dist/src/main`.

## Backups & revert instructions

- Git backup: `git tag pre-booking-redesign` has been created before the redesign code.
  - Hard revert code: `git checkout pre-booking-redesign` (detached) or `git revert <commit-sha>` on main branch.
- Feature flag fallback (UI only): set `USE_NEW_BOOKING_UI=false` in `apps/booking-web/.env` and restart the web server to restore legacy booking UI without code rollback.
- Database (dev) rollback:
  - If the new migration is applied locally and you want a clean reset: `pnpm --filter apps/booking-api prisma migrate reset` then `pnpm --filter apps/booking-api prisma db seed`.
  - For production, plan an explicit down migration or maintenance window; do not run reset in production.
- Current blocker (Oct 27): resolved. Shared pricing helpers now ship as a workspace package (`@a1/shared`) that builds dual CJS/ESM outputs; API/web import from `@a1/shared/pricing` so Nest no longer crashes with `ReferenceError: exports is not defined` when running `pnpm --filter booking-api dev`.
- After pulling Phase 1, run `pnpm.cmd --filter booking-api exec prisma migrate reset --force` (or migrate deploy + seed if you can’t drop data) to apply the `Service.pricingMode` migration; earlier scripts referenced `serviceCode` with the wrong casing and now use `"serviceCode"` so the reset succeeds.

## Dev Runtime Notes (Oct 27)

- API/dev servers

  - If `EADDRINUSE: address already in use :::3000` appears, free the port:
    - `netstat -ano | findstr :3000` → `taskkill /PID <pid> /F`.
  - Start API: `pnpm.cmd --filter booking-api dev` (from repo root).
  - Start Web: `pnpm.cmd --filter booking-web dev` (from repo root).
  - Vite may show a CJS deprecation notice and React Router v7 future flags warning — informational only.
  - We now opt into Router v7 `startTransition` to quiet the warning; the Vite CJS Node API deprecation notice can be safely ignored (we are not using the Node API directly).

- Database
  - For a clean dev environment after Phase 1, run: `pnpm.cmd --filter booking-api exec prisma migrate reset --force`.
  - If preserving data: `pnpm.cmd --filter booking-api exec prisma migrate deploy` then `pnpm.cmd --filter booking-api exec prisma db seed`.

## Plan (next phases)

1. Complete Catalog summary for redesigned UI

- Confirm `GET /catalog` includes `pricingMode`, `fixedPricePence`, `footnotes`, and `lowestTierPricePence` (now added).

2. Booking UI redesign (flagged)

- Implement service selection cards and vehicle modal under `USE_NEW_BOOKING_UI`.
- Cart sidebar/drawer; surface summary on Date/Time; preserve routes/auth/DVLA.

3. Downstream + security

- Inline auth/register before confirmation; Turnstile kept; email template stable.

4. Testing + regression

- Extend pricing regression test to cover `@a1/shared` import surfaces and fixed/tiered pricing consistency.

## Open Questions

- SMTP credentials and Turnstile keys: keep current permissive dev defaults; reminder to enforce before QA/UAT.
- Production migration: use non-destructive `migrate deploy` path (no reset). Migration applies defaults, then drops default; no data loss. Documented and validated locally.
- Lowest-tier price: computed server-side in `/catalog` for consistency and simpler clients; web types updated, UI can consume when needed.
- React Router v7: opted into `v7_startTransition`; other v7 flags will be evaluated during the redesign.

## Reminder (Dev Defaults)

- Before final testing/release hardening, enforce real SMTP and Turnstile in dev/stage to validate end-to-end behavior. Current dev defaults are permissive by design during Phase 2.

## Scope for upcoming redesign

1. **Service selection overhaul**

   - Replace tier button rows with three dark-theme cards (“SERVICE 1/2/3”) using provided copy.
   - 3-card responsive grid (stack on mobile); “Price from £X” (lowest tier) pulled live from DB.
   - Selecting a card launches new vehicle modal; feature flag `USE_NEW_BOOKING_UI` (default true) to toggle legacy UI.

2. **Vehicle modal**

   - Wrap existing DVLA lookup in modal (yellow VRM input, spinner, manual fallback).
   - Resolve tier/price dynamically; allow manual entry; add “Add to booking” & “Cancel”.

3. **Cart sidebar / booking flow**

   - Desktop: right-side summary panel (service, reg, price, Continue, Start again, Login).
   - Mobile: collapsible drawer variant.
   - Upstream summary shown at top of Date/Time step.

4. **Downstream booking steps**

   - Enforce login/register prior to confirmation; inline auth with data persistence.
   - Register form (Title, Name, Surname, optional company, Mobile\*, Landline, address lookup stub, reminders, notes, T&C checkbox).
   - Confirmation uses Cloudflare Turnstile (see section 6); on success show styled summary + send SMTP booking email.

5. **Pricing table refresh**

   - DB-backed “Fixed Price Menu Servicing” table reused on services page & booking flow (dynamic prices/tier thresholds).
   - Table columns: Engine size | Service 1 | Service 2 | Service 3; rows for Small/Medium/Large/XL and footnotes.

6. **Security & infrastructure**

   - Replace Google reCAPTCHA with Cloudflare Turnstile (web + API); Admin toggle “Require CAPTCHA in dev”.
   - Introduce SMTP mailer (Microsoft 365 via GoDaddy) replacing Resend; env keys listed below.
   - Add feature flag `USE_NEW_BOOKING_UI` (truthy values enable new flow).

7. **Data model / Admin updates**

   - Extend `Service` with `pricingMode` (tiered|fixed), `fixedPricePence`, `footnotes`.
   - Update Admin Catalog forms to manage pricing mode, footnotes, and fixed price.
   - Full Admin theme refresh (dark/orange) while validating existing endpoints (catalog, calendar, recipients, DVLA test, settings).

8. **Email template**

   - Branded HTML + plain text using `logo-a1.png`, includes booking summary, contact info, and “View my booking” CTA linking to account view.

9. **Backups & revert strategy**
   - Git tag `pre-booking-redesign` already created (baseline before new work).
   - Env flag fallback: set `USE_NEW_BOOKING_UI=false` to restore legacy booking UI without code rollback.
   - Hard revert: `git checkout pre-booking-redesign` or `git revert <commit>`.

## Required environment keys (to be populated when implementing Turnstile/SMTP)

### Web (`apps/booking-web/.env`)

- `VITE_TURNSTILE_SITE_KEY=`
- `USE_NEW_BOOKING_UI=true`
- `SMTP_HOST=`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- `SMTP_USER=support@a1serviceexpert.com`
- `SMTP_PASS=`
- `MAIL_FROM_NAME="A1 Service Expert"`
- `MAIL_FROM_EMAIL=support@a1serviceexpert.com`

### API (`apps/booking-api/.env`)

- `TURNSTILE_SECRET=`
- `SMTP_HOST=`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- `SMTP_USER=support@a1serviceexpert.com`
- `SMTP_PASS=`
- `MAIL_FROM_NAME="A1 Service Expert"`
- `MAIL_FROM_EMAIL=support@a1serviceexpert.com`

> Populate the keys once credentials are issued; keep “Require CAPTCHA in dev” toggle accessible via Admin settings.

# Phase 2�8 Plan (accepted)

Phase 2 � Service Cards + Vehicle Modal (MVP)

- 3 black cards (SERVICE 1/2/3), orange CTAs, �Price from �X� via `lowestTierPricePence`.
- Vehicle modal skeleton (yellow VRM input), open on Select, feature-flagged via `USE_NEW_BOOKING_UI`.

Phase 3 � Vehicle Modal Full + Cart Sidebar

- DVLA lookup + manual fallback, resolve tier/price from DB.
- Cart Sidebar (desktop) and mobile drawer; summary at Date/Time step.

Phase 4 � Downstream: Auth, Details, Confirm

- Inline login/register with persistence; details form per spec; Turnstile on Confirm; SMTP email.
- Keep dev SMTP/Turnstile permissive; enforce before QA/UAT.

Phase 5 � Pricing Table

- DB-driven �Fixed Price Menu Servicing� table with footnotes; reused across pages.

Phase 6 � Admin Wiring + Model

- Admin forms: `pricingMode`, `fixedPricePence`, `footnotes`; dark/orange theme; non-destructive migrate path for prod.

Phase 7 � Accessibility & Polish

- Focus trap, aria labels, keyboard nav, 44px targets, en-GB currency, animation tidy.

Phase 8 � Testing, Docs, Release Prep

- Pricing regression for fixed/tiered; UI smoke list; update docs; keep feature flag fallback.

## Phase 2 Status

- Implemented black ServiceCard grid and VehicleModal skeleton behind flag; legacy UI retained.
- Next: complete DVLA + manual flow in modal and Cart Sidebar (Phase 3).

## Recent Implementation Summary (2025-10-27)

- Shared package and module format

  - Converted `packages/shared` to `@a1/shared` with dual CJS/ESM builds; API and Web import via `@a1/shared/pricing`.
  - Removed stale compiled JS from `packages/shared/src` to avoid ESM/CJS mismatch.

- Prisma migration and data sync

  - Fixed quoting in migration to alter `"Booking"."serviceCode"` correctly.
  - For clean dev sync ran: `pnpm.cmd --filter booking-api exec prisma migrate reset --force` (or `migrate deploy` + `db seed` non-destructive path).

- Catalog enhancements

  - `GET /catalog` now includes `lowestTierPricePence` per service (FIXED uses `fixedPricePence`; TIERED uses min tier price).
  - Web types updated to include `pricingMode`, `fixedPricePence`, `footnotes`, `lowestTierPricePence`.

- Frontend runtime notes

  - Opted to avoid Router v7 type friction; build remains green and dev warning is informational. May revisit full v7 flags with compatible typings.
  - Vite CJS Node API deprecation notice is non-blocking; no Node API usage in the app code.

- Phase 2 � Service cards + vehicle modal (scaffold)

  - Added black ServiceCard grid (SERVICE 1/2/3) with �Price from �X� and orange CTAs.
  - Added VehicleModal skeleton (yellow VRM input UI, cancel/close, a11y basics).
  - Gated by `USE_NEW_BOOKING_UI` (legacy flow intact when false).
  - Files:
    - `apps/booking-web/src/components/ServiceCard.tsx` (new)
    - `apps/booking-web/src/components/VehicleModal.tsx` (new)
    - `apps/booking-web/src/features/booking/steps/ServicesStep.tsx` (wired grid + modal)

- Next (Phase 3)
  - Complete DVLA + manual fallback inside VehicleModal, resolve tier/price from DB, update cart state.
  - Implement Cart Sidebar (desktop) and mobile drawer; show compact summary at Date/Time.

## Phase 3 Specification (locked 2025-10-27)

User/Nicolae requested and confirmed the following for Phase 3:

- Cards pricing source

  - Keep �Price from �X� reading from live DB (Small tier price). Admin prices are set to: Service 1 �79.95, Service 2 �119.95, Service 3 �179.95.

- Pricing table placement

  - Add a DB-driven �Fixed Price Menu Servicing� table directly below the cards with comfortable spacing (�48�64px). Reuse later on the Services page. Add a tasteful logo placement (small logo above the table heading) � to be implemented.

- Vehicle modal (match the design; our styling)

  - Yellow full-width VRM input with placeholder �Enter your registration�.
  - Continue button to the right on desktop, below on mobile; disabled until input; Enter submits.
  - Inline link under input: �You can enter details manually here� � switches to manual entry within the same modal.

- Behavior

  - On submit: spinner + �Searching DVLA��, uppercase/trim VRM.
  - On success: show Make (and Model if present), rounded engine size (e.g. �1999 cc�), resolved tier, and final price; links �Search again� and �Change details�; primary button labeled �Continue�.
  - On failure or rate limit: show friendly error and reveal the manual entry panel.

- Manual entry

  - Required fields: VRM, Make, Engine size (cc). Optional: Model.
  - After valid manual inputs, show a confirmation step mirroring DVLA success (Make/Model/CC/Tier/Price) with primary �Continue�.

- Fuel type dropdown (informational only, does not affect price)

  - Options: Petrol, Diesel, Hybrid, Petrol/Electric, CNG, LPG, Electric, Petrol / E85 (Flex Fuel), Diesel/Hybrid, Diesel/Electric. Captured with the booking but not used in pricing.

- GB VRM validation (user-friendly strict)

  - Client: uppercase, strip spaces; accept modern format and common legacy/personalized patterns (excluding I and O to avoid confusion; allow Q-plates). Server treats VRM as opaque to avoid blocking edge cases.

- Make/Model suggestions (offline)
  - Option 1 adopted: curated lists stored in the repo (brands + popular models) for autosuggest; model remains free-text with suggestions.

Implementation plan for Phase 3

1. Vehicle modal DVLA integration

- Add VRM normalization + validation; submit to DVLA endpoint; handle spinner/success/error states; �Search again�.
- On success, compute tier and price; show summary with primary �Continue�.

2. Manual entry panel

- Required field validation; engine size normalization; compute tier and price; show summary; �Continue�.

3. Cart update on confirmation

- When �Continue� is clicked on either DVLA or manual path, close modal and update the cart with service, VRM, tier, and price.

4. Pricing table component

- Render a DB-driven table below cards with footnotes; add spacing and small logo above heading.

5. Docs & tests

- Append CHANGELOG & CONTEXT as parts land; extend smoke checklist for modal flows.

## Phase 3 � Implementation progress (2025-10-27)

- VehicleModal implemented with:
  - Yellow VRM input + Continue (desktop right / mobile below), Enter submits, inline manual-entry link (�here�).
  - DVLA path: spinner + Searching DVLA�; on success shows Make/Model/CC/Tier/Price; actions Search again + Continue.
  - Manual path: required VRM/Make/Engine size (cc); Model optional; fuel type captured. On resolve, shows confirmation with Continue.
  - On Continue, cart updates with VRM, tier and price; modal closes.
- Fixed Price Menu Servicing table component added below cards, DB-driven, with spacing. Reuse on Services page later.
- Next: add curated Make/Model suggestions JSON and wire autosuggest; refine validation messages; add compact summary at Date/Time step; Cart Sidebar (desktop) + mobile drawer.

- Cart Sidebar (desktop) implemented in layout; mobile drawer pending. Sidebar reflects VRM and price after modal confirmation; Continue advances the step; Start again clears draft.
- Manual entry now includes offline Make/Model suggestions (curated JSON in repo). VRM validation uses user-friendly strict GB formats (current + common legacy/personalized + Q plates).
- Date/Time step shows a compact summary (service, VRM, price) above the calendar.
- Mobile cart drawer: pending next � current sidebar appears on desktop.
- Mobile cart drawer added: sticky bar with price and slide-up drawer on small screens; desktop sidebar unchanged. Continue drives step forward; Start again clears draft.

## Phase 3 Progress � Vehicle modal, pricing table, carts (consolidated)

- Vehicle modal finalized: DVLA lookup with spinner and message �Searching DVLA��, manual fallback with required VRM/Make/Engine size, Model optional, Fuel type captured. Confirmation shows Make/Model/CC/Tier/Price with actions: Change details | Continue.
- Helper copy: under VRM input �We�ll use DVLA to look up your vehicle. You can enter details manually here� where �here� switches to manual.
- GB VRM validation: user-friendly strict GB pattern; plates uppercased and spaces stripped.
- Service cards� �Price from �X� reads live from DB; Admin changes reflect instantly. Pricing table added under cards with extra spacing and a small A1 logo above the heading.
- Cart Sidebar (desktop) and Mobile Cart Drawer implemented; after Continue, cart shows service, VRM, and price; Continue advances; Start again resets.
- Date/Time compact summary shows service + VRM + price at the top.

## User Clarifications (Nicolae) � decisions locked

- Card prices from DB; Small tier targets: �79.95, �119.95, �179.95 (set in Admin).
- Manual entry fuel types: extended options list; informational only for now.
- Primary CTA label: Continue (not Add to booking); include Change details link.
- Pricing table placement: below cards with spacing; include A1 logo.
- Make/Model suggestions: curated offline lists in repo.
- VRM validation: strict GB pattern but user-friendly; minimize false negatives.

## Issues encountered & fixes

- Long-running dev command: `pnpm --filter booking-api dev` is a watch server and keeps the terminal attached; use a second terminal or build commands for non-blocking checks.
- Port 3000 conflict (EADDRINUSE): free the port with `netstat -ano | findstr :3000` ? `taskkill /PID <pid> /F` and retry.
- Shared package crash (`ReferenceError: exports is not defined`): converted `@a1/shared` to dual CJS/ESM with proper exports map; API/Web import from `@a1/shared/pricing`.
- Prisma migration quoting: fixed `"Booking"."serviceCode"` cast; dev reset via `pnpm.cmd --filter booking-api exec prisma migrate reset --force`; non-destructive via `migrate deploy` + `db seed`.

### 2025-10-28 � Phase 4 groundwork (Codex session)

- Replaced the legacy Vehicle step with a �Booking summary� route that follows the vehicle modal and feeds directly into Date & Time. Updated `BookingWizard` to show the shortened four-step flow and to surface a persistent Login button in the header area.
- Restyled the desktop cart sidebar and mobile drawer with richer service copy, VRM/make/tier metadata, and tighter navigation that records step completion against the new ordering.
- Extended booking draft/customer typings in preparation for the details form (title, first/last name, multi-line address, SMS opt-in, terms flag). Began mirroring those fields in `CreateBookingDto`, Prisma schema, and booking service writes; follow-up validation/migrations still needed.
- Removed the old `DetailsConfirmStep` component to make room for the Phase 4 confirm-booking experience (account login/register + structured details form). A fresh implementation is still required before the flow is functional.
- Added groundwork for inline account creation/login (Cloudflare Turnstile enforcement, register-then-login flow) but wiring is incomplete pending the new confirm step.

## Next phases

- Phase 4: Account / Details / Confirm with Turnstile; enforce login/register; confirmation page and SMTP email.
- Phase 5: Admin theming and service model extensions; live wiring; footnotes.
- Phase 6: Accessibility polish, curated dataset expansion, responsive refinements; QA.

### 2025-10-28 - Phase 4B plan (Account + confirmation experience)

**Objective:** Complete the new confirm-booking and account experience with persistent customer profiles, polished UI, and end-to-end notifications.

**Scope headlines**

- Expand the `User` model to store full contact/profile data captured during booking (title, names, address lines, company, phone numbers, notes, marketing opt-in) plus audit fields (account created at, IP address on registration, latest profile update). Introduce a `UserSession` table to record login timestamps and originating IP.
- Update NestJS DTOs, Prisma service methods, and auth flows so registration writes the new fields, profile updates persist via `/account` endpoints, and booking confirmation syncs user details when provided.
- Rebuild the confirm step UI to align with the dark card aesthetic: logged-in header menu swaps Login for a profile dropdown (title/name fallback to email); logged-out flow requires full details alongside account creation with Turnstile gating; remove redundant booking summary panel; confirm button state issues resolved.
- Refresh the My Account page: remove email verification messaging, add hero actions (Book another visit + logout), add editable cards for personal details and change password, show booking history with drill-through to a dedicated booking detail page (CTA back into the wizard). Admin users hitting `/account` should redirect into the admin dashboard.
- Wire new booking confirmation emails (customer + staff) using refreshed templates, ensuring staff distribution includes all configured recipients plus `support@a1serviceexpert.com`.
- Surface Turnstile controls in admin settings, remove legacy reCAPTCHA code, and keep local/dev bypass logic documented.

**Implementation notes**

- Prisma migration will add columns to `User`, new `UserSession` table, and adjust related DTOs/tests. Seed script must populate sensible defaults.
- API endpoints: extend auth register/login responses, add profile CRUD routes, adjust booking confirmation service to trigger email jobs and update user details.
- Frontend: update shared auth context, header, confirm step, account pages, booking history route, and hooks/state to reflect new data model. Ensure TypeScript types align (shared package updates as needed).
- Emails: create MJML/HTML templates under API email module with brand styling (logo `logo-a1.png`, friendly professional copy) for both customer confirmation and staff notification.
- QA checklist: registration with full details, Turnstile disabled/enabled scenarios, booking confirmation while logged in/out, account edits persisting, booking history detail page, email deliveries (logged to console in dev), session logging verified in DB.

### 2025-10-28 - Confirm booking rebuild (Codex session)

- Implemented the new �Confirm booking� layout with a desktop two-column grid (forms + booking summary card) and numbered sections for Account information, Your details, and Booking details. Updated copy to �Confirm booking� and ensured stepper/step titles match.
- Added inline login support: the header Login button opens a collapsible sign-in form inside the account card, authenticates in place, and collapses once the session is established. Account creation still runs register ? login while writing to the draft.
- Persisted reminders, terms acceptance, and `bookingNotes` through the booking draft so returning users see their saved answers; normalised UK postcodes and trimmed data before submission.
- Extended `CreateBookingDto` / `BookingsService` to accept the new `bookingNotes` payload and to timestamp `acceptedTermsAt`, keeping backend data aligned with the form.
- Updated draft context/types to carry `loginPanelOpen`, avoided duplicate �Start again� buttons at the top, and refreshed summary cards to match the latest visual spec.
- Build verification: `pnpm.cmd --filter booking-web build`, `pnpm.cmd --filter booking-api build`.

### Remaining work after 2025-10-28 updates

- Review and apply the outstanding Prisma migration(s) that introduce the new booking/customer columns before promoting to shared environments.
- Audit downstream consumers (customer emails, admin dashboards, account history) to surface the new contact/address/notes fields.
- Replace the temporary reCAPTCHA widget with the planned Cloudflare Turnstile integration for both account creation and booking confirmation, honouring settings feature flags.
- Complete responsive/UX polish for the confirm step (mobile spacing, login panel behaviour, focus management).
- Resume the rest of Phase 4 deliverables: success page refresh, email copy, feature-flag toggles, and end-to-end QA.

### 2025-10-28 - Troubleshooting notes

- **500 on POST `/holds` after choosing a time slot**
  - Symptom: UI toasts �Internal server error�, network tab shows `/holds` 500, and navigating to the confirm step occasionally crashes because the API is unavailable.
  - Root cause: the Nest API watcher was already running from a previous session, so rerunning `pnpm.cmd --filter booking-api dev` started a second process that immediately failed with `EADDRINUSE: address already in use :::3000`. Because the command crashed, no API was listening and the web app logged 500s when it attempted to create a hold.
  - Fix: stop the stray Node process that still has port?3000 open (see commands below), then restart the API watcher in a fresh terminal.
- **Port 3000 in use (Windows)**
  - Find the PID: `netstat -ano | findstr :3000`
  - Terminate it: `Stop-Process -Id <PID>` (or `taskkill /PID <PID> /F`).
  - Re-run the API watcher once the port is free.
- **ESLint warnings in `DetailsConfirmStep.tsx`**
  - `@typescript-eslint/no-unused-vars: 'location'` ? removal of the unused `useLocation` import and variable resolves this.
  - `react/no-unescaped-entities` for contractions fixed by escaping to `&apos;`.

### 2025-10-28 - User request recap & delivery plan (Codex session)

**Summary of user direction**

- Logged-in users should see a header profile pill showing their stored title/name (falling back to email) with menu actions: Edit details, View bookings, Log out. Each action should route into the My Account experience rather than inline modals.
- The legacy contact/login panel on the confirm-booking step must be redesigned with the darker �card� aesthetic, remove redundant summary panels, and require the full personal details inline when creating an account while logged out.
- Account creation/confirmation must capture full customer profile details, store them on the `User` record (title, names, addresses, phones, marketing opt-in, notes, timestamps, registration IP), and log login sessions (IP/timestamp) in a dedicated table.
- The My Account page needs a refresh: drop email verification messaging, retain the hero with welcome + �Book another visit�, add editable cards for profile details and change-password, show booking history cards that navigate to a dedicated booking detail view. Admins should be redirected to the admin dashboard instead of seeing this page. Booking detail view should expose the full booking summary with a �Book another visit� CTA.
- Replace Google reCAPTCHA with Cloudflare Turnstile across registration/confirmation, keep dev bypass, and expose an admin toggle to disable/enable it. Remove any lingering Google widget.
- Confirmation emails should use new templates (customer + staff), send to all configured recipients plus `support@a1serviceexpert.com`, and match the brand styling using `logo-a1.png`.
- Ensure the confirm button enables correctly once all data is valid, and wire confirmation emails + staff notifications post-confirmation.

**What has been documented so far**

- No functional code changes were applied in this session; earlier exploratory edits were reverted to keep the tree unchanged.
- This note captures the agreed requirements so future sessions can proceed methodically.

**Proposed sub-deliverables**

1. **Data & Auth foundation**
   - Extend Prisma schema (`User`, new `UserSession` table) and run migrations.
   - Update auth/register/login DTOs & responses to handle the richer profile fields, auto-verify email for now, and log sessions.
   - Add account/profile API endpoints for fetching/updating profile data and changing password.
2. **Email service & Turnstile swap**
   - Replace reCAPTCHA widget with a Turnstile wrapper on the web app; adjust env typings and admin toggles.
   - Implement the new customer/staff confirmation email templates and ensure staff list includes `support@a1serviceexpert.com`.
3. **Booking confirm step rebuild**
   - Redesign the confirm step UI with the dark panels, enforce full profile capture for new accounts, handle login dropdown behaviour, and fix confirm-button enablement. Remove redundant �Your booking� mid-panel.
4. **Header/profile menu & routing**
   - Introduce the logged-in profile pill with dropdown actions, ensure routes take users to the appropriate account sections, and hide Dev Tools for non-admin users.
5. **Account area refresh**
   - Replace the verification messaging, add editable profile card, change-password card, booking history list linking to new detail pages, and ensure admin users redirect to admin dashboard.
6. **Booking detail view & history**
   - Build the dedicated booking summary page with full information and CTA back to the booking wizard; ensure history list links correctly.
7. **QA & polish**
   - Run through full booking flow (logged in/out), verify Turnstile toggles, inspect stored profile/session records, and capture screenshots/documentation.

Each deliverable can be tackled in a focused session to keep changes reviewable and avoid context loss.

### 2025-10-29 - Data & Auth foundation implementation (Codex)

- Expanded the Prisma `User` model/migration to persist the full profile metadata (title, names, company, phones, address lines 1�3, city, county, postcode, marketing opt-in, notes, registration IP, profile timestamps) and introduced the `UserSession` table for login tracking.
- Added profile validation helpers (`common/utils/profile.util.ts`, `common/validation/profile.constants.ts`) and refreshed auth DTOs/responses so registration captures the complete profile, auto-marks email addresses as verified, and surfaces the richer `PublicUser` shape.
- Updated `AuthService` to sanitise inputs, normalise postcodes, persist registration IP/profile timestamps, and record login sessions (IP + user agent) alongside `lastLoginAt`; `AuthController` now delivers the expanded payload under Turnstile protection.
- Created the account module with JWT-guarded `/account/profile` GET/PATCH endpoints and a `/account/change-password` PATCH handler, reusing the sanitisation utilities and Prisma updates.
- Registered the account module in `AppModule`, generated the supporting migration artefacts, and ensured seeds compile with the new schema snapshot.
- Testing: `pnpm.cmd --filter booking-api test -- --config jest.config.ts` (fails because `src/__tests__/pricing-regression.spec.ts` still references the legacy `customer.name` field rather than the structured customer profile properties).

### 2025-10-29 - Turnstile swap & email templates (Codex)

- Replaced the confirm-step security check with the new `TurnstileWidget`, updated validation wording, and cleaned up admin settings/env hints so the UI reflects Cloudflare terminology (including `.env.example` using `VITE_USE_NEW_BOOKING_UI`).
- Refreshed the settings panel copy to refer to Turnstile toggles explicitly, keeping the dev bypass explanation intact.
- Rebuilt `EmailService` booking confirmations to render branded customer + staff templates (logo, summary, documents, notes), send staff copies to all configured recipients plus `support@a1serviceexpert.com`, and hardened the data payload structure.
- Expanded the booking-confirmation payload from `BookingsService` so emails include full profile, address, vehicle, and document context in both HTML and plain-text versions.
- Testing: `pnpm.cmd --filter booking-api test -- --config jest.config.ts` _(fails: `pricing-regression.spec.ts` still posts `customer.name` instead of structured profile fields)._

### 2025-10-29 - Pricing regression test update (Codex)

- Reworked `pricing-regression.spec.ts` to post the expanded `CustomerDetailsDto` fields (title, first/last name, mobile, address) so it matches the latest booking DTO contract.
- Attempted to replay Prisma migrations to align the local database with the new schema. The previous `prisma migrate dev` invocation is holding an advisory lock, so both `prisma migrate deploy` and `npx prisma migrate deploy` timed out with `P1002` (10s lock wait) while trying to reach `localhost:5433`.
- Tests now start but fail before assertions because the database schema is missing the new `User` columns; once the lock issue is cleared and migrations apply, the suite should complete.
- Testing: `pnpm.cmd --filter booking-api test -- --config jest.config.ts` _(fails: Prisma migration/lock prevents seeding the new columns)._

### 2025-10-29 - Prisma lock recovery & test pass (Codex)

- Cleared the lingering migration advisory lock by terminating open Postgres connections via a temporary Prisma client script (`pg_terminate_backend`) and confirmed no pending migrations after re-running `npx prisma migrate deploy`.
- Verified the new schema state (user profile columns + `UserSession` table) and reran the booking API suite successfully.
- Testing: `pnpm.cmd --filter booking-api test -- --config jest.config.ts` (passes).

### 2025-10-29 - Deliverable 2 readiness check (Codex)

- Reviewed Turnstile integration across the API and booking flow; confirmed guards/settings toggle the gate server-side while the confirm step uses the shared `TurnstileWidget` with the dev bypass fallback.
- Verified admin settings copy/env scaffolding reflect the Cloudflare wording and no residual reCAPTCHA imports remain in the web app.
- Confirmed new booking confirmation email templates emit both customer/staff versions with the enriched payload and support auto-adding `support@a1serviceexpert.com`.
- Next focus: begin Deliverable 3 (Confirm-step UX rebuild) once remaining polish items surface.

### 2025-10-29 - Confirm step rebuild plan (Codex)

- Analysed the existing `DetailsConfirmStep.tsx` flow: current form only collects name/email/phone/notes plus gating on login token; UI still uses the transitional layout rather than the darker card aesthetic.
- Next implementation batches for Deliverable 3:
  1. Reshape wizard draft state to carry full profile fields (title, first/last names, address lines, marketing opt-in, password for new accounts) alongside account/login state.
  2. Split the confirm view into stacked �cards�: summary, account access/login, personal details, reminders/terms, payment CTA, ensuring responsive spacing.
  3. Add inline registration for logged-out users capturing password + full profile, wiring to the updated `/auth/register` endpoint and storing returned token/user in wizard context.
  4. Ensure confirm CTA enables only when hold is active, validation passes, and either user is logged-in or registration succeeded; surface inline errors.
  5. Update API integration to send the richer `customer` payload and passwords where required, then refresh success UX (card with invoice/quote links, CTA to book again).
- Dependencies verified: backend now supplies full profile/session handling; Turnstile widget ready for reuse across new sections.

### 2025-10-29 - Confirm step UX rebuild (Codex)

- Replaced `DetailsConfirmStep` with the new dark-card experience: booking summary hero, inline account access (login/register), full profile capture, marketing opt in, and the reworked CTA layout.
- Added inline login + automatic registration flow so logged-out users create an account (password + profile) before confirming; logged-in users can refresh their profile and switch accounts without leaving the wizard.
- Hooked profile loading to `/account/profile`, push updates via `/account/profile` PATCH, and ensure confirmation sends the enriched customer payload + notes.
- Reused the Turnstile widget across account creation and booking confirmation, gating the CTA until the form, terms, captcha, and hold are all valid.
- Build check: `pnpm.cmd --filter booking-web build`.

### 2025-10-29 - Confirm step rebuild attempt (rolled back) (Codex)

- Started implementing the dark-card confirm-step experience with inline login/register and full profile capture. Encountered tooling issues while composing the large component in the CLI, resulting in corrupted JSX and build failures.
- Reverted the incomplete `DetailsConfirmStep.tsx` and booking draft persistence changes to keep the branch stable; Deliverable 3 remains outstanding and needs a fresh implementation pass next session.
- Next session: rebuild the confirm-step screen with a smaller, incremental approach (top-level layout first, then login/register, profile form, and API wiring) to avoid editor limitations.
- Testing: `pnpm.cmd --filter booking-web build` (not run after revert).

### 2025-10-29 - Confirm step rebuild (Codex)

- Rebuilt `DetailsConfirmStep` with the new dark summary card, inline login/register flows, full profile capture, Turnstile gating, and success navigation that surfaces invoice/quote links plus a fresh "Book another visit" CTA.
- Versioned the booking wizard draft store (`state.tsx`) so older localStorage payloads migrate into the expanded customer/account shape without breaking current users; added watchers so email/profile edits persist immediately.
- Updated success experience (`SuccessPage.tsx`) to highlight follow-up actions and wired the booking draft/account reset flows, ensuring the confirm button respects hold expiry, captcha state, and validated terms.
- Testing: `pnpm.cmd --filter booking-web build`.

### 2025-10-29 - Email delivery QA blocker (Codex)

- Unable to complete Deliverable 3 step 5 (email + document verification) because outbound mailbox credentials are not yet provisioned; sandbox lacks access to the GoDaddy-managed Microsoft 365 account.
- Captured the SMTP requirements for that setup (host `smtp.office365.com`, port `587`, STARTTLS, mailbox `support@a1serviceexpert.com`) and left notes in the changelog so ops can plug in the live password once issued.
- Next action: once credentials/forwarding are ready, run a logged-out booking confirmation to confirm staff/customer email delivery and PDF availability, then document results.

### 2025-10-29 - Draft migration verification (Codex)

- Added a small `apps/booking-web/scripts/checkDraftMigration.ts` harness and exported the draft normalisation helpers so we can sanity-check legacy/localStorage payloads without spinning up the UI.
- Ran `pnpm.cmd dlx tsx apps/booking-web/scripts/checkDraftMigration.ts`; confirmed old `customer.name/phone/notes` drafts map into the new structured fields and that current-format drafts remain untouched.
- Outcome: migration logic passes all scripted checks; ready for manual browser validation when QA begins.

### 2025-10-29 - Confirm-step QA plan (Codex)

- Outlined hands-on QA scripts for the rebuilt confirm step: run logged-out booking creation (inline registration, Turnstile success/failure, success payload), logged-in booking confirmation (profile prefill + PATCH), and hold-expiry recovery.
- Highlighted prerequisites: start the API (`pnpm --filter booking-api dev`) and web app (`pnpm --filter booking-web dev`), preload catalogue/availability data, and prepare mock Turnstile keys so bypass mode works locally.
- Next action: execute the flows once interactive access is available; capture screenshots, verify invoice/quote links, and append findings to this log.

### 2025-10-29 - Header profile menu & route tidy (Codex)

- Reworked `App.tsx` navigation so authenticated users see a profile pill with dropdown actions (account, admin dashboard, dev tools for admins) instead of inline nav links; added click-away + escape handling and mobile equivalents.
- Restricted the Dev Tools shortcut to admins only and moved login/register CTAs into the header action area for unauthenticated visitors.
- Verified the updated layout with `pnpm.cmd --filter booking-web build` (passes, aside from existing Vite chunk-size warnings).

### 2025-10-29 - Account area refresh (Codex)

- Replaced the old account dashboard with a multi-card layout: booking history list (with document chips + stub detail links), editable profile form backed by `/account/profile`, and a change-password card using `/account/change-password`.
- Added hero verification messaging, quick actions (book again / sign out), and support contact copy so customers know how to reach the workshop.
- Admin users now redirect straight to `/admin` when visiting the account area.
- Build check: `pnpm.cmd --filter booking-web build` (passes; Vite chunk-size warning persists).

### 2025-10-29 - Booking detail view (Codex)

- Exposed `GET /bookings/:id` so signed-in users can retrieve a full booking payload (customer profile, vehicle, services, documents, totals); controller now wires the route and enforces ownership checks.
- Added `BookingDetailPage` with richer service/vehicle/document summaries, wired from account history (`/account/bookings/:bookingId`) and guarded for auth redirects.
- Updated the account history list to keep linking to the new detail page; build/tests run: `pnpm.cmd --filter booking-api build`, `pnpm.cmd --filter booking-web build` (both pass, Vite chunk-size warning persists).

### 2025-10-28 - Proposed sub-deliverables status (Codex)

- 1. Data & Auth foundation � Complete. Prisma schema extended (full profile on User + UserSession), DTOs/services updated, /account/profile + /account/change-password live; API tests pass after migrations.
- 2. Email service & Turnstile swap � Complete. Turnstile in web + API guards, admin copy/envs updated, branded customer/staff booking emails in place including support@a1serviceexpert.com. Email QA pending awaiting live Microsoft 365 mailbox credentials.
- 3. Booking confirm step rebuild � Implemented. New dark summary card, inline login/register (Turnstile), full profile form, confirm gating (hold/captcha/terms). End-to-end validation still to run for guest/auth flows, hold expiry, and email delivery.
- 4. Header/profile menu & routing � Complete. Logged-in profile pill + dropdown (account/admin/dev-for-admins), mobile parity, dev tools hidden for non-admins.
- 5. Account area refresh � Complete. New profile editor (PATCH /account/profile), change-password card (PATCH /account/change-password), refreshed booking history with document chips, admin redirect to /admin.
- 6. Booking detail view & history � Complete. Added GET /bookings/:id and BookingDetailPage at /account/bookings/:bookingId; account history links to detail page.
- 7. QA & polish � Outstanding. Run full booking flows (guest/auth), verify Turnstile toggles/bypass, validate emails+PDF links once SMTP creds are live, sanity-check localStorage migration in real browsers, and capture screenshots.

### 2025-10-28 - Next Tasks (QA) checklist (Codex)

- [ ] Guest flow: start a booking logged-out, complete profile + inline registration (Turnstile), confirm; verify reference + invoice/quote appear on success and booking shows in /account history and /account/bookings/:id.
- [ ] Authenticated flow: sign in first, confirm with prefilled profile; edit profile and verify PATCH /account/profile persists; confirm booking.
- [ ] Hold expiry: let hold expire on confirm step; ensure CTA disables with guidance; reacquire slot (new hold) and complete.
- [ ] Turnstile behaviour: with TURNSTILE_SECRET unset, fallback checkbox allows dev bypass; with secret set, failed captcha blocks confirm, success allows.
- [ ] Email delivery: once Microsoft 365 SMTP creds are available, confirm customer + staff emails (support@a1serviceexpert.com included) and test invoice/quote links.
- [ ] Draft migration: load a browser with legacy ookingDraft payload; confirm wizard hydrates and confirm step prepopulates; cross-check with pnpm dlx tsx apps/booking-web/scripts/checkDraftMigration.ts.
- [ ] Screenshots + docs: capture confirm step, success, account (profile/history), booking detail; append QA outcomes to CONTEXT.md and docs/CHANGELOG.md.

Quick start for QA:

- API: pnpm.cmd --filter booking-api dev (ensure .env has DB/REDIS, optional TURNSTILE_SECRET, SMTP as available)
- Web: pnpm.cmd --filter booking-web dev (ensure .env has VITE_API_BASE_URL, VITE_TURNSTILE_SITE_KEY)
- Admin settings: toggle CAPTCHA requirement in dev as needed.

### 2025-10-28 - Env audit for Turnstile (Codex)

- apps/booking-api/.env (local) still contains Google reCAPTCHA keys:
  - Found RECAPTCHA_SECRET=... and no TURNSTILE_SECRET. API Turnstile guard reads TURNSTILE_SECRET (see .env.example).
  - Local file also lacks SMTP vars (SMTP_HOST/PORT/SECURE/USER/PASS) which .env.example includes for Microsoft 365.
  - Recommended (do not change committed files; apply locally only):
    `env
    # Replace legacy Google secret with Cloudflare Turnstile secret
    TURNSTILE_SECRET=<your_server_secret>
    # Remove/ignore RECAPTCHA_SECRET
    # Add SMTP for Microsoft 365 if you plan to test emails
    SMTP_HOST=smtp.office365.com
    SMTP_PORT=587
    SMTP_SECURE=false
    SMTP_USER=support@a1serviceexpert.com
    SMTP_PASS=<app_or_mailbox_password>
    `
- apps/booking-api/.env.example is already Turnstile-ready and shows the correct keys; no changes needed there.
- apps/booking-web/.env (local) currently only has VITE_API_BASE_URL; it is missing the site key:
  - Add VITE_TURNSTILE_SITE_KEY=<your_site_key> (and keep VITE_API_BASE_URL), then restart/rebuild the web app.
  - Optionally ensure VITE_USE_NEW_BOOKING_UI=true is present if you rely on that flag.
- apps/booking-web/.env.example already includes VITE_TURNSTILE_SITE_KEY.
- Notes:
  - Don�t commit real secrets. Keep them in local .env files or the host secret manager.
  - In Admin ? Settings, you can force CAPTCHA in dev. With TURNSTILE_SECRET set, the API enforces Turnstile; the web shows the widget when VITE_TURNSTILE_SITE_KEY is present, otherwise a dev checkbox fallback is used.

### 2025-10-28 - Turnstile env applied (Codex)

- Updated local envs for Turnstile:
  - apps/booking-api/.env: removed RECAPTCHA_SECRET, added TURNSTILE_SECRET= (empty placeholder), and appended Microsoft 365 SMTP keys (SMTP_HOST/PORT/SECURE/USER/PASS).
  - apps/booking-web/.env: added VITE_TURNSTILE_SITE_KEY= and VITE_USE_NEW_BOOKING_UI=true.
- Remember to fill TURNSTILE_SECRET (server secret) and VITE_TURNSTILE_SITE_KEY (site/public key) with your real credentials locally. Do not commit real secrets.

Upcoming/Planned

- Password reset flow (not implemented yet):
  - API endpoints: POST /auth/forgot-password (issue token + email), POST /auth/reset-password (validate token + set new password)
  - Emails: branded reset email via SMTP
  - Web: modal triggers request; dedicated reset page to consume token

---

Feature Spec: Confirm Step Revamp (2025-10-29)

Goals

- Simplify the booking confirmation by using one Turnstile check at the end.
- Remove friction in the account section while keeping anti-bot protection.
- Modernise the UI with consistent dark cards across the whole step.

Scope (Web, API)

- Web: apps/booking-web (Vite + Tailwind)
- API: apps/booking-api (NestJS), only behaviour clarification (no immediate endpoint changes required)

UI Structure (Confirm Step)

1. Confirm your booking (dark card)

   - Summary grid (Service, Vehicle, Appointment, Total).
   - Hold countdown and Start over CTA.

2. Account information (dark card)

   - Fields (for not-logged-in users):
     - Email address (required)
     - Password (required, min 8)
     - Repeat password (required, must match)
   - Subtext: "Already have an account? Click here to login" ? opens Login modal.
   - Hide the subtext completely when the user is logged in.
   - Remove the old Sign in / Create account segmented buttons and any inline CAPTCHA in this section.

3. Your details (dark card)

   - Keep fully editable whether the user is logged in or not (we do not lock the form post-login).
   - Keep existing validation (title, names, address, phone, terms checkbox, optional notes, marketing opt-in).

4. Final checks (dark card)
   - Contains the single Turnstile widget and the final Confirm button.
   - Button label: "Confirm" (not "Confirm booking").

Sidebar Behaviour

- Hide the right-hand cart sidebar on the confirm step.

CAPTCHA Policy (Single check)

- Only one Turnstile check is displayed to the user at the bottom (Final checks).
- Not logged in:
  - Clicking Confirm validates Account information + Your details.
  - Uses the same Turnstile token to create the account (POST /auth/register) and then confirm the booking.
- Logged in:
  - The Turnstile check is still required before confirming the booking (PATCH /bookings/:id/confirm).
- API-level note: We can keep TurnstileGuard on both /auth/register and /bookings/:id/confirm; the client submits the same token value to both when needed so the user only solves one CAPTCHA.

Redirects

- After a successful confirmation, redirect to /account (not the standalone success page, and not /account/bookings/:id).
  - The success toast still shows on redirect.

Login Modal

- Look and feel: overlay + centered card (match current site style).
- Fields: Email address, Password.
- Disable Login until both fields have values.
- On success: close modal only; keep the user on the confirm step with sections 2 and 3 still visible and editable.
- Forgotten password: link in the modal opens a second modal with a single Email field and Continue button.
  - Phase 1: front-end only; show success toast: "If the email exists, we�ll send a reset link." (no backend yet).

Password Reset (Phase 2 � not implemented yet)

- API endpoints to plan:
  - POST /auth/forgot-password ? issue token + email (branded via SMTP)
  - POST /auth/reset-password ? validate token + set new password
- Web:
  - Reset page with token param + form (New password / Repeat password)
  - Link from emails to reset page

Styling

- Apply the dark card look to all four sections (Confirm summary, Account information, Your details, Final checks).
- Inputs use dark-friendly styles:
  - Example Tailwind utility baseline for inputs inside dark cards: `bg-slate-800 text-slate-100 placeholder-slate-400 border-slate-700 focus:border-orange-500 focus:ring-orange-500`.
  - Error text uses `text-red-300` within dark areas.
  - Section containers: `rounded-3xl bg-slate-900 p-6 text-slate-100 shadow-inner`.

Copy (baseline; adjust to match website tone)

- Account card title: "1. Account information"
- Subtext (guest): "Already have an account? Click here to login"
- Your details title: "2. Your details"
- Final checks title: "3. Final checks"
- Confirm button: "Confirm"

Behavioural Details

- Account creation is deferred until the user presses Confirm. If the user is already logged in, we skip registration.
- Single Turnstile token is captured in Final checks and reused for both:
  - POST /auth/register (when creating account)
  - PATCH /bookings/:id/confirm
- Keep Your details always editable. If details differ from the stored profile when logged in, PATCH /account/profile is sent as part of the confirm flow before confirming the booking.
- Hold expiry: if the countdown elapses, disable Confirm and display the hold-expired message; require reacquiring the slot.
- Hide the "Already have an account?" login subtext when logged in.

Files to touch (Web)

- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx
- apps/booking-web/src/features/booking/BookingWizard.tsx (hide cart on step 4)
- apps/booking-web/src/components/TurnstileWidget.tsx (stability; no flicker)

API Notes (no immediate changes required)

- Keep TurnstileGuard on:
  - POST /auth/register (field: `captchaToken`)
  - PATCH /bookings/:id/confirm (field: `captchaToken`)
- Client will provide the same token from the Final checks widget when registering and/or confirming.

Acceptance Criteria

- Logged-out path: entering required Account information + Your details, solving Turnstile, and pressing Confirm creates the account, logs in, creates and confirms the booking, shows success toast, and redirects to /account.
- Logged-in path: with a valid Turnstile token, pressing Confirm updates profile if changed, confirms booking, shows success toast, and redirects to /account.
- The cart sidebar is hidden on the confirm step.
- The "Already have an account?" line is hidden when logged in.
- Only one Turnstile is shown on the page, inside Final checks.
- No Turnstile flicker; widget renders once and remains stable.
- Inputs use dark theme within the dark cards; errors are readable on dark backgrounds.

QA Checklist

- Logged-out flow end-to-end with and without profile edits; verify account created and documents emailed (once SMTP live).
- Logged-in flow: edit a detail (e.g., mobile number) and confirm; verify profile PATCH occurs.
- Hold expiry: let the timer elapse; Confirm disabled; reacquire slot and finish.
- CAPTCHA: ensure Confirm fails without a token and passes with a valid token; ensure registration also accepts the same token in a single Confirm flow.
- Sidebar visibility: appears on earlier steps, hidden on confirm.
- Redirect goes to /account and success toast is visible.

Out of Scope (now)

- Full password reset backend and reset page (tracked above in Password Reset).

Dev & Config

- Turnstile dev toggle via Settings: Use admin settings to disable Turnstile in dev if required; otherwise ensure site key/secret are set.
- Web env: `VITE_TURNSTILE_SITE_KEY`, `VITE_API_BASE_URL`.
- API env: `TURNSTILE_SECRET` (keep set for realistic checks), SMTP\_\* once mailboxes are ready.

---

# Booking UI Redesign � Confirm Step Revamp (2025-10-29)

Summary

- Reworked the confirm step into dark cards with a single Turnstile widget at the end. Account section shows Email, Password, Repeat password for guests with a login modal for existing users. Your details remain fully editable and include notes, marketing opt-in, and a terms checkbox. The Confirm button redirects to `/account` on success.
- Guest flow uses one Turnstile token (register ? login ? create booking ? confirm). Logged-in users still must complete Turnstile before confirming. Holds are validated/cleared appropriately.
- Cart sidebar is hidden only on the confirm step. The Turnstile widget is stable and does not flicker.

Files Touched (web)

- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx � dark input styles, notes/marketing/terms inputs, login/forgot modals integration, single Turnstile usage, success redirect to `/account`.
- apps/booking-web/src/features/booking/BookingWizard.tsx � already hides `CartSidebar` when step is `details-confirm`.
- apps/booking-web/src/components/TurnstileWidget.tsx � already stable via ref-held callback; no change required.

Acceptance Checklist

- Only one Turnstile visible (Final checks).
- Guest: single-token register+login+create+confirm; redirect `/account`.
- Logged-in: Turnstile required on confirm; optional profile PATCH; redirect `/account`.
- Login subtext hidden for logged-in users.
- Inputs readable on dark; error text `text-red-300`; no flicker.

## Follow-up: Validation fixes (2025-10-29)

Summary

- Confirm button remained disabled because the profile schema still required `county` and booking readiness also required an engine tier. Updated logic so only required fields gate the Confirm CTA.

Changes

- Made `county` optional in the Zod schema and UI label shows �County (optional)�.
- Relaxed `bookingReady` to not require an engine tier; relies on `pricePence` presence so fixed-price services are supported.
- Normalised payload builders to send `county` only when provided.
- Treated empty optional fields (landline, address lines, notes) as undefined during validation, so leaving them blank does not block the Confirm button.
 - Prevented form `reset()` loops for guests so `confirmPassword` no longer mirrors `password` while typing.
- Landline truly optional (no minimum length enforced).
- Repeat password mismatch now shows immediately when either password field changes.
- Submit path uses Zod validation (and sets RHF errors) to prevent accidental focusing of optional fields; focus now remains stable with clear inline error messages instead.
- `marketingOptIn` treated as optional in schema to avoid any stray �Required� state on optional controls.
 - Silenced profile fetch errors when unauthenticated or API not running (e.g., `Cannot GET /account/profile`) to keep the flow clean in dev.

Files

- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx

QA

- Guest or logged-in, Confirm enables when: service selected, price present, vehicle/date/time/hold set, required personal fields valid (title, first name, last name, mobile, address line 1, city, postcode, terms), and Turnstile solved.
 - Added debug aid: Confirm button exposes a `title` tooltip with the disabled reason in dev. Also added a schema-based validity fallback alongside RHF `isValid` to prevent false negatives.
## Services Step Redesign (2025-10-29)

Summary

- Service cards restyled to dark theme like Confirm step with �Price from �X� sourced from `/catalog.lowestTierPricePence`.
- Selection pill with a check appears after the Vehicle modal successfully adds the vehicle; clicking it toggles deselect and clears service from the cart.
- Fixed Price table switched to a dark panel and reads values from `/catalog` (DB source of truth) for consistency.
- Vehicle modal (manual entry) gains a Back button to return to VRM lookup; summary Back also returns to VRM.

Next Actions

- Update DB/admin prices to match the Services page table (inc-VAT): Service 1 (79.95/89.95/99.95/109.95), Service 2 (119.95/129.95/139.95/159.95), Service 3 (179.95/179.95/199.95/219.95). Use Admin Catalog ? Prices, or provide pence values for a seed.

QA

- Cards display lowest tier price and �Not available� for disabled services.
- Selecting a service opens Vehicle modal; after continue, pill shows Selected.
- Deselect clears service/price from the cart; sidebar updates accordingly.

## Follow-up: Cart + VRM improvements (2025-10-29)

Summary

- Cart total updates instantly when switching services after a vehicle is selected. The Vehicle modal recomputes `pricePence` for the current service via `/vehicles/recommend-tier` and writes it to the draft alongside `engineTierCode/Name`.
- Cart panel pulses briefly on price change for visibility.
- �Search again� in the VRM path clears both the DVLA result and the VRM field; the duplicate Continue button was removed so only a single operational Continue remains.
- Removed stray literal `\n\n` text under the service cards/table by normalising the Services step file.

Admin Pricing Tools

- Web Admin button �Apply fixed menu prices� upserts tier prices to:
  - Service 1: 79.95, 89.95, 99.95, 109.95
  - Service 2: 119.95, 129.95, 139.95, 159.95
  - Service 3: 179.95, 179.95, 199.95, 219.95
- Backend script: `apps/booking-api/scripts/upsert-fixed-prices.ts` (run with `pnpm --filter booking-api ts-node scripts/upsert-fixed-prices.ts`).

Files

- apps/booking-web/src/components/VehicleModal.tsx � always recompute price/tier on confirm; VRM �Search again� reset.
- apps/booking-web/src/components/CartSidebar.tsx � price change pulse.
- apps/booking-web/src/features/booking/steps/ServicesStep.tsx � newline artefacts removed in DOM output.
- apps/booking-web/src/features/admin/CatalogManager.tsx � �Apply fixed menu prices� button.
- apps/booking-api/scripts/upsert-fixed-prices.ts � Prisma upsert helper.

Suggested Assistant Prompt (for new chat sessions)

"You are working on the A1 Service Expert monorepo (NestJS API + React/Vite web). Always:
1) Append a concise summary of your changes to CONTEXT.md and docs/CHANGELOG.md in the same formats used already. Never delete existing context.
2) Before coding, quickly analyse the project structure and call out any obvious misconfigurations or risks (e.g., envs, API routes, build scripts). If something looks wrong or inconsistent, say so and propose a fix.
3) Do not change code in a way that could break the booking wizard flow or existing API contracts. Prefer small, reversible edits and keep styles consistent with the current app.
4) When touching Admin/Services/Confirm steps, keep Turnstile and guards intact, ensure only one CAPTCHA is used, and avoid introducing flicker.
5) Default to the dark card style from the Confirm step for new UI in the booking wizard.
6) If a task would require schema or multi-line-item booking changes, pause and ask before proceeding."

### 2025-10-30 - Logo swap and booking stepper redesign

Summary

- Replaced site-wide logo from `logo-a1.png` to `logo-new.png` (3D "A1 SERVICE EXPERT" branding) in both header and footer components.
- Scaled footer logo to match header logo size (h-32 to h-40 across breakpoints) for visual consistency.
- Redesigned booking wizard stepper from card-based panels to horizontal text-based navigation:
  - Current step highlighted in orange (`text-orange-500`)
  - Completed steps highlighted in green (`text-green-500`)
  - Upcoming steps shown in muted slate (`text-slate-400`)
  - All completed and current steps are clickable for backward navigation
  - Hidden on mobile (`hidden md:block`) to maintain clean mobile UX
  - Arrow separators (`→`) between steps for visual flow
- Updated "Online Booking" header section to match dark card aesthetic:
  - Dark slate background (`bg-slate-900`) with rounded corners (`rounded-3xl`)
  - White heading and slate-300 subtitle for readability
  - Integrated stepper within the dark header panel
  - Login button styled with dark theme (slate-800 background, orange hover states)

Files Modified

- apps/booking-web/src/components/HeaderLogo.tsx
- apps/booking-web/src/components/Footer.tsx
- apps/booking-web/src/features/booking/BookingWizard.tsx

Testing Notes

- Verify new logo displays correctly in header (desktop h-40, mobile h-16) and footer (h-32 to h-40 across breakpoints)
- Confirm stepper appears as horizontal text navigation on desktop with proper color states (orange for current, green for completed, slate for upcoming)
- Test stepper navigation: clicking completed or current steps should navigate backward through the wizard
- Verify stepper is completely hidden on mobile screens (below md breakpoint)
- Check "Online Booking" header matches dark card theme with good contrast on both desktop and mobile
- Ensure Login button styling aligns with dark theme and has proper hover states

### 2025-10-30 - Stepper navigation improvements and mobile scroll behavior

Summary

- Added `clearCompletedStepsAfter` function to booking wizard state management that resets all steps after the clicked step when navigating backward.
  - When clicking on a previous step (e.g., clicking "Services" from "Date & Time"), all subsequent steps are cleared from completed state (green → default).
  - This provides a "start fresh from this step" behavior that matches user expectations.
- Enhanced mobile cart drawer Continue button to scroll to step content after navigation.
  - Added smooth scroll to the `<section>` container (below "Online Booking" header) when Continue is pressed.
  - 100ms delay ensures navigation completes before scroll is triggered.
  - Applies to all step transitions: services → pricing, pricing → date-time, date-time → confirm.
- Fixed mobile cart drawer layout to ensure "Start again" and "Continue" buttons are always visible.
  - Restructured drawer with flexbox layout: fixed header, scrollable content area, fixed button footer.
  - Header has border-bottom separator.
  - Content area (`flex-1 overflow-y-auto`) scrolls independently if booking details are long.
  - Button footer has border-top separator and stays pinned at bottom of drawer.
  - Added conditional rendering: drawer only shows when service is selected and not on confirm step.
- Improved mobile sticky bar UX for better discoverability:
  - Booking info button now has visible rounded background (`bg-slate-50`) with hover states.
  - Added up chevron icon (↑) to indicate the drawer is expandable.
  - Entire left section is now an obvious button with `flex-1` width.
  - Price display larger and bolder for better visibility.
  - Continue button updated to `rounded-full` for consistency with site theme.
- Redesigned Back buttons across all booking steps to match site theme:
  - Changed from bordered style to filled rounded-full dark slate buttons.
  - Added left arrow (←) for better UX.
  - Hover state: transitions to orange-500 background with black text.
  - Styling: `rounded-full bg-slate-800 px-6 py-2 text-sm font-semibold text-slate-100 hover:bg-orange-500 hover:text-black`.
  - Applied to PriceStep, DateTimeStep, and DetailsConfirmStep.
  - Also updated Start again and Confirm buttons on DetailsConfirmStep for consistency.

Files Modified

- apps/booking-web/src/features/booking/types.ts
- apps/booking-web/src/features/booking/state.tsx
- apps/booking-web/src/features/booking/BookingWizard.tsx
- apps/booking-web/src/components/MobileCartDrawer.tsx
- apps/booking-web/src/features/booking/steps/PriceStep.tsx
- apps/booking-web/src/features/booking/steps/DateTimeStep.tsx
- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx

Testing Notes

- Desktop stepper: Navigate to step 3, verify steps 1-2 are green. Click step 1, confirm step 2 turns from green to default slate.
- Desktop stepper: From any step, click a previous step and verify all steps after it are cleared from completed state.
- Mobile: Drawer only appears after selecting a service and not on confirm step.
- Mobile: Complete steps 1-2, open cart drawer, press Continue, verify page scrolls smoothly to step content (below dark header).
- Mobile: Verify "Start again" and "Continue" buttons are always visible at bottom of drawer regardless of content length.
- Mobile: If booking details are long, verify content area scrolls while buttons stay fixed at bottom.
- Back buttons: Verify all Back buttons use new dark rounded design with left arrow and orange hover state.
- Both desktop and mobile: Ensure backward navigation works correctly and state is preserved for the clicked step and earlier.

### 2025-10-30 - Services page dark theme redesign (primary and supporting services)

Summary

- Redesigned the entire services section on the Services page to match the dark theme aesthetic used throughout the site.

**Primary Services Section (Service 1, 2, 3):**
- Section container background changed from white to dark slate 900 (`bg-slate-900` with `border-slate-700` and `shadow-inner`).
- Primary service cards (Service 1, 2, 3) redesigned:
  - Background: White → Dark slate 800 (`bg-slate-800` with `border-slate-700`)
  - Enhanced shadows (`shadow-lg`)
  - Hover: Border turns orange, slight lift, enhanced shadow
  - Icon circles: h-12 → h-14, orange tint default
  - Icon hover effect: Lighter orange background (`bg-orange-500/20`), brighter orange icon (`text-orange-400`), orange ring (`ring-2 ring-orange-500`), glow shadow - keeps icon visible
  - Typography: Service labels in orange-400, titles in white, summaries in slate-300, details in slate-400
  - Bullet points changed to orange-500 for consistency
  - Improved spacing and leading for better readability
- Servicing notes box redesigned:
  - Border: Dashed orange with transparency (`border-orange-500/30`)
  - Background: Orange tint on dark (`bg-orange-500/5` with `backdrop-blur-sm`)
  - Title in orange-400, notes in slate-300, fine print in slate-400
  - Enhanced shadow (`shadow-lg`)
  - Better spacing between items

**Supporting Services Section ("More ways we keep you moving"):**
- Section background changed from white to dark slate 900 (`bg-slate-900` with `border-slate-700`).
- Section heading and subtitle updated to white/slate-300 for readability.
- Service cards (12 total) redesigned with dark slate 800 backgrounds and slate-700 borders.
- Card hover states: border turns orange, slight lift, enhanced shadow.
- Icon circles: Orange tint default, filled orange with black icon on hover, increased to h-14.
- Typography: White titles with orange hover, slate-400 descriptions with lighter hover.
- Grid layout improved: 1 col mobile, 2 cols md, 3 cols lg, 4 cols xl.
- All icons preserved for 12 services (Air Conditioning, Diagnostics, Brakes, Suspension, etc.).

Files Modified

- apps/booking-web/src/pages/ServicesPage.tsx

Testing Notes

- Verify entire services section has cohesive dark theme matching booking wizard.
- Primary services: Confirm Service 1, 2, 3 cards display with dark backgrounds, proper spacing, and readable text.
- Test primary card hover states: border turns orange, lift animation, icons fill orange with black centers.
- Check servicing notes box: orange-tinted background, readable slate text, proper spacing.
- Supporting services: Verify all 12 cards display with dark backgrounds and consistent styling.
- Test supporting card hover states: same behavior as primary cards.
- Verify responsive layout works across all breakpoints.
- Check text readability: white/orange headings, slate-300/400 body text, proper contrast throughout.

### 2025-10-30 - Cart sidebar redesign to match dark theme

Summary

- Redesigned the desktop cart sidebar on the booking wizard to match the dark theme aesthetic.
- Sidebar container updated from light to dark:
  - Background: White → Dark slate 900 (`bg-slate-900`)
  - Border: Orange-200 → Slate-700 (`border-slate-700`)
  - Shadow: Standard → Inset shadow (`shadow-inner`)
  - Corners: `rounded-xl` → `rounded-3xl` for consistency
- "Your booking" heading changed to white with better spacing (`mb-5`)
- Booking summary card redesigned:
  - Background: Orange-50 → Dark slate 800 (`bg-slate-800`)
  - Border: Added slate-700 border with `rounded-2xl`
  - Enhanced shadow (`shadow-lg`)
  - Pulse animation preserved for price changes
- Typography updates:
  - Labels (Service, Vehicle, Tier): Orange-600 → Orange-400 with better tracking
  - Values: Black → White for readability
  - Descriptions: Slate-700 → Slate-400
  - Total label: Slate-300
  - Total price: Orange-400 (emphasized), larger size (`text-lg font-bold`)
- Border divider: Orange-200 → Slate-600
- Button redesign:
  - Continue button: `rounded` → `rounded-full`, increased padding (`px-5 py-3`)
  - Start again button: Light border → Dark theme with slate-800 background, slate-600 border, orange hover states
  - Consistent with other buttons across the site
- Better spacing throughout (increased gaps and padding)

Files Modified

- apps/booking-web/src/components/CartSidebar.tsx

Testing Notes

- Verify cart sidebar displays with dark theme matching booking wizard header
- Check text readability: white values, orange labels, slate descriptions
- Test pulse animation on price changes (still works)
- Verify Continue button: orange background, rounded-full, proper hover state
- Verify Start again button: dark background with orange hover
- Check responsive behavior and spacing
- Ensure total price stands out with orange-400 color and larger size

### 2025-10-30 - Vehicle modal redesign to match dark theme

Summary

- Completely redesigned the vehicle lookup modal to match the dark theme aesthetic throughout the booking wizard.

**Modal Container:**
- Background: White → Dark slate 900 (`bg-slate-900`)
- Border: Added slate-700 border
- Corners: `rounded-lg` → `rounded-3xl`
- Shadow: Standard → Enhanced `shadow-2xl`
- Backdrop: Black/50 → Black/70 for better contrast
- Added padding to outer container (`p-4`)

**Modal Header:**
- Title: Slate-800 → White, increased size (`text-xl`)
- Added border-bottom separator (`border-b border-slate-700 pb-4`)
- Close button: Redesigned as proper X icon in rounded circle with hover states

**VRM Lookup Form:**
- Label: Slate-700 → Slate-300
- VRM input: Enhanced UK number plate styling:
  - Background: Yellow-200 → Yellow-400 (more vivid)
  - Text: Larger, bold, uppercase, wider tracking
  - Border: Slate-300 → Slate-600
  - Focus ring: Orange-400 → Orange-500
- Search button: `rounded` → `rounded-full`, updated text from "Continue" to "Search"
- Help text: Slate-500 → Slate-400
- Manual entry link: Blue-700 → Orange-400 with better hover

**Manual Entry Form:**
- All labels: Slate-700 → Slate-300
- All inputs/selects:
  - Background: White → Slate-800
  - Border: Slate-300 → Slate-600
  - Text: Black → White
  - Placeholder: Slate-500
  - Focus: Orange border with orange ring
- Error messages: Red-600 → Red-400 (better contrast on dark)
- Help text: Slate-500 → Slate-400
- Grid spacing increased (`gap-4`)

**Vehicle Summary Card (Both Forms):**
- Background: Orange-50 → Slate-800
- Border: Slate-200 → Slate-700
- Corners: `rounded` → `rounded-2xl`
- Shadow: Added `shadow-lg`
- Layout: Changed from paragraph list to key-value pairs with flexbox
- Labels: Slate-400
- Values: White with semibold weight
- Price section: Border-top separator, larger text, orange-400 emphasis
- Better spacing throughout (`space-y-2`, `space-y-3`)

**Buttons:**
- **Search again button**: Redesigned to match dark theme:
  - `rounded-full` shape
  - Dark slate-800 background
  - Slate-600 border
  - Slate-100 text
  - Hover: Orange border, darker background, orange text
  - Removed blue underline style
- **Back buttons**: Same styling as "Search again"
- **Continue buttons**: `rounded` → `rounded-full`, increased padding
- **Back to lookup**: Same dark theme styling
- All buttons now consistent with site-wide button design

**Error Messages:**
- Red-600 → Red-400 text
- Added rounded background (`bg-red-500/10` with `rounded-lg` and `p-3`)

**Overall Improvements:**
- Better spacing throughout (increased gaps and padding)
- Enhanced focus states with orange rings
- Consistent rounded-full buttons
- Improved readability with proper contrast
- Mobile-responsive flex layouts for buttons
- **Fixed mobile scrolling issue**: Modal now scrollable with `max-h-[90vh] overflow-y-auto`, preventing content from being cut off on small screens

Files Modified

- apps/booking-web/src/components/VehicleModal.tsx

Testing Notes

- Verify modal displays with dark slate background
- Test VRM lookup: yellow input looks like UK number plate, search button works
- Test manual entry: all fields have dark backgrounds with orange focus rings
- Check vehicle summary card: key-value layout, price in orange, proper spacing
- Verify "Search again" button: dark theme with orange hover (no blue underline)
- Test "Back" and "Back to lookup" buttons: consistent dark styling
- Check error messages: red text on tinted red background
- Verify close X button works and has proper hover state
- Test responsive layout: buttons stack on mobile, grid works properly
- Check all form validations display correctly with red-400 text
- **Mobile scrolling**: On small screens, verify modal content scrolls (not backdrop), can reach Continue button at bottom

### 2025-10-30 - Homepage updates: Reviews link and "Get in touch" section redesign

Summary

- Updated Google Reviews link to new URL with enhanced tracking parameters.
- Completely redesigned "Get in touch" section to match dark theme aesthetic.

**Reviews Section:**
- Updated Google Reviews link from old URL to new URL with proper tracking parameters

**"Get in touch" Section Redesign:**
- Section container: White → Dark slate 900 (`bg-slate-900` with `border-slate-700` and `shadow-inner`)
- Added section header with "CONTACT" label (orange-400, uppercase, tracked) and white "Get in touch" heading
- Better spacing throughout (`space-y-8`)

**Contact Cards (Left Column):**
All information now in individual dark-themed cards:

1. **Workshop Address Card:**
   - Dark slate-800 background with slate-700 border
   - Orange icon circle (orange-500/10 background)
   - White heading, slate-400 address text
   - Rounded-2xl corners, shadow-lg

2. **Phone/WhatsApp Card:**
   - Same dark styling
   - Buttons redesigned: rounded-full, slate-800 bg, slate-600 border
   - Hover: Orange border, slate-700 bg, orange-400 text
   - Responsive: Stack vertically on mobile

3. **Opening Hours Card:**
   - Individual day/time items in nested dark cards
   - Dark slate-900 background for each day
   - Slate-600 borders, rounded-xl
   - Days in slate-300, times in orange-400
   - Grid layout (2 columns on sm+)

4. **Social Media Card:**
   - Facebook and Instagram icons
   - Dark slate-900 backgrounds, slate-600 borders
   - Orange-500 icon color
   - Hover: Orange border, darker background

**Booking Section (Right Column):**
1. **"Ready to book?" Card:**
   - Dark slate-800 background with proper spacing
   - White heading, slate-400 body text
   - Buttons: Rounded-full with consistent dark theme
   - "Start booking": Orange-500 background
   - "Contact us": Dark theme with orange hover

2. **Map:**
   - Taller height (h-80 instead of h-64)
   - Rounded-2xl corners matching other cards
   - Slate-700 border

**Button Consistency:**
- All buttons use `rounded-full` shape
- Consistent padding and hover states
- Dark theme buttons match site-wide design

Files Modified

- apps/booking-web/src/pages/HomePage.tsx

Testing Notes

- Verify Google Reviews link opens correct page with new URL
- Check "Get in touch" section has dark slate background
- Verify all contact information cards have proper dark styling
- Test Call and WhatsApp buttons: dark theme with orange hover
- Check opening hours grid: 2 columns on desktop, proper spacing
- Verify social media icons have hover states
- Test "Start booking" and "Contact us" buttons
- Check map displays correctly with taller height
- Verify responsive layout: cards stack on mobile
- Ensure all text is readable with proper contrast

### 2025-10-29 - Booking summary card (PriceStep) redesign

Summary

- Restyled the booking summary card on step 2 (PriceStep) to match the dark card aesthetic used in ServicesStep and DetailsConfirmStep.
- Updated card to use `rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-inner` with consistent dark theme colors throughout.
- Changed icon background from black to orange (`bg-orange-500`) and adjusted text colors: headings to white, body text to slate-300, labels to slate-400, and price/totals to orange-400.
- Updated vehicle details grid to use `rounded-2xl bg-slate-800/60` matching the confirm step pattern.
- Removed the Continue button from the card as it's already present in the cart sidebar/drawer, keeping only the Back button.
- Cleaned up unused imports and functions (toast, markStepComplete, handleContinue, canContinue).

Files Modified

- apps/booking-web/src/features/booking/steps/PriceStep.tsx

Testing Notes

- Verify the booking summary card displays with dark theme on step 2 of the booking wizard.
- Confirm that the Continue button is no longer visible on the card itself, and users must use the cart sidebar Continue button.
- Check that the Back button still functions correctly to return to the services selection step.

### 2025-10-29 - Date/Time step dark theme redesign and cart validation

Summary

- Restyled the Date & Time step (step 3) to match the dark card aesthetic used across the booking wizard.
- Wrapped the entire date/time interface in a dark card (`rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-inner`).
- Updated booking summary section to use `rounded-2xl bg-slate-800/60` with dark theme colors: labels in slate-400, values in white, price in orange-400.
- Restyled calendar controls: Previous/Next buttons use slate-600 borders with orange-500 hover, month heading in white.
- Updated calendar grid: day labels in slate-300, date buttons with slate-800 backgrounds, selected dates with orange-500 background and black text, disabled dates in slate-700 with slate-500 text.
- Restyled time slot buttons: slate-800 backgrounds with slate-600 borders, selected slots with orange-500 background and black text.
- Updated error messages to use red-300 for better contrast on dark backgrounds.
- Removed the "Continue to Details" button from the card, keeping only the Back button.
- Updated cart Continue button logic (both desktop CartSidebar and MobileCartDrawer) to be disabled on the date-time step until both date and time are selected.
- Cleaned up unused imports and functions (markStepComplete, handleNext, canContinue).

Files Modified

- apps/booking-web/src/features/booking/steps/DateTimeStep.tsx
- apps/booking-web/src/components/CartSidebar.tsx
- apps/booking-web/src/components/MobileCartDrawer.tsx

Testing Notes

- Verify the date/time card displays with dark theme on step 3 of the booking wizard.
- Confirm calendar interaction: Previous/Next month navigation, date selection highlights correctly.
- Test time slot selection: selecting a time should enable the cart Continue button.
- Verify cart Continue button is disabled until both date and time are selected on the date-time step.
- Confirm cart Continue button works normally on other steps (services, pricing).
- Test mobile drawer behavior matches desktop sidebar validation.
- Check that the Back button functions correctly to return to the booking summary step.

### 2025-10-29 - Authentication and login state consistency fix

Summary

- Fixed authentication session/login state detection issues where users with valid auth tokens were not being recognized as logged in.
- Updated App.tsx to use the same `/account/profile` endpoint as DetailsConfirmStep for consistency (previously used `/auth/me`).
- Changed `CurrentUser` interface to `PublicUser` to match the complete API response structure from the backend.
- Added automatic token cleanup: invalid or expired tokens are now automatically cleared from localStorage when API returns unauthorized errors.
- Improved user display in the header profile menu: now shows "FirstName LastName" when profile data is available, with graceful fallback to email.
- Updated user initial logic to prioritize first name, then last name, then email for the profile menu avatar.
- Added better error handling in the user profile loading flow to prevent silent failures.

Backend Context

- Both `/auth/me` and `/account/profile` endpoints return the same `PublicUser` structure (id, email, role, firstName, lastName, etc.).
- Both endpoints are protected by `JwtAuthGuard` and require a valid JWT token.
- The standardization on `/account/profile` ensures consistency across the booking wizard and main app.

Files Modified

- apps/booking-web/src/App.tsx

Technical Details

- Line 10-33: Replaced `CurrentUser` interface with full `PublicUser` interface matching backend response.
- Line 55: Updated state type from `CurrentUser | null` to `PublicUser | null`.
- Line 80: Changed API endpoint from `/auth/me` to `/account/profile`.
- Line 84-93: Added error handling to detect and clear invalid/expired tokens.
- Line 162-165: Added `userDisplayName` logic to show full name when available.
- Line 282: Updated profile button to display `userDisplayName` instead of just email.

Testing Notes

- Verify that the login button in the header recognizes logged-in users correctly.
- Confirm that the profile menu button displays the user's full name (FirstName LastName) when profile data is available.
- Test that clicking the profile menu shows the correct email address in the dropdown.
- Verify that invalid or expired tokens are automatically cleared and the user is shown the login button.
- Test on the confirm booking step (DetailsConfirmStep) that the "Account information" section correctly displays "Signed in" with the user's email when logged in.
- Confirm that both desktop and mobile views display user information consistently.

### 2025-10-29 - Booking confirmation validation alignment

Summary

- Removed the unused `/account/profile` PATCH attempt in the confirm step; booking confirmation now relies solely on the booking payload that already contains the customer details gathered in the wizard.
- Made the backend tolerate the optional "County" field by marking it optional in `CreateBookingDto` and guarding downstream sanitation so null values are accepted without throwing.
- Cleaned up the DetailsConfirmStep import list after dropping the profile sync logic.

Files Modified

- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx
- apps/booking-api/src/bookings/dto/create-booking.dto.ts
- apps/booking-api/src/bookings/bookings.service.ts

Testing Notes

- With a logged-in user, leave the "County" field blank (it is labelled optional) and confirm the booking; the request should no longer fail validation and should redirect to `/account`.
- Repeat the flow with "County" populated to ensure existing data continues to succeed.
- Smoke test the booking confirmation email to ensure the optional county still appears when provided.

### 2025-10-29 - Validation diagnostics improvements

Summary

- Enhanced the global validation error formatter in `apps/booking-api/src/main.ts` to recursively surface nested class-validator errors with full dot-notation field paths.
- Ensures API responses now clearly report which nested field failed validation (e.g. `customer.postcode`) instead of returning empty error arrays for nested DTOs.

Files Modified

- apps/booking-api/src/main.ts
- apps/booking-web/src/lib/api.ts

Testing Notes

- Trigger a validation failure (e.g. submit the confirm step without agreeing to terms) and verify the API response includes detailed field paths in the `errors` array.
- Confirm the frontend toast now surfaces the first field-specific validation detail (e.g. `Validation failed � customer.postcode: ...`).



### 2025-10-29 - Booking payload compatibility

Summary

- Added legacy `name`, `phone`, and `notes` fields to the confirm-step customer payload so older API builds that still expect the condensed details schema accept the request while the new schema continues to function.

Files Modified

- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx

Testing Notes

- Confirm step should succeed against both the updated API (first/last name fields) and any instances still expecting `customer.name` / `customer.phone`.
### 2025-10-29 - Booking build fix

Summary

- Restored the `apiPatch` import in the confirm step so the TypeScript build succeeds while still calling the `/bookings/:id/confirm` endpoint.

Files Modified

- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx

Testing Notes

- `pnpm --filter booking-web build` should now finish without errors.
### 2025-10-29 - Nest dev entry alignment

Summary

- Updated the booking-api `dev` and `start` scripts to run the compiled `dist/apps/booking-api/src/main.js` bundle, preventing the "Cannot find module dist/main" crash during watch/start.

Files Modified

- apps/booking-api/package.json

Testing Notes

- `pnpm --filter booking-api dev` should now start the API without module resolution errors.
- `pnpm --filter booking-api start` should execute the same bundle successfully.
- Wrapped booking confirmation email dispatch in a try/catch so missing SMTP config no longer breaks confirmation replies.
### 2025-10-30 - Tooling and install notes

Summary

- After pnpm install, warnings are expected and safe to ignore for now:
  - pnpm update available banner � informational only.
  - eslint@8.57.0 deprecated � dev tooling; does not affect builds/runtime.
  - A few deprecated transitive deps (glob/inflight/rimraf etc.) � tied to ESLint.

Impact

- No impact on API or Web app builds/runtime.
- packages/shared compiled successfully during the workspace prepare step.

Recommendations

- Optional: update pnpm globally (pnpm add -g pnpm).
- Optional: schedule an ESLint 9 migration later and align @typescript-eslint v8 config. Not urgent.
\n+### 2025-10-30 - Footer dark theme + Cookie Policy page (Codex)
\n+Summary
\n+- Redesigned the site footer to match the dark theme used elsewhere (slate backgrounds, orange accents). Ensured the logo remains large and readable, updated heading colors, and adjusted divider/text colors for contrast.
- Added a "Cookie Policy" link under Quick Links and created a new Cookie Policy page with sections covering what cookies are, types, examples used, and how to manage them.
- Wired the new page into the router.
\n+Files Modified / Added
\n+- apps/booking-web/src/components/Footer.tsx
- apps/booking-web/src/pages/CookiePolicyPage.tsx (new)
- apps/booking-web/src/routes.tsx
\n+Testing Notes
\n+- Footer renders with dark background (`bg-slate-900`) and white/neutral text; orange accents on hover remain consistent.
- Quick Links now include "Cookie Policy" and navigates to `/cookie-policy`.
- Visit `/cookie-policy` to review content sections and example cookie table; outbound links open in a new tab.
## [2025-10-30] Air Con packages section restyle (Codex)
Summary
- Restyled the Air Con page "Packages tailored to your vehicle" section to match the site’s dark theme: slate-900 section background, slate-800 cards, slate-700 borders, white headings, slate-300/400 body text, and orange hover/focus accents.
- Converted the plain text CTA to a rounded-full orange button with accessible focus ring and subtle lift on hover.

Files Modified
- apps/booking-web/src/pages/AirConPage.tsx

Testing Notes
- Navigate to `/air-con`.
- Verify the "Packages tailored to your vehicle" section uses a dark container and three dark cards.
- Hover a card: it lifts slightly and the border turns orange; card text lightens.
- CTA: rounded-full orange button, hover lightens, keyboard focus shows a clear orange ring.
- Responsive: grid stacks to 1 column on mobile and 3 on `md`.
## [2025-10-30] Air Con inspections + Diagnostics page dark restyle (Codex)
Summary
- Air Con: Restyled the "What we inspect every time" section to dark theme (slate-900 container, slate-700 border, white heading, slate-400 list, orange bullets) to match established patterns.
- Diagnostics: Introduced a dark-themed version of the page with consistent sections and card styles. Updated routes to use the new component.

Files Modified
- apps/booking-web/src/pages/AirConPage.tsx
- apps/booking-web/src/pages/DiagnosticsPageDark.tsx (new)
- apps/booking-web/src/routes.tsx

Testing Notes
- Air Con page: `/air-con` → verify the "What we inspect every time" section now uses dark styling and the right-hand highlight panel still overlays correctly.
- Diagnostics page: `/diagnostics` → confirm both main content sections are dark-themed:
  - "What we deliver": slate-900 section, slate-700 border; list items in slate-400 with orange dots.
  - Right card: slate-800 with slate-700 border and white text.
  - "How to book": dark container, white heading, slate-300 body, orange primary CTA with focus ring and white-outlined secondary CTA.
  - Hero remains unchanged and matches site pattern.
## [2025-10-30] Contact page dark restyle + hero image swap (Codex)
Summary
- Restyled Contact page sections to match dark theme patterns: slate-900 containers with slate-700 borders, slate-800 list items, white headings, slate-300/400 body text, and orange accents.
- Updated hero background image to local asset and improved CTA accessibility with focus-visible rings and hover lift.

Files Modified
- apps/booking-web/src/pages/ContactPage.tsx

Testing Notes
- Navigate to `/contact`.
- Hero uses `apps/booking-web/src/assets/images/contact-us-bg-image.jpg`; overlay remains and text is readable.
- “Workshop/Call us/Opening hours” section uses dark container; opening hours list uses dark cards; phone number remains orange.
- Form inputs use dark fields with clear focus rings; submit button is rounded-full orange with hover lift and focus ring.
## [2025-10-30] Account page dark restyle + hide docs + verification UI removed (Codex)
Summary
- Restyled the Account page sections to the dark theme: slate-900 containers, slate-700 borders, slate-800 list items, white headings, and orange accents.
- Booking history: removed the Documents chip list (invoice/quote no longer visible). Kept the View details button.
- Updated status badges to dark-friendly colors.
- Began removing email verification prompts: verification panel is disabled; backend already auto-verifies on registration. The only remaining UI reference is the inline status text; we can fully remove it next if desired.

Files Modified
- apps/booking-web/src/pages/AccountPage.tsx

Testing Notes
- Visit `/account` while logged in.
- Verify dark styling across all account sections.
- Booking history cards are dark; hovering View details shows orange border/text.
- Documents section should not render for any booking.
- Status badges render with subtle colored borders on dark background.
- No verification alert panel should appear; if an inline “Status: …” remains, confirm it no longer blocks any action and say if you want that line hidden entirely.
## [2025-10-30] Remove verify-email route (Codex)
Summary
- Removed the `/verify-email` route and its import from the web app so users never see verification messaging.
- Left the page file in place for now due to a non-UTF8 encoding issue; it is unreachable and unused.

Files Modified
- apps/booking-web/src/routes.tsx

Testing Notes
- Navigate to `/verify-email` and confirm it is no longer routed (expect 404 or redirect per router defaults).
## [2025-10-30] Normalize quotes on Account + Booking detail (Codex)
Summary
- Fixed mojibake smart quotes on Account and Booking Detail pages by replacing with ASCII apostrophes.
- Booking Detail: replaced a corrupted back-arrow label with plain "Back to account".

Files Modified
- apps/booking-web/src/pages/AccountPage.tsx
- apps/booking-web/src/pages/BookingDetailPage.tsx

Testing Notes
- Visit `/account` and ensure all text reads correctly: "we'll", "you're", "doesn't", "haven't", and "Loading...".
- Visit `/account/bookings/:id` and confirm the "Back to account" link label renders correctly (no strange characters).
## [2025-10-30] API: remove email verification helpers (Codex)
Summary
- Removed unused email verification helpers from the API: the verification email sender and URL builder.
- Switched portal URL derivation to optional `PORTAL_BASE_URL` with a localhost fallback; no dependency on verification envs.
- Cleaned `.env.example` by removing `EMAIL_VERIFICATION_URL` and `EXPOSE_VERIFICATION_TOKEN`.

Files Modified
- apps/booking-api/src/email/email.service.ts
- apps/booking-api/.env.example

Testing Notes
- Build the API and send a booking confirmation to verify links render (they use the booking URL builder, unaffected by removal).
- If you want a custom portal base, set `PORTAL_BASE_URL` in the API environment.

## [2025-10-30] Account page rebuild (fix JSX + encoding) (Codex)
Summary
- Rebuilt `AccountPage.tsx` to resolve JSX errors, missing state setters, and mojibake artifacts.
- Preserved dark theme styling and removed document chips; kept “View details”.
- Restored `profileStatus`/`bookingsStatus` logic with clean loading/error states.

Files Modified
- apps/booking-web/src/pages/AccountPage.tsx

Testing Notes
- Visit `/account` logged in: verify no TypeScript/JSX errors, all sections render, and copy is clean (no weird characters).
## [2025-10-30] Booking Detail page dark restyle (Codex)
Summary
- Restyled `/account/bookings/:id` to match the dark theme: slate-900 sections, slate-800 cards, slate-700 borders, white headings, slate-300 body text, and orange accents.
- Updated status badges for dark readability; refined loading and error states to dark variants.

Files Modified
- apps/booking-web/src/pages/BookingDetailPage.tsx

Testing Notes
- Visit `/account/bookings/:id`:
  - Hero header is dark with orange accents; "Back to account" and "Book another visit" buttons styled consistently.
  - "Services & totals" uses dark cards; amounts are readable; notes card is dark.
  - "Vehicle & contact" uses dark styling; labels in slate-400, values white/slate-300.
  - "Documents" section uses dark cards; link shows orange underline; empty state uses dashed dark card.
  - Status badges are legible on dark backgrounds.
## [2025-10-30] Admin Panel dark restyle (Codex)
Summary
- Restyled the admin dashboard to the site’s dark theme with orange accents.
- Admin header uses a dark gradient hero with white headings and a bordered Logout button.
- Converted Catalog, Calendar, Recipients, and Settings sections to dark cards: slate-900 containers, slate-800 list items, slate-700 borders, white/soft slate text.
- Updated inputs to dark fields and buttons to rounded-full orange with hover lift; destructive actions use subtle red borders.

Files Modified
- apps/booking-web/src/pages/AdminPage.tsx
- apps/booking-web/src/features/admin/CatalogManager.tsx
- apps/booking-web/src/features/admin/CalendarManager.tsx
- apps/booking-web/src/features/admin/RecipientsManager.tsx
- apps/booking-web/src/features/admin/SettingsManager.tsx

Testing Notes
- Visit `/admin` with an ADMIN/STAFF account:
  - Header: dark gradient, white heading, logout button with orange hover.
  - Catalog: dark cards; forms and lists styled dark; tier line shows "Sort order X · Max CC Y".
  - Calendar: exception/extra slots sections are dark; inputs/buttons styled; delete buttons use red accents.
  - Recipients: dark form and list; add/remove flows work.
  - Settings: general form, DVLA integration, and test lookup all use dark styling; currency symbol shows as `£`.
\n## 2025-10-31 – Admin panel contrast fixes (tiers/prices + settings)

Summary:
- Improved readability in Admin by aligning remaining light-theme bits to the site’s dark card pattern.
- CatalogManager: darkened Engine Tiers and Service Prices rows, labels, inputs, and buttons; fixed mojibake in tier summary line.
- SettingsManager: darkened remaining labels/inputs/selects/textarea and helper + message text.

Files Modified:
- apps/booking-web/src/features/admin/CatalogManager.tsx
- apps/booking-web/src/features/admin/SettingsManager.tsx

Testing Notes:
- Visit `/admin` and scan all sections.
- Catalog → Engine tiers: labels are slate-400, inputs use slate-800/700 and text-slate-200; list rows are slate-800 with white headings; action buttons readable with orange hover.
- Catalog → Service prices: helper text slate-400; rows slate-800 with white names and slate-400 prices; Update button readable.
- Settings → General: confirm “Confirm rate limit/day”, Turnstile selects, and Company address use dark inputs; helper/message text uses slate-300/400.
- Calendar/Recipients verified already in dark pattern; no further changes required.
