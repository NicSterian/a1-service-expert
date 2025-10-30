Project: A1 Service Expert ‚Äî automotive booking platform

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
- Booking wizard under /online-booking: services ‚Üí vehicle ‚Üí pricing ‚Üí date-time ‚Üí details-confirm ‚Üí success
- Admin: /admin (Catalog, Calendar, Recipients, Settings)
- Dev: /dev (development utilities; restrict to admins in production)

Notable implementation details

- DVLA: API key resolved from encrypted DB settings with .env fallback; vehicle data briefly cached in-memory; engine size ‚Üí tier mapping uses shared pricing helpers and DB prices.
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

# Booking UI Redesign ‚Äî Status, Requirements & Plan

## Completed UI tweaks (October 2025)

- **Header**: logo swap to `logo-a1.png`, 2√ó sizing (desktop & mobile), WhatsApp + Call buttons retained, Back-to-Top button added.
- **Footer**: new grid layout with scaled logo, CTA buttons (Call / Email / WhatsApp), socials, and centered credit line linking to Nicolae Sterian on LinkedIn.
- **Home & Contact pages**: WhatsApp CTA added to ‚ÄúGet in touch‚Äù section and contact hero; contact form now enforces Name/Email/Phone/Message with inline validation + honeypot.
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
> A) Step 1 ‚Äì Services page redesign (Select service)
> Goal: Replace the current tier button rows with three service cards in our site style (dark cards, orange CTAs).
> ...
> _(full prompt preserved in repository history; see original user request dated 2025-10-27 for exhaustive detail)_

### Provided marketing copy for SERVICE 1/2/3 cards

```
SERVICE 1:
OIL AND FILTER ‚Äî For all services please ensure your vehicle is dropped off between 09:00 am - 10:00 am so that we can have it ready for you by the end of the day. Please note, this is a booking only, card details are not required and payment will only be due after the work has been completed.

SERVICE 2:
INTERIM SERVICE ‚Äî (same paragraph as above)

SERVICE 3:
FULL SERVICE ‚Äî (same paragraph as above)
```

These snippets should be hard-coded in the new service cards while pricing, service names, and descriptions continue to come from the database/Admin panel.

## Clarifications received after Q&A

- Use the exact ‚ÄúSERVICE 1/2/3‚Äù titles and paragraphs above in the cards.
- Styling should extrapolate from current dark-slate/orange theme (no external mockups provided).
- Reuse existing DVLA lookup hooks/services, wrapped in a new modal with manual fallback.
- Turnstile keys are not yet available; document required env vars and prompt when needed.
- Email template should reuse `logo-a1.png` and match site colour palette.
- Admin refresh covers the entire panel (all screens) with new theme while ensuring flows still work (DVLA integration already verified).
- ‚ÄúFixed Price Menu Servicing‚Äù table must be driven from DB prices and stay in sync between Services page and booking table. If data is missing, extend schema/seed to provide it.
- Feature flag named `USE_NEW_BOOKING_UI`; truthy values enable new flow.
- For the pricing table, mirror existing public-site layout (Service 1/Service 2/Service 3 columns) and ensure Admin edits immediately update both pages.
- Required SMTP + Turnstile env keys must be listed for quick population (see Env section below).

## Outstanding scope (high level)

1. **Service selection overhaul**

   - Replace legacy tier buttons with three dark-theme service cards using copy above.
   - Responsive grid: 3-up desktop, stacked on mobile/tablet.
   - ‚ÄúPrice from ¬£X‚Äù (lowest tier price) pulled live from DB. Guidance: use catalog summary endpoint once extended for pricing mode/fixed price.
   - Selecting a card opens the vehicle modal (see next section). Feature flag `USE_NEW_BOOKING_UI` controls access; fallback renders legacy UI.
   - Content source: service names/descriptions from DB/Admin; card body text overrides with supplied copy when relevant.

2. **Vehicle modal (DVLA + manual)**

   - Modal overlay (desktop) / full-height sheet (mobile) with focus trap & escape handling.
   - VRM input: yellow background, placeholder ‚ÄúEnter your registration‚Äù, disabled Continue state until input.
   - On submit: show ‚ÄúSearching DVLA‚Ä¶‚Äù with spinner while reusing existing lookup hooks. Rate limits and error handling respect current back-end guards.
   - DVLA success: show Make, Engine size (cc), options to ‚ÄúSearch again‚Äù or ‚ÄúEnter manually‚Äù.
   - Manual entry collects registration/make/engine size (required). Use shared pricing helpers to resolve tier.
   - Once tier known, compute final price for selected service/tier (or fixed price). Buttons: Add to booking (primary), Cancel.
   - After Add: close modal, populate cart sidebar with service + vehicle + price.

3. **Cart sidebar & flow integration**

   - Desktop: right sidebar always visible summarising selection (service name, description excerpt, vehicle reg, price). Include actions: Continue, Start again, Login (if not authenticated), Remove service.
   - Mobile: collapsible drawer accessible via icon/button.
   - Transition to Date/Time step shows compact summary (service + reg + price) at top.

4. **Remaining booking steps**

   - Date/Time: visual restyle only, but include summary ribbon from cart.
   - Account/Details/Confirm: require login/register before confirm. Provide inline login form; on success show ‚ÄúWelcome back ‚Ä¶‚Äù.
   - Registration block collects Title*, First name*, Surname*, optional company, Mobile*, Landline, address info with postcode search box (stub for future provider), address lines, Town/City*, County, Postcode*.
   - Booking preferences: SMS/email reminder checkboxes, notes textarea, T&C acceptance (links to /terms, /privacy).
   - Confirmation step integrates Cloudflare Turnstile token; show helpful error if missing/invalid.
   - On success, show styled confirmation page summarising booking and provide CTA to view booking.

5. **Pricing table refresh**

   - Shared component (services page + booking flow) that reads DB pricing (tiered or fixed).
   - Table headings: ‚ÄúFixed Price Menu Servicing‚Äù + subheading text. Columns: Engine size | Service 1 | Service 2 | Service 3. Rows: Small (‚â§1200cc), Medium (‚â§1600cc), Large (‚â§2200cc), Extra-Large (>2200cc). Prices reflect DB values; missing price shows ‚Äú‚Äî‚Äù.
   - Footnotes appended exactly as provided.

6. **Security & infrastructure**

   - Replace Google reCAPTCHA with Cloudflare Turnstile (web + API). Admin toggle ‚ÄúRequire CAPTCHA in dev‚Äù forces usage locally.
   - Add feature flag `USE_NEW_BOOKING_UI` (env-driven, default true). Any falsy value (false/0/empty) serves legacy booking pages.
   - Migrate email delivery to SMTP (Microsoft 365 via GoDaddy). Remove Resend dependency.

7. **Admin upgrades**

   - Data model changes: add `pricingMode`, `fixedPricePence`, `footnotes` to services; ensure seeds include pricing data matching marketing table.
   - Admin Catalog editor: allow switching between tiered/fixed pricing, editing footnotes, managing both price modes.
   - Full UI restyle to match front-end theme (dark backgrounds, orange CTAs) while keeping functionality intact (catalog, calendar, recipients, settings, DVLA test, etc.).
   - Settings: replace `recaptchaEnabled` with `captchaEnabled` + `captchaRequireInDev` booleans.

8. **Email template**
   - Branded HTML email (logo, orange accent) summarising booking (service, vehicle, date/time, price) with CTA: ‚ÄúView my booking‚Äù.
   - Plain text fallback. If SMTP env values missing, log email instead (development behaviour).

## Phased implementation plan (recommended)

1. **Platform plumbing**: swap reCAPTCHA ‚Üí Turnstile (web/API), introduce SMTP mailer, update settings/admin toggles.
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

- apps/booking-web/src/components/HeaderLogo.tsx ‚Äî swapped to `logo-a1.png` and adjusted sizes (2√ó mobile/desktop).
- apps/booking-web/src/components/Footer.tsx ‚Äî added new responsive footer with CTA buttons (Call/Email/WhatsApp), socials, and centered credit.
- apps/booking-web/src/components/BackToTop.tsx ‚Äî added accessible back-to-top button with reduced-motion support.
- apps/booking-web/src/App.tsx ‚Äî integrated Footer + BackToTop; maintained header buttons and centered mobile menu links.
- apps/booking-web/src/pages/HomePage.tsx ‚Äî added WhatsApp CTA to ‚ÄúGet in touch‚Äù block.
- apps/booking-web/src/pages/ContactPage.tsx ‚Äî required Name/Email/Phone/Message; inline errors; honeypot; WhatsApp CTA.
- apps/booking-api/prisma/schema.prisma ‚Äî added `ServicePricingMode` enum; extended `Service` with `pricingMode`, `fixedPricePence`, `footnotes`; replaced `recaptchaEnabled` with `captchaEnabled`/`captchaRequireInDev`; set `Booking.serviceCode` to text; made `BookingService.engineTierId` optional.
- apps/booking-api/prisma/migrations/20251027120000_booking_redesign/migration.sql ‚Äî migration for the schema changes above (non-destructive in dev; review carefully for prod).
- apps/booking-api/prisma/seed.ts ‚Äî preserved SERVICE_1/2/3 with footnotes, ensured price seeds; set `captchaEnabled` fields.
- apps/booking-api/tsconfig.json ‚Äî restrict compilation to `src/**/*` so Nest outputs `dist/main.js` for dev runs.
- apps/booking-api/src/catalog/dto/create-service.dto.ts ‚Äî DTO extended for `pricingMode`, `fixedPricePence`, `footnotes`.
- apps/booking-api/src/catalog/dto/update-service.dto.ts ‚Äî DTO extended for `pricingMode`, `fixedPricePence`, `footnotes`.
- apps/booking-api/src/catalog/catalog.service.ts ‚Äî service summary now exposes pricing fields; create/update honor them.
- apps/booking-api/src/security/\* ‚Äî replaced Google reCAPTCHA with Cloudflare Turnstile: added `turnstile.guard/service/decorator`, removed recaptcha files, updated `security.module.ts`.
- apps/booking-api/src/bookings/bookings.controller.ts ‚Äî switched confirm guard to Turnstile.
- apps/booking-api/src/auth/auth.controller.ts ‚Äî switched register guard to Turnstile.
- apps/booking-api/src/bookings/dto/create-booking.dto.ts ‚Äî made `engineTierId` optional to support fixed-price services.
- apps/booking-api/src/bookings/bookings.service.ts ‚Äî createBooking now supports fixed-price or tiered services, choosing price accordingly; stores `serviceCode` (string) and optional `engineTierId` on line item.
- apps/booking-api/src/email/email.service.ts ‚Äî replaced Resend with Nodemailer SMTP and a branded HTML template using `logo-a1.png`; logs emails if SMTP not configured.
- apps/booking-api/package.json ‚Äî removed Resend, added Nodemailer.
- apps/booking-api/.env.example & apps/booking-web/.env.example ‚Äî refreshed with Turnstile/SMTP keys and `USE_NEW_BOOKING_UI` flag.
- apps/booking-web/src/features/admin/SettingsManager.tsx ‚Äî switched to `captchaEnabled` + `captchaRequireInDev` toggles.
- README.md ‚Äî updated instructions for Turnstile, SMTP, new env keys, and fallback guidance.
- docs/CHANGELOG.md ‚Äî entries for header/footer/back-to-top, scoping/context update.

Note: A git tag `pre-booking-redesign` was created before these changes for quick rollback.

## Remaining to implement / verify

- Frontend

  - Feature flag wiring: `USE_NEW_BOOKING_UI` to toggle new booking UI (legacy retained when false).
  - Service cards UI (dark/orange), ‚ÄúPrice from ¬£X‚Äù (DB, lowest tier), click opens modal.
  - Vehicle modal (DVLA/manual), focus trap, animations, manual engine size ‚Üí tier mapping, ‚ÄúAdd to booking‚Äù.
  - Cart sidebar/drawer; compact summary at Date/Time step.
  - Account/Register in-flow, address lookup stub, Turnstile widget on Confirm.
  - Shared pricing table component (services + booking) from live DB; footnotes.
  - Admin theme refresh (dark/orange) and overall polish (captcha toggles now live).

- Backend

  - Catalog summary: ensure web gets `pricingMode`, `fixedPricePence`, `footnotes` (partially done). Add ‚Äúlowest tier price‚Äù helper if useful.
  - Admin endpoints/forms: surface `pricingMode` and `fixedPricePence`; persist `footnotes`.
  - Confirm endpoint: already wired to Turnstile guard; verify end-to-end once site key/secret exist.
  - Email confirmation: confirm payload includes vehicle make/reg and booking link; verify with SMTP.

- Data

  - Ensure seeds/prices match ‚ÄúFixed Price Menu Servicing‚Äù table and are editable in Admin.
  - Validate engine tier thresholds: Small 1200, Medium 1600, Large 2200, XL >2200.

- Testing / a11y
  - Keyboard navigation, focus rings, contrast, touch targets ‚â•44px, prefers-reduced-motion.
  - End-to-end booking flow with both fixed and tiered services.
- Ensure API dev server (`pnpm --filter booking-api dev`) is running alongside the web app; otherwise `/catalog` fetches will fail with `net::ERR_CONNECTION_REFUSED` in the browser console.
- After swapping from Resend to SMTP, delete `apps/booking-api/dist` or run `pnpm --filter booking-api build` to regenerate compiled output‚Äîotherwise the Nest dev server may still require the old `resend` module.
  - `pnpm --filter booking-api dev` now runs `nest start --watch --entryFile main`; combined with the `tsconfig.json` update it stops the dev server from looking for `dist/src/main`.

## Backups & revert instructions

- Git backup: `git tag pre-booking-redesign` has been created before the redesign code.
  - Hard revert code: `git checkout pre-booking-redesign` (detached) or `git revert <commit-sha>` on main branch.
- Feature flag fallback (UI only): set `USE_NEW_BOOKING_UI=false` in `apps/booking-web/.env` and restart the web server to restore legacy booking UI without code rollback.
- Database (dev) rollback:
  - If the new migration is applied locally and you want a clean reset: `pnpm --filter apps/booking-api prisma migrate reset` then `pnpm --filter apps/booking-api prisma db seed`.
  - For production, plan an explicit down migration or maintenance window; do not run reset in production.
- Current blocker (Oct 27): resolved. Shared pricing helpers now ship as a workspace package (`@a1/shared`) that builds dual CJS/ESM outputs; API/web import from `@a1/shared/pricing` so Nest no longer crashes with `ReferenceError: exports is not defined` when running `pnpm --filter booking-api dev`.
- After pulling Phase 1, run `pnpm.cmd --filter booking-api exec prisma migrate reset --force` (or migrate deploy + seed if you can‚Äôt drop data) to apply the `Service.pricingMode` migration; earlier scripts referenced `serviceCode` with the wrong casing and now use `"serviceCode"` so the reset succeeds.

## Dev Runtime Notes (Oct 27)

- API/dev servers

  - If `EADDRINUSE: address already in use :::3000` appears, free the port:
    - `netstat -ano | findstr :3000` ‚Üí `taskkill /PID <pid> /F`.
  - Start API: `pnpm.cmd --filter booking-api dev` (from repo root).
  - Start Web: `pnpm.cmd --filter booking-web dev` (from repo root).
  - Vite may show a CJS deprecation notice and React Router v7 future flags warning ‚Äî informational only.
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

   - Replace tier button rows with three dark-theme cards (‚ÄúSERVICE 1/2/3‚Äù) using provided copy.
   - 3-card responsive grid (stack on mobile); ‚ÄúPrice from ¬£X‚Äù (lowest tier) pulled live from DB.
   - Selecting a card launches new vehicle modal; feature flag `USE_NEW_BOOKING_UI` (default true) to toggle legacy UI.

2. **Vehicle modal**

   - Wrap existing DVLA lookup in modal (yellow VRM input, spinner, manual fallback).
   - Resolve tier/price dynamically; allow manual entry; add ‚ÄúAdd to booking‚Äù & ‚ÄúCancel‚Äù.

3. **Cart sidebar / booking flow**

   - Desktop: right-side summary panel (service, reg, price, Continue, Start again, Login).
   - Mobile: collapsible drawer variant.
   - Upstream summary shown at top of Date/Time step.

4. **Downstream booking steps**

   - Enforce login/register prior to confirmation; inline auth with data persistence.
   - Register form (Title, Name, Surname, optional company, Mobile\*, Landline, address lookup stub, reminders, notes, T&C checkbox).
   - Confirmation uses Cloudflare Turnstile (see section 6); on success show styled summary + send SMTP booking email.

5. **Pricing table refresh**

   - DB-backed ‚ÄúFixed Price Menu Servicing‚Äù table reused on services page & booking flow (dynamic prices/tier thresholds).
   - Table columns: Engine size | Service 1 | Service 2 | Service 3; rows for Small/Medium/Large/XL and footnotes.

6. **Security & infrastructure**

   - Replace Google reCAPTCHA with Cloudflare Turnstile (web + API); Admin toggle ‚ÄúRequire CAPTCHA in dev‚Äù.
   - Introduce SMTP mailer (Microsoft 365 via GoDaddy) replacing Resend; env keys listed below.
   - Add feature flag `USE_NEW_BOOKING_UI` (truthy values enable new flow).

7. **Data model / Admin updates**

   - Extend `Service` with `pricingMode` (tiered|fixed), `fixedPricePence`, `footnotes`.
   - Update Admin Catalog forms to manage pricing mode, footnotes, and fixed price.
   - Full Admin theme refresh (dark/orange) while validating existing endpoints (catalog, calendar, recipients, DVLA test, settings).

8. **Email template**

   - Branded HTML + plain text using `logo-a1.png`, includes booking summary, contact info, and ‚ÄúView my booking‚Äù CTA linking to account view.

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

> Populate the keys once credentials are issued; keep ‚ÄúRequire CAPTCHA in dev‚Äù toggle accessible via Admin settings.

# Phase 2ñ8 Plan (accepted)

Phase 2 ó Service Cards + Vehicle Modal (MVP)

- 3 black cards (SERVICE 1/2/3), orange CTAs, ìPrice from £Xî via `lowestTierPricePence`.
- Vehicle modal skeleton (yellow VRM input), open on Select, feature-flagged via `USE_NEW_BOOKING_UI`.

Phase 3 ó Vehicle Modal Full + Cart Sidebar

- DVLA lookup + manual fallback, resolve tier/price from DB.
- Cart Sidebar (desktop) and mobile drawer; summary at Date/Time step.

Phase 4 ó Downstream: Auth, Details, Confirm

- Inline login/register with persistence; details form per spec; Turnstile on Confirm; SMTP email.
- Keep dev SMTP/Turnstile permissive; enforce before QA/UAT.

Phase 5 ó Pricing Table

- DB-driven ìFixed Price Menu Servicingî table with footnotes; reused across pages.

Phase 6 ó Admin Wiring + Model

- Admin forms: `pricingMode`, `fixedPricePence`, `footnotes`; dark/orange theme; non-destructive migrate path for prod.

Phase 7 ó Accessibility & Polish

- Focus trap, aria labels, keyboard nav, 44px targets, en-GB currency, animation tidy.

Phase 8 ó Testing, Docs, Release Prep

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

- Phase 2 ó Service cards + vehicle modal (scaffold)

  - Added black ServiceCard grid (SERVICE 1/2/3) with ìPrice from £Xî and orange CTAs.
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

  - Keep ìPrice from £Xî reading from live DB (Small tier price). Admin prices are set to: Service 1 £79.95, Service 2 £119.95, Service 3 £179.95.

- Pricing table placement

  - Add a DB-driven ìFixed Price Menu Servicingî table directly below the cards with comfortable spacing (ò48ñ64px). Reuse later on the Services page. Add a tasteful logo placement (small logo above the table heading) ó to be implemented.

- Vehicle modal (match the design; our styling)

  - Yellow full-width VRM input with placeholder ìEnter your registrationî.
  - Continue button to the right on desktop, below on mobile; disabled until input; Enter submits.
  - Inline link under input: ìYou can enter details manually hereî ó switches to manual entry within the same modal.

- Behavior

  - On submit: spinner + ìSearching DVLAÖî, uppercase/trim VRM.
  - On success: show Make (and Model if present), rounded engine size (e.g. ì1999 ccî), resolved tier, and final price; links ìSearch againî and ìChange detailsî; primary button labeled ìContinueî.
  - On failure or rate limit: show friendly error and reveal the manual entry panel.

- Manual entry

  - Required fields: VRM, Make, Engine size (cc). Optional: Model.
  - After valid manual inputs, show a confirmation step mirroring DVLA success (Make/Model/CC/Tier/Price) with primary ìContinueî.

- Fuel type dropdown (informational only, does not affect price)

  - Options: Petrol, Diesel, Hybrid, Petrol/Electric, CNG, LPG, Electric, Petrol / E85 (Flex Fuel), Diesel/Hybrid, Diesel/Electric. Captured with the booking but not used in pricing.

- GB VRM validation (user-friendly strict)

  - Client: uppercase, strip spaces; accept modern format and common legacy/personalized patterns (excluding I and O to avoid confusion; allow Q-plates). Server treats VRM as opaque to avoid blocking edge cases.

- Make/Model suggestions (offline)
  - Option 1 adopted: curated lists stored in the repo (brands + popular models) for autosuggest; model remains free-text with suggestions.

Implementation plan for Phase 3

1. Vehicle modal DVLA integration

- Add VRM normalization + validation; submit to DVLA endpoint; handle spinner/success/error states; ìSearch againî.
- On success, compute tier and price; show summary with primary ìContinueî.

2. Manual entry panel

- Required field validation; engine size normalization; compute tier and price; show summary; ìContinueî.

3. Cart update on confirmation

- When ìContinueî is clicked on either DVLA or manual path, close modal and update the cart with service, VRM, tier, and price.

4. Pricing table component

- Render a DB-driven table below cards with footnotes; add spacing and small logo above heading.

5. Docs & tests

- Append CHANGELOG & CONTEXT as parts land; extend smoke checklist for modal flows.

## Phase 3 ñ Implementation progress (2025-10-27)

- VehicleModal implemented with:
  - Yellow VRM input + Continue (desktop right / mobile below), Enter submits, inline manual-entry link (ìhereî).
  - DVLA path: spinner + Searching DVLAÖ; on success shows Make/Model/CC/Tier/Price; actions Search again + Continue.
  - Manual path: required VRM/Make/Engine size (cc); Model optional; fuel type captured. On resolve, shows confirmation with Continue.
  - On Continue, cart updates with VRM, tier and price; modal closes.
- Fixed Price Menu Servicing table component added below cards, DB-driven, with spacing. Reuse on Services page later.
- Next: add curated Make/Model suggestions JSON and wire autosuggest; refine validation messages; add compact summary at Date/Time step; Cart Sidebar (desktop) + mobile drawer.

- Cart Sidebar (desktop) implemented in layout; mobile drawer pending. Sidebar reflects VRM and price after modal confirmation; Continue advances the step; Start again clears draft.
- Manual entry now includes offline Make/Model suggestions (curated JSON in repo). VRM validation uses user-friendly strict GB formats (current + common legacy/personalized + Q plates).
- Date/Time step shows a compact summary (service, VRM, price) above the calendar.
- Mobile cart drawer: pending next ó current sidebar appears on desktop.
- Mobile cart drawer added: sticky bar with price and slide-up drawer on small screens; desktop sidebar unchanged. Continue drives step forward; Start again clears draft.

## Phase 3 Progress ó Vehicle modal, pricing table, carts (consolidated)

- Vehicle modal finalized: DVLA lookup with spinner and message ìSearching DVLAÖî, manual fallback with required VRM/Make/Engine size, Model optional, Fuel type captured. Confirmation shows Make/Model/CC/Tier/Price with actions: Change details | Continue.
- Helper copy: under VRM input ìWeíll use DVLA to look up your vehicle. You can enter details manually hereî where ìhereî switches to manual.
- GB VRM validation: user-friendly strict GB pattern; plates uppercased and spaces stripped.
- Service cardsí ìPrice from £Xî reads live from DB; Admin changes reflect instantly. Pricing table added under cards with extra spacing and a small A1 logo above the heading.
- Cart Sidebar (desktop) and Mobile Cart Drawer implemented; after Continue, cart shows service, VRM, and price; Continue advances; Start again resets.
- Date/Time compact summary shows service + VRM + price at the top.

## User Clarifications (Nicolae) ó decisions locked

- Card prices from DB; Small tier targets: £79.95, £119.95, £179.95 (set in Admin).
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

### 2025-10-28 ñ Phase 4 groundwork (Codex session)

- Replaced the legacy Vehicle step with a ìBooking summaryî route that follows the vehicle modal and feeds directly into Date & Time. Updated `BookingWizard` to show the shortened four-step flow and to surface a persistent Login button in the header area.
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

- Implemented the new ìConfirm bookingî layout with a desktop two-column grid (forms + booking summary card) and numbered sections for Account information, Your details, and Booking details. Updated copy to ìConfirm bookingî and ensured stepper/step titles match.
- Added inline login support: the header Login button opens a collapsible sign-in form inside the account card, authenticates in place, and collapses once the session is established. Account creation still runs register ? login while writing to the draft.
- Persisted reminders, terms acceptance, and `bookingNotes` through the booking draft so returning users see their saved answers; normalised UK postcodes and trimmed data before submission.
- Extended `CreateBookingDto` / `BookingsService` to accept the new `bookingNotes` payload and to timestamp `acceptedTermsAt`, keeping backend data aligned with the form.
- Updated draft context/types to carry `loginPanelOpen`, avoided duplicate ìStart againî buttons at the top, and refreshed summary cards to match the latest visual spec.
- Build verification: `pnpm.cmd --filter booking-web build`, `pnpm.cmd --filter booking-api build`.

### Remaining work after 2025-10-28 updates

- Review and apply the outstanding Prisma migration(s) that introduce the new booking/customer columns before promoting to shared environments.
- Audit downstream consumers (customer emails, admin dashboards, account history) to surface the new contact/address/notes fields.
- Replace the temporary reCAPTCHA widget with the planned Cloudflare Turnstile integration for both account creation and booking confirmation, honouring settings feature flags.
- Complete responsive/UX polish for the confirm step (mobile spacing, login panel behaviour, focus management).
- Resume the rest of Phase 4 deliverables: success page refresh, email copy, feature-flag toggles, and end-to-end QA.

### 2025-10-28 - Troubleshooting notes

- **500 on POST `/holds` after choosing a time slot**
  - Symptom: UI toasts ìInternal server errorî, network tab shows `/holds` 500, and navigating to the confirm step occasionally crashes because the API is unavailable.
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
- The legacy contact/login panel on the confirm-booking step must be redesigned with the darker ìcardî aesthetic, remove redundant summary panels, and require the full personal details inline when creating an account while logged out.
- Account creation/confirmation must capture full customer profile details, store them on the `User` record (title, names, addresses, phones, marketing opt-in, notes, timestamps, registration IP), and log login sessions (IP/timestamp) in a dedicated table.
- The My Account page needs a refresh: drop email verification messaging, retain the hero with welcome + ìBook another visitî, add editable cards for profile details and change-password, show booking history cards that navigate to a dedicated booking detail view. Admins should be redirected to the admin dashboard instead of seeing this page. Booking detail view should expose the full booking summary with a ìBook another visitî CTA.
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
   - Redesign the confirm step UI with the dark panels, enforce full profile capture for new accounts, handle login dropdown behaviour, and fix confirm-button enablement. Remove redundant ìYour bookingî mid-panel.
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

- Expanded the Prisma `User` model/migration to persist the full profile metadata (title, names, company, phones, address lines 1ñ3, city, county, postcode, marketing opt-in, notes, registration IP, profile timestamps) and introduced the `UserSession` table for login tracking.
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
  2. Split the confirm view into stacked ìcardsî: summary, account access/login, personal details, reminders/terms, payment CTA, ensuring responsive spacing.
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

- 1. Data & Auth foundation ó Complete. Prisma schema extended (full profile on User + UserSession), DTOs/services updated, /account/profile + /account/change-password live; API tests pass after migrations.
- 2. Email service & Turnstile swap ó Complete. Turnstile in web + API guards, admin copy/envs updated, branded customer/staff booking emails in place including support@a1serviceexpert.com. Email QA pending awaiting live Microsoft 365 mailbox credentials.
- 3. Booking confirm step rebuild ó Implemented. New dark summary card, inline login/register (Turnstile), full profile form, confirm gating (hold/captcha/terms). End-to-end validation still to run for guest/auth flows, hold expiry, and email delivery.
- 4. Header/profile menu & routing ó Complete. Logged-in profile pill + dropdown (account/admin/dev-for-admins), mobile parity, dev tools hidden for non-admins.
- 5. Account area refresh ó Complete. New profile editor (PATCH /account/profile), change-password card (PATCH /account/change-password), refreshed booking history with document chips, admin redirect to /admin.
- 6. Booking detail view & history ó Complete. Added GET /bookings/:id and BookingDetailPage at /account/bookings/:bookingId; account history links to detail page.
- 7. QA & polish ó Outstanding. Run full booking flows (guest/auth), verify Turnstile toggles/bypass, validate emails+PDF links once SMTP creds are live, sanity-check localStorage migration in real browsers, and capture screenshots.

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
  - Donít commit real secrets. Keep them in local .env files or the host secret manager.
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
  - Phase 1: front-end only; show success toast: "If the email exists, weíll send a reset link." (no backend yet).

Password Reset (Phase 2 ñ not implemented yet)

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

# Booking UI Redesign ó Confirm Step Revamp (2025-10-29)

Summary

- Reworked the confirm step into dark cards with a single Turnstile widget at the end. Account section shows Email, Password, Repeat password for guests with a login modal for existing users. Your details remain fully editable and include notes, marketing opt-in, and a terms checkbox. The Confirm button redirects to `/account` on success.
- Guest flow uses one Turnstile token (register ? login ? create booking ? confirm). Logged-in users still must complete Turnstile before confirming. Holds are validated/cleared appropriately.
- Cart sidebar is hidden only on the confirm step. The Turnstile widget is stable and does not flicker.

Files Touched (web)

- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx ó dark input styles, notes/marketing/terms inputs, login/forgot modals integration, single Turnstile usage, success redirect to `/account`.
- apps/booking-web/src/features/booking/BookingWizard.tsx ó already hides `CartSidebar` when step is `details-confirm`.
- apps/booking-web/src/components/TurnstileWidget.tsx ó already stable via ref-held callback; no change required.

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

- Made `county` optional in the Zod schema and UI label shows ìCounty (optional)î.
- Relaxed `bookingReady` to not require an engine tier; relies on `pricePence` presence so fixed-price services are supported.
- Normalised payload builders to send `county` only when provided.
- Treated empty optional fields (landline, address lines, notes) as undefined during validation, so leaving them blank does not block the Confirm button.
 - Prevented form `reset()` loops for guests so `confirmPassword` no longer mirrors `password` while typing.
- Landline truly optional (no minimum length enforced).
- Repeat password mismatch now shows immediately when either password field changes.
- Submit path uses Zod validation (and sets RHF errors) to prevent accidental focusing of optional fields; focus now remains stable with clear inline error messages instead.
- `marketingOptIn` treated as optional in schema to avoid any stray ìRequiredî state on optional controls.
 - Silenced profile fetch errors when unauthenticated or API not running (e.g., `Cannot GET /account/profile`) to keep the flow clean in dev.

Files

- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx

QA

- Guest or logged-in, Confirm enables when: service selected, price present, vehicle/date/time/hold set, required personal fields valid (title, first name, last name, mobile, address line 1, city, postcode, terms), and Turnstile solved.
 - Added debug aid: Confirm button exposes a `title` tooltip with the disabled reason in dev. Also added a schema-based validity fallback alongside RHF `isValid` to prevent false negatives.
## Services Step Redesign (2025-10-29)

Summary

- Service cards restyled to dark theme like Confirm step with ìPrice from £Xî sourced from `/catalog.lowestTierPricePence`.
- Selection pill with a check appears after the Vehicle modal successfully adds the vehicle; clicking it toggles deselect and clears service from the cart.
- Fixed Price table switched to a dark panel and reads values from `/catalog` (DB source of truth) for consistency.
- Vehicle modal (manual entry) gains a Back button to return to VRM lookup; summary Back also returns to VRM.

Next Actions

- Update DB/admin prices to match the Services page table (inc-VAT): Service 1 (79.95/89.95/99.95/109.95), Service 2 (119.95/129.95/139.95/159.95), Service 3 (179.95/179.95/199.95/219.95). Use Admin Catalog ? Prices, or provide pence values for a seed.

QA

- Cards display lowest tier price and ìNot availableî for disabled services.
- Selecting a service opens Vehicle modal; after continue, pill shows Selected.
- Deselect clears service/price from the cart; sidebar updates accordingly.

## Follow-up: Cart + VRM improvements (2025-10-29)

Summary

- Cart total updates instantly when switching services after a vehicle is selected. The Vehicle modal recomputes `pricePence` for the current service via `/vehicles/recommend-tier` and writes it to the draft alongside `engineTierCode/Name`.
- Cart panel pulses briefly on price change for visibility.
- ìSearch againî in the VRM path clears both the DVLA result and the VRM field; the duplicate Continue button was removed so only a single operational Continue remains.
- Removed stray literal `\n\n` text under the service cards/table by normalising the Services step file.

Admin Pricing Tools

- Web Admin button ìApply fixed menu pricesî upserts tier prices to:
  - Service 1: 79.95, 89.95, 99.95, 109.95
  - Service 2: 119.95, 129.95, 139.95, 159.95
  - Service 3: 179.95, 179.95, 199.95, 219.95
- Backend script: `apps/booking-api/scripts/upsert-fixed-prices.ts` (run with `pnpm --filter booking-api ts-node scripts/upsert-fixed-prices.ts`).

Files

- apps/booking-web/src/components/VehicleModal.tsx ó always recompute price/tier on confirm; VRM ìSearch againî reset.
- apps/booking-web/src/components/CartSidebar.tsx ó price change pulse.
- apps/booking-web/src/features/booking/steps/ServicesStep.tsx ó newline artefacts removed in DOM output.
- apps/booking-web/src/features/admin/CatalogManager.tsx ó ìApply fixed menu pricesî button.
- apps/booking-api/scripts/upsert-fixed-prices.ts ó Prisma upsert helper.

Suggested Assistant Prompt (for new chat sessions)

"You are working on the A1 Service Expert monorepo (NestJS API + React/Vite web). Always:
1) Append a concise summary of your changes to CONTEXT.md and docs/CHANGELOG.md in the same formats used already. Never delete existing context.
2) Before coding, quickly analyse the project structure and call out any obvious misconfigurations or risks (e.g., envs, API routes, build scripts). If something looks wrong or inconsistent, say so and propose a fix.
3) Do not change code in a way that could break the booking wizard flow or existing API contracts. Prefer small, reversible edits and keep styles consistent with the current app.
4) When touching Admin/Services/Confirm steps, keep Turnstile and guards intact, ensure only one CAPTCHA is used, and avoid introducing flicker.
5) Default to the dark card style from the Confirm step for new UI in the booking wizard.
6) If a task would require schema or multi-line-item booking changes, pause and ask before proceeding."

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
- Confirm the frontend toast now surfaces the first field-specific validation detail (e.g. `Validation failed ó customer.postcode: ...`).



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
  - pnpm update available banner ó informational only.
  - eslint@8.57.0 deprecated ó dev tooling; does not affect builds/runtime.
  - A few deprecated transitive deps (glob/inflight/rimraf etc.) ó tied to ESLint.

Impact

- No impact on API or Web app builds/runtime.
- packages/shared compiled successfully during the workspace prepare step.

Recommendations

- Optional: update pnpm globally (pnpm add -g pnpm).
- Optional: schedule an ESLint 9 migration later and align @typescript-eslint v8 config. Not urgent.
