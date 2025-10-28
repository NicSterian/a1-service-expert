# A1 Service Expert - Change Log

## [2025-10-29] Turnstile swap & email templates (Codex)
**Summary**
- Swapped the booking confirmation step to the Cloudflare Turnstile widget and updated admin copy/env hints to match the new security integration.
- Reworked booking confirmation emails with branded customer and staff templates, richer booking/customer data, and automatic delivery to `support@a1serviceexpert.com` alongside configured recipients.

**Files Modified**
- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx
- apps/booking-web/src/components/TurnstileWidget.tsx
- apps/booking-web/src/features/admin/SettingsManager.tsx
- apps/booking-web/.env.example
- apps/booking-api/src/bookings/bookings.service.ts
- apps/booking-api/src/email/email.service.ts

**Testing Notes**
- pnpm.cmd --filter booking-api test -- --config jest.config.ts *(fails: `src/__tests__/pricing-regression.spec.ts` still expects legacy `customer.name` fields)*

## [2025-10-29] Data & auth foundation (Codex)
**Summary**
- Extended the Prisma `User` schema with full profile fields and added the `UserSession` table/migration so sign-ins capture IP and user agent metadata.
- Updated auth DTOs, responses, and service logic to collect/sanitise the richer profile payload, auto-verify email on registration, and log sessions.
- Introduced the Account module exposing JWT-guarded `/account/profile` (GET/PATCH) and `/account/change-password` endpoints plus shared validation utilities.

**Files Modified**
- apps/booking-api/prisma/schema.prisma
- apps/booking-api/prisma/migrations/20251028140000_user_profile_sessions/migration.sql
- apps/booking-api/src/app.module.ts
- apps/booking-api/src/auth/auth.controller.ts
- apps/booking-api/src/auth/auth.responses.ts
- apps/booking-api/src/auth/auth.service.ts
- apps/booking-api/src/auth/dto/register.dto.ts
- apps/booking-api/src/common/utils/profile.util.ts
- apps/booking-api/src/common/validation/profile.constants.ts
- apps/booking-api/src/account/account.module.ts
- apps/booking-api/src/account/account.controller.ts
- apps/booking-api/src/account/account.service.ts
- apps/booking-api/src/account/dto/update-profile.dto.ts
- apps/booking-api/src/account/dto/change-password.dto.ts

**Testing Notes**
- pnpm.cmd --filter booking-api test -- --config jest.config.ts *(fails: `src/__tests__/pricing-regression.spec.ts` still references the legacy `customer.name` field)*

# A1 Service Expert — Change Log

## [2025-10-28] Confirm booking step rebuild (in progress)
**Summary**
- Reimplemented the booking wizard’s final step with the new “Confirm booking” layout, numbered sections, and inline login/register workflow that keeps users inside the flow.
- Persisted customer contact/address/reminder data (including notes) through the draft and API so admins receive the extended payload when a booking is created.
- Updated wizard state to manage the login panel, tightened button placement, and refreshed the booking summary card styling.
- Added backend support for bookingNotes and terms timestamps while leaving Turnstile integration for a follow-up pass.

**Files Modified**
- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx
- apps/booking-web/src/features/booking/BookingWizard.tsx
- apps/booking-web/src/features/booking/state.tsx
- apps/booking-web/src/features/booking/types.ts
- apps/booking-api/src/bookings/dto/create-booking.dto.ts
- apps/booking-api/src/bookings/bookings.service.ts

**Testing Notes**
- pnpm.cmd --filter booking-web build
- pnpm.cmd --filter booking-api build
## [2025-10-28] Booking summary flow & Phase 4 scaffolding (in progress)
**Summary**
- Replaced the legacy Vehicle wizard step with an inline “Booking summary” route, updated navigation copy, and surfaced a persistent Login control above the stepper.
- Restyled desktop/mobile carts to show rich service/vehicle/tier details and drive the shortened flow.
- Extended booking draft/types and API DTO/Prisma schema to cover forthcoming customer details (title/names, address, SMS opt-in, terms). Added a draft migration for the new fields.
- Removed the old DetailsConfirmStep in preparation for the new confirm-booking form; rebuilding this step remains outstanding before the flow is functional.

**Files Modified**
- apps/booking-web/src/features/booking/BookingWizard.tsx
- apps/booking-web/src/features/booking/steps/ServicesStep.tsx
- apps/booking-web/src/features/booking/steps/PriceStep.tsx
- apps/booking-web/src/components/CartSidebar.tsx
- apps/booking-web/src/components/MobileCartDrawer.tsx
- apps/booking-web/src/features/booking/types.ts
- apps/booking-web/src/routes.tsx
- apps/booking-api/src/bookings/dto/create-booking.dto.ts
- apps/booking-api/src/bookings/bookings.service.ts
- apps/booking-api/prisma/schema.prisma
- apps/booking-api/prisma/migrations/20251027130000_booking_contact_details/migration.sql
- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx (removed pending rebuild)

**Testing Notes**
- Build currently blocked until the new DetailsConfirmStep implementation is completed and API schema changes are validated. No automated tests run in this state.
# A1 Service Expert â€“ Change Log

## [2025-10-27] Prisma migration casing fix
**Summary**
- Updated `20251027120000_booking_redesign` migration to cast `"Booking"."serviceCode"` with the correct quoted casing so resets/migrate deploy succeed on fresh databases.
- Documented the required Prisma reset command in CONTEXT.md for developers pulling Phaseâ€¯1 locally.

**Files Modified**
- apps/booking-api/prisma/migrations/20251027120000_booking_redesign/migration.sql
- CONTEXT.md

**Testing Notes**
- `pnpm.cmd --filter booking-api exec prisma migrate reset --force`

## [2025-10-27] Dev runtime stabilization (ports, seeds, shared pkg)
**Summary**
- Resolved repeated `EADDRINUSE: address already in use :::3000` during `pnpm --filter booking-api dev` by identifying and killing the blocking PID (`taskkill /PID 8388 /F`).
- Successfully applied Phase 1 DB changes by running a Prisma reset on the dev database when migrate deploy failed (`pnpm.cmd --filter booking-api exec prisma migrate reset --force`).
- Verified web dev server boots; noted Vite CJS deprecation notice and React Router v7 future flag warning (informational only; no code changes required now).
- Confirmed shared pricing package now works at runtime: `@a1/shared` dual CJS/ESM outputs consumed by both API and Web.

**Files Modified**
- Documentation only (this file) â€” operational notes; code changes already captured in earlier entries.

**Testing Notes**
- Free occupied port: `netstat -ano | findstr :3000` â†’ `taskkill /PID <pid> /F`.
- Start API: `pnpm.cmd --filter booking-api dev`.
- Start Web: `pnpm.cmd --filter booking-web dev`.

## [2025-10-27] Catalog lowest-tier price + Router v7 flags
**Summary**
- API: added `lowestTierPricePence` to `GET /catalog` service summaries. For FIXED services, uses `fixedPricePence`; for TIERED, computes min of current tier prices.
- Web: opted into React Router v7 `startTransition` future flag to silence dev warning and align with upcoming v7 behavior.
- Decision: keep dev SMTP/Turnstile permissive; enforce before final testing (see CONTEXT.md notes).

**Files Modified**
- apps/booking-api/src/catalog/catalog.service.ts
- apps/booking-web/src/main.tsx
- apps/booking-web/src/features/booking/types.ts
- CONTEXT.md

**Testing Notes**
- API: `pnpm --filter booking-api build` and verify `/catalog` returns `lowestTierPricePence`.
- Web: `pnpm --filter booking-web dev` confirms Router v7 warning is gone.

## [2025-10-27] Shared pricing package dual-build fix
**Summary**
- Converted `packages/shared` into a built workspace package that emits both CJS/ESM bundles and central index exports.
- Updated API and web apps to consume `@a1/shared/pricing` via workspace dependency with TypeScript path support.
- Removed stale compiled artifacts from shared sources and tightened tooling/tsconfig for cross-runtime compatibility.

**Files Modified**
- packages/shared/package.json
- packages/shared/tsconfig.json
- packages/shared/tsconfig.cjs.json
- packages/shared/tsconfig.esm.json
- packages/shared/.gitignore
- packages/shared/src/index.ts
- packages/shared/src/pricing.js (removed)
- packages/shared/src/pricing.d.ts (removed)
- packages/shared/src/pricing.d.ts.map (removed)
- packages/shared/src/pricing.js.map (removed)
- apps/booking-api/package.json
- apps/booking-api/tsconfig.json
- apps/booking-api/src/bookings/bookings.service.ts
- apps/booking-api/src/catalog/catalog.service.ts
- apps/booking-api/src/vehicles/vehicles.service.ts
- apps/booking-web/package.json
- apps/booking-web/tsconfig.json
- apps/booking-web/vite.config.ts
- apps/booking-web/src/features/booking/types.ts
- apps/booking-web/src/features/booking/steps/PriceStep.tsx
- apps/booking-web/src/features/booking/steps/ServicesStep.tsx
- apps/booking-web/src/features/booking/steps/VehicleStep.tsx
- CONTEXT.md

**Testing Notes**
- `pnpm --filter @a1/shared build`
- `pnpm --filter booking-api build`
- `pnpm --filter booking-web build`

## [2025-10-27] Header & WhatsApp Update
**Summary**
- Centered header logo (desktop), moved logo to left on mobile.
- Added WhatsApp button next to Call button.
- Centered mobile menu links.
- Removed old logo from Independent Specialists section.

**Files Modified**
- apps/booking-web/src/components/HeaderLogo.tsx
- apps/booking-web/src/App.tsx
- apps/booking-web/src/pages/HomePage.tsx

**Testing Notes**
- Checked responsiveness at 360px, 768px, 1024px, 1440px.
- Verified navigation, session, and booking flows remain functional.

## [2025-10-27] Footer upgrade, WhatsApp on Home & Contact, required phone on contact form, header logo swap/resize
**Summary**
- Swapped header logo to assets/logo-a1.png; +40% desktop size, mobile unchanged.
- Footer: brand logo, quick links, contact, legal, socials.
- Added WhatsApp to Home and Contact pages.
- Contact form requires Name, Email, Phone, Message; sends to support@a1serviceexpert.com.

**Files Modified**
- apps/booking-web/src/components/HeaderLogo.tsx
- apps/booking-web/src/components/Footer.tsx
- apps/booking-web/src/App.tsx
- apps/booking-web/src/pages/HomePage.tsx
- apps/booking-web/src/pages/ContactPage.tsx

**Testing Notes**
- Verified footer responsiveness (stacked on mobile) and accessible focus states.
- Confirmed WhatsApp opens at wa.me/447394433889.
- Contact form client-side validation: required fields, email format, message length; disabled while sending.

## [2025-10-27] x2 header+mobile logos; Back-to-Top; footer contact CTAs; centered copyright
**Summary**
- Doubled header logo size on desktop and mobile using assets/logo-a1.png; adjusted spacing.
- Harmonised footer logo scale to match header across breakpoints.
- Added Back-to-Top button (shows after scroll, smooth scroll, a11y compliant).
- Converted footer Contact into three CTA buttons: Call, Email, WhatsApp.
- Centered copyright line with LinkedIn credit link.

**Files Modified**
- apps/booking-web/src/components/HeaderLogo.tsx
- apps/booking-web/src/components/Footer.tsx
- apps/booking-web/src/components/BackToTop.tsx
- apps/booking-web/src/App.tsx

**Testing Notes**
- Verified logo sizes at 360, 768, 1024, 1440; no overlap with navbar.
- Back-to-Top appears after ~400px scroll; respects prefers-reduced-motion.
- Footer CTAs keyboard-accessible with visible focus; links correct.

## [2025-10-27] Booking redesign scoping context update
**Summary**
- Documented full booking redesign requirements, clarifications, and phased plan in CONTEXT.md.
- Listed marketing copy sources, outstanding scope, env keys, and revert strategy for new chat context.

**Files Modified**
- CONTEXT.md

**Testing Notes**
- Documentation-only change; no build/test required.

## [2025-10-27] Backend prep: Turnstile + SMTP + pricing-mode scaffolding
**Summary**
- Replaced Google reCAPTCHA with Cloudflare Turnstile (API guards/services/decorator, wired on register/confirm).
- Switched email delivery to Nodemailer SMTP with branded HTML template; logs when SMTP missing.
- Extended Prisma schema for pricing modes (`ServicePricingMode`, `fixedPricePence`, `footnotes`) and captcha toggles; updated seeds.
- Adjusted booking creation to support fixed-price services and optional engine tier on line items.
- Added migration for these schema updates.
- Web UI: integrated new Footer and BackToTop; updated HeaderLogo sizes; added WhatsApp to Home/Contact and improved Contact validation/a11y.

**Files Modified**
- apps/booking-api/prisma/schema.prisma
- apps/booking-api/prisma/migrations/20251027120000_booking_redesign/migration.sql
- apps/booking-api/prisma/seed.ts
- apps/booking-api/src/security/security.module.ts
- apps/booking-api/src/security/turnstile.guard.ts (new)
- apps/booking-api/src/security/turnstile.service.ts (new)
- apps/booking-api/src/security/turnstile.decorator.ts (new)
- apps/booking-api/src/security/recaptcha.guard.ts (removed)
- apps/booking-api/src/security/recaptcha.service.ts (removed)
- apps/booking-api/src/security/recaptcha.decorator.ts (removed)
- apps/booking-api/src/auth/auth.controller.ts
- apps/booking-api/src/bookings/bookings.controller.ts
- apps/booking-api/src/bookings/dto/create-booking.dto.ts
- apps/booking-api/src/bookings/bookings.service.ts
- apps/booking-api/src/catalog/dto/create-service.dto.ts
- apps/booking-api/src/catalog/dto/update-service.dto.ts
- apps/booking-api/src/catalog/catalog.service.ts
- apps/booking-api/src/email/email.service.ts (SMTP template + logging)
- apps/booking-api/package.json (add nodemailer)
- apps/booking-web/src/components/HeaderLogo.tsx
- apps/booking-web/src/components/Footer.tsx (new)
- apps/booking-web/src/components/BackToTop.tsx (new)
- apps/booking-web/src/App.tsx (wire Footer/BackToTop)
- apps/booking-web/src/pages/HomePage.tsx (WhatsApp CTA)
- apps/booking-web/src/pages/ContactPage.tsx (required validation + WhatsApp + honeypot)
- CONTEXT.md (status, plan, env keys)

**Testing Notes**
- API compiles with new Turnstile services; guard used on register and confirm. Until env keys exist, Turnstile verification logs and permits per settings.
- Prisma migration applies in dev; run `pnpm --filter apps/booking-api prisma migrate dev` and `prisma db seed`.
- Nodemailer sends if SMTP vars are set; otherwise logs to server console.
- Web renders updated header/footer/back-to-top; Contact form validates and posts to existing API.

**Revert/Backup**
- Tag created: `pre-booking-redesign`. To hard revert: `git checkout pre-booking-redesign` or `git revert <commit-sha>`.
- To disable new UI only: set `USE_NEW_BOOKING_UI=false` in `apps/booking-web/.env`.

## [2025-10-27] Phase 1 â€“ Turnstile env wiring, admin toggles, env docs
**Summary**
- Updated Admin Settings manager to use `captchaEnabled` + `captchaRequireInDev` controls (replacing reCAPTCHA toggle).
- Refreshed `.env.example` files and README instructions with Cloudflare Turnstile + SMTP settings and the `USE_NEW_BOOKING_UI` feature flag.
- Added TypeScript typings for Nodemailer and ensured booking confirmation emails include vehicle registration/make data required by the new template.

**Files Modified**
- apps/booking-api/.env.example
- apps/booking-api/package.json
- apps/booking-api/prisma/seed.ts
- apps/booking-api/src/bookings/bookings.service.ts
- apps/booking-api/src/email/email.service.ts
- apps/booking-web/.env.example
- apps/booking-web/src/features/admin/SettingsManager.tsx
- README.md
- CONTEXT.md

**Testing Notes**
- `pnpm --filter booking-web build`
- `pnpm --filter booking-api build`
- When running the booking UI locally, keep the API dev server (`pnpm --filter booking-api dev`) running; otherwise `/catalog` requests will fail with `net::ERR_CONNECTION_REFUSED` in the browser console.
- If Nest keeps requiring the old `resend` module, delete `apps/booking-api/dist` or rerun `pnpm --filter booking-api build` to regenerate compiled output with the new SMTP service.
- Updated API `dev` script to `nest start --watch --path dist/apps/booking-api/src/main` so fresh runs work even after cleaning `dist/`.
  - Adjusted API `dev` script to `nest start --watch --entryFile main` after encountering an additional `dist/src/main` lookup during dev runs.

**Revert/Backup**
- Tag: `pre-booking-redesign` (see earlier entry).
- Feature flag fallback: set `USE_NEW_BOOKING_UI=false` in `apps/booking-web/.env`.
## [2025-10-27] API dev watcher fixes
**Summary**
- Updated tsconfig to compile only src/**/*, producing dist/main.js for Nest dev runs.
- Adjusted pnpm --filter booking-api dev script to use 
est start --watch --entryFile main, resolving repeated Cannot find module 'dist/main' errors.

**Files Modified**
- apps/booking-api/package.json
- apps/booking-api/tsconfig.json
- CONTEXT.md

**Testing Notes**
- pnpm --filter booking-api build
- pnpm --filter booking-api dev (verifies watcher boots without missing dist entry)
## [2025-10-27] Shared package CJS attempt (issue persists)
**Summary**
- Set packages/shared/package.json to "type": "commonjs" while investigating the dev crash (ReferenceError: exports is not defined from packages/shared/src/pricing.js).
- Documented the outstanding error in CONTEXT.md for the next session; no code fix applied yet.

**Files Modified**
- packages/shared/package.json
- CONTEXT.md

**Testing Notes**
- pnpm --filter booking-web build
- pnpm --filter booking-api build
- pnpm --filter booking-api dev (still fails with exports is not defined in pricing.js).

## [2025-10-27] Phase 2 start — Service cards + vehicle modal (scaffold)
**Summary**
- Added black ServiceCard grid (SERVICE 1/2/3) behind `USE_NEW_BOOKING_UI` flag with “Price from £X” (en-GB) using `lowestTierPricePence`.
- Added VehicleModal skeleton (yellow VRM input UI, cancel/close, a11y focus/escape) and wired open on Select.
- Legacy ServicesStep left intact; new layout renders only when the feature flag is enabled.

**Files Modified**
- apps/booking-web/src/features/booking/steps/ServicesStep.tsx
- apps/booking-web/src/components/ServiceCard.tsx (new)
- apps/booking-web/src/components/VehicleModal.tsx (new)
- CONTEXT.md

**Testing Notes**
- Web: `pnpm --filter booking-web dev`; ensure `USE_NEW_BOOKING_UI=true` in `apps/booking-web/.env`.
- Confirm service cards render and open the Vehicle modal; legacy flow when flag is false.

## [2025-10-27] Recent implementation summary (docs)
**Summary**
- `@a1/shared` dual-build and import path migrations completed (API/Web).
- Prisma migration quoting fix and dev DB reset path documented.
- Catalog returns `lowestTierPricePence`; web types updated.
- Phase 2 scaffold: ServiceCard grid and VehicleModal skeleton behind feature flag.

**Files Modified**
- CONTEXT.md
- (Previously in this date) multiple code files across API and Web listed in earlier entries

**Testing Notes**
- API: `pnpm --filter booking-api dev`
- Web: `pnpm --filter booking-web dev` with `USE_NEW_BOOKING_UI=true`
- If port 3000 busy: `netstat -ano | findstr :3000` ? `taskkill /PID <pid> /F`

## [2025-10-27] Phase 3 spec lock — Vehicle modal UX + pricing table
**Summary**
- Locked Phase 3 scope per user/Nicolae: DB-driven card prices, pricing table below cards, and full vehicle modal UX (DVLA + manual) with confirmation and “Continue”.
- VRM validation: user-friendly strict GB pattern; uppercase & strip spaces; allow common legacy/personalized and Q-plates.
- Manual entry: VRM, Make, Engine size required; Model optional; includes fuel type capture (does not affect pricing).
- Make/Model suggestions: curated offline lists in repo for autosuggest.

**Files Modified**
- CONTEXT.md (Phase 3 Specification section)

**Testing Notes**
- Web: verify modal flows — DVLA success, DVLA failure ? manual, and manual-only path; all show confirmation and proceed on “Continue”.

## [2025-10-27] Phase 3 in progress — Vehicle modal DVLA/manual + pricing table (part 1)
**Summary**
- Implemented VehicleModal with DVLA lookup (yellow VRM input, Continue to the right on desktop, spinner, manual entry link) and manual entry (VRM/Make/Engine size required; Model optional; fuel type list captured).
- Added confirmation summary (Make/Model/CC/Tier/Price) with primary Continue; updates cart and closes modal.
- Added DB-driven “Fixed Price Menu Servicing” table beneath cards with spacing; reusable component.

**Files Modified**
- apps/booking-web/src/components/VehicleModal.tsx
- apps/booking-web/src/components/PricingTable.tsx (new)
- apps/booking-web/src/features/booking/steps/ServicesStep.tsx
- CONTEXT.md

**Testing Notes**
- Web: `pnpm --filter booking-web dev` with `USE_NEW_BOOKING_UI=true`.
- Select a service ? modal opens ? test DVLA path and manual path; on summary, Continue updates cart and closes.

## [2025-10-27] Phase 3 in progress — Cart Sidebar (desktop)
**Summary**
- Added desktop CartSidebar to the booking flow layout; shows service, VRM and price; Continue navigates to the next step; Start again resets draft.

**Files Modified**
- apps/booking-web/src/components/CartSidebar.tsx (new)
- apps/booking-web/src/features/booking/BookingWizard.tsx

**Testing Notes**
- Web: `pnpm --filter booking-web dev` with `USE_NEW_BOOKING_UI=true`.
- Select a service ? modal confirm Continue ? sidebar shows VRM and price; Continue advances; Start again clears.

## [2025-10-27] Phase 3 in progress — Autosuggest + summary (part 2)
**Summary**
- Added curated offline Make/Model suggestions and wired them to manual entry via datalist; GB VRM validation stays user-friendly strict.
- Added compact summary (service, VRM, price) at the top of the Date/Time step.

**Files Modified**
- apps/booking-web/src/data/vehicle-makes.json (new)
- apps/booking-web/src/data/vehicle-models.json (new)
- apps/booking-web/src/components/VehicleModal.tsx
- apps/booking-web/src/features/booking/steps/DateTimeStep.tsx

**Testing Notes**
- Web: manual entry shows Make/Model suggestions; Date/Time shows compact summary when price is known.

## [2025-10-27] Phase 3 in progress — Mobile cart drawer (part 3)
**Summary**
- Added MobileCartDrawer: sticky bar + slide-up drawer on small screens with booking summary and actions.

**Files Modified**
- apps/booking-web/src/components/MobileCartDrawer.tsx (new)
- apps/booking-web/src/features/booking/BookingWizard.tsx

**Testing Notes**
- Web (mobile): select service ? modal Continue ? sticky bar shows price; tap to open drawer; Continue advances; Start again clears.

## [2025-10-27] Phase 3 — complete: Vehicle modal, pricing table, carts
**Summary**
- Finalized VehicleModal UX: DVLA lookup with spinner ("Searching DVLA…"), strict-but-friendly GB VRM validation, manual fallback (VRM/Make/Engine size required; Model optional; Fuel type captured), confirmation summary with "Change details" + primary "Continue". Continue updates cart and closes the modal.
- Service cards read prices live from DB (lowest tier); pricing table added under cards with spacing and a small A1 logo above the heading.
- Cart Sidebar (desktop) and Mobile Cart Drawer (mobile) wired end-to-end; Date/Time step shows compact summary (service, VRM, price).
- Kept legacy flow intact behind feature flag `USE_NEW_BOOKING_UI`.

**Files Modified**
- apps/booking-web/src/components/VehicleModal.tsx
- apps/booking-web/src/components/PricingTable.tsx
- apps/booking-web/src/components/CartSidebar.tsx
- apps/booking-web/src/components/MobileCartDrawer.tsx
- apps/booking-web/src/features/booking/steps/DateTimeStep.tsx
- apps/booking-web/src/features/booking/steps/ServicesStep.tsx
- apps/booking-web/src/features/booking/BookingWizard.tsx
- CONTEXT.md

**Testing Notes**
- Builds: `pnpm --filter booking-api build`, `pnpm --filter booking-web build` (both passed).
- Web dev: `pnpm --filter booking-web dev` with `USE_NEW_BOOKING_UI=true`; flow: select service ? modal DVLA success and failure paths ? manual entry ? confirmation Continue updates cart ? Date/Time shows summary.
- API dev: `pnpm --filter booking-api dev` runs as a watch server; open a separate terminal for additional commands.

### Issues Encountered & Fixes
- Long-running dev command appears to “block” the shell: it’s expected — Nest watch process holds the terminal. Use a second terminal or run build commands instead.
- Port 3000 in use (EADDRINUSE): free the port: `netstat -ano | findstr :3000` ? `taskkill /PID <pid> /F`.
- Shared package crash (ReferenceError: exports is not defined): converted `@a1/shared` to a proper dual CJS/ESM package with exports map; import via `@a1/shared/pricing`.
- Prisma migration quoting fix: corrected `"Booking"."serviceCode"` cast; dev reset: `pnpm.cmd --filter booking-api exec prisma migrate reset --force`; non-destructive path: `migrate deploy` + `db seed`.

## [2025-10-27] Prompt Baseline (verbatim)
```
Booking UI Redesign, DVLA Modal, Turnstile, Admin wiring, Emails, Backups
0) Scope & invariants

Stack: React + Vite + Tailwind (web), NestJS + Prisma + Postgres + Redis (api), shared package for pricing helpers.

Do not break existing routes, auth, sessions, DVLA integration, holds, or booking confirmation logic.

One service at a time (no MOT in booking UI).

Keep existing time-slot logic; visual restyle only.

Append to docs/CHANGELOG.md in the same format already used (date, brief summary, files modified, testing notes).

Create a git tag and a feature flag so we can revert quickly.

A) Step 1 – Services page redesign (Select service)

Goal: Replace the current tier button rows with three service cards in our site style (dark cards, orange CTAs).

Replace the tier button strips (Small/Medium/Large/XLarge) with a 3-card responsive grid:

Desktop: 3 cards side-by-side; mobile/tablet: stack (you choose breakpoints for best fit).

Cards: SERVICE 1 / SERVICE 2 / SERVICE 3 with the following texts:

SERVICE 1:
OIL AND FILTER — For all services please ensure your vehicle is dropped off between 09:00 am - 10:00 am so that we can have it ready for you by the end of the day. Please note, this is a booking only, card details are not required and payment will only be due after the work has been completed.

SERVICE 2:
INTERIM SERVICE — (same paragraph as above)

SERVICE 3:
FULL SERVICE — (same paragraph as above)

Each card shows “Price from £X” (force en-GB format) where X = lowest tier price from DB for that service.

Primary button: Select (or our standard CTA text).

Keep the heading above the grid unchanged:
1. Choose a service package
Each package is priced with VAT included. Engine size determines the final tier in the next step.

When a card is selected, open the Vehicle modal (section B).

Cart: Right sidebar on desktop, collapsible drawer on mobile:

Shows selected service, vehicle reg, final price, Continue, Start again, and Login link.

Removing the item returns to the service cards state.

The booking page may later scale to more services. When a new service is added in Admin (see G), auto-create the card with its DB name/description + “Price from …”.

B) Vehicle modal (DVLA + Manual fallback)

Goal: After selecting a service, show a modal to find/confirm the vehicle and resolve price by engine size/tier.

Modal style: Centered dialog on desktop; full-screen sheet on mobile. Use subtle Tailwind/Framer Motion animations.

VRM input UI:

Yellow background input (like the screenshot). Placeholder: “Enter your registration”.

Continue button is disabled until the user starts typing; it brightens when enabled.

On submit:

Show spinner + “Searching DVLA…”; disable actions; call existing DVLA lookup (rate-limited).

Display results:

Make: e.g., Ford

Engine size: e.g., 1999 cc

Links: Search again | Enter manually

If DVLA fails (error/limit), show Manual entry panel within the same modal.

Manual entry (required fields):

Vehicle registration, Make, Engine size (cc) — all required.

Use our existing mapping logic to resolve engine tier from engine size.

Price resolution:

Once tier is known, compute final price for the selected service from DB and show it inside the modal.

Buttons: Add to booking (primary), Cancel.

On Add to booking:

Close modal.

Update the cart panel (right sidebar) with service, vehicle reg, and final price.

C) Step order

Select services (this new page)

Booking summary (right cart shows, and we also render a simple summary area above the next step trigger)

Select date & time (restyle only; keep existing logic)

Account / Details / Confirm

At the top of the Date/Time step, show a compact summary: Selected service + vehicle reg + price.

D) Final step – Account, Details, Confirm

Must enforce login/register before final confirmation.

If user logs in, show an inline popup in-place (keep all entered data in memory), then return with a “Welcome back …” notice.

If user does not have an account, show a register block with required fields:

Email address*, Password*, Repeat password*

Your details: Title*, First name*, Surname*, Company name, Mobile number*, Landline number

Address block with lookup:

Box: Search for your address ? Enter your postcode (no external API yet — provide a minimal UX that lets them search their postcode and then fill address manually; keep a hook so we can plug a provider later).

Address 1*, Address 2, Address 3, Town/City*, County, Postcode*

Booking details: Reminders (SMS/Email checkboxes), Notes (textarea), and I accept the terms and privacy policy (link /terms, /privacy) required.

Required fields marked with *. Validate and show inline errors.

Confirm invokes server with Cloudflare Turnstile token (see E).

After success, show a booking confirmation page with the summary (styled like examples), and send an email to the customer (see F).

E) Replace reCAPTCHA with Cloudflare Turnstile

Remove Google reCAPTCHA completely.

Add Turnstile widget only on Final Confirm.

Environment:

apps/booking-web/.env ? VITE_TURNSTILE_SITE_KEY=...

apps/booking-api/.env ? TURNSTILE_SECRET=...

Add a Settings toggle in Admin ? Settings: “Require CAPTCHA in dev” to force-enable locally.

Verification: enforce token verification only on the Confirm booking API. Fail fast with a clear error if invalid/missing.

Prompt me for keys the first time if envs are empty. Validate wiring end-to-end.

F) Emails (Microsoft 365 via GoDaddy)

Use SMTP with envs (add to both .env.example files):

SMTP_HOST=

SMTP_PORT=587

SMTP_SECURE=false (TLS upgrade on 587)

SMTP_USER=support@a1serviceexpert.com

SMTP_PASS=...

MAIL_FROM_NAME="A1 Service Expert"

MAIL_FROM_EMAIL=support@a1serviceexpert.com

Create a new branded email template (logo, orange accents) with:

Booking summary (service, price, vehicle, date/time)

Our address/contact

CTA: View my booking (link to account booking detail page).

In dev without SMTP, log the email to console/files (current project convention).

G) Admin – live wiring & theming

Reflect instantly: Booking UI must read services, tiers, and prices from the API so changes appear without rebuild.

“Price from £X” = lowest tier price for that service.

Final price after vehicle = price for the resolved tier.

Auto panel creation: When a new service is added in Admin ? Catalog:

The booking page auto-renders a new card (grid grows to 4+).

Use service name, description, and computed “Price from”.

Service pricing modes (extend Admin forms & API model minimally):

Tiered pricing (current): small/medium/large/ex-large entries.

Fixed pricing (new option): a single price, applied irrespective of engine size.

Optional footnotes field (markdown/plain) for the service to display in the card or below.

If a service is set to Fixed, ignore engine tier mapping for that service and bypass DVLA in pricing (still allow VRM capture).

Admin UI theme: Restyle Admin to match site (dark/blackish cards, orange CTAs), preserving all existing actions & endpoints.

Re-check all existing actions & endpoints still align with the updated UI behaviors.

H) Fixed Price Menu Servicing table

Render a table below the booking UI:

Heading: “Fixed Price Menu Servicing”

Subhead: “All prices include VAT at 20% and apply to 4 cylinder cars only.”

Columns: Engine size | Service 1 | Service 2 | Service 3

Rows (derive from DB by tier max CCs):

Small Cars up to 1200cc

Medium Cars up to 1600cc

Large Cars up to 2200cc

Extra-Large Cars over 2200cc

If a price is missing, display “—”.

Footnotes under table:

* Up to 5 litres of standard oil included. Certain oil types will incur an additional charge.

* Additional costs for parts only and will not incur any labour charges.

I) Feature flag, backup, and revert plan

Create a feature flag in web (and read on the booking route): USE_NEW_BOOKING_UI=true (default on). If false, render the legacy booking UI.

Create a git tag before changes: pre-booking-redesign.

Provide me clear revert instructions (include them in the CHANGES section of the PR / commit message):

To disable new UI: set USE_NEW_BOOKING_UI=false in web env.

To hard revert code: git checkout pre-booking-redesign or git revert <commit-sha>.

Make the implementation as a single commit with a clear message.

J) Accessibility & polish

Use keyboard navigation for modal; focus trap; aria-labelledby, aria-describedby.

Buttons/tap targets = 44px; visible focus rings; color contrast passes.

Locale/currency: force en-GB.

K) Files likely touched (adapt to actual structure)

Web:

apps/booking-web/src/pages/OnlineBookingPage.tsx (or equivalent)

apps/booking-web/src/components/ServiceCard.tsx (new)

apps/booking-web/src/components/VehicleModal.tsx (new)

apps/booking-web/src/components/CartSidebar.tsx (new)

apps/booking-web/src/components/PricingTable.tsx (new – DB-driven)

apps/booking-web/src/components/Turnstile.tsx (new – wrapper)

Feature flag wiring & env read

API:

Confirm endpoint: add Turnstile verification (new service + config)

Admin service model: pricing mode (tiered|fixed), footnotes (optional)

Catalog/Prices endpoints: ensure web can fetch lowest tier price and tiered/fixed final price

L) Run & verify (local)
# from repo root
pnpm install

# API
pnpm --filter apps/booking-api dev

# Web
pnpm --filter apps/booking-web dev
# or Docker
docker compose up --build


Set envs:

apps/booking-web/.env: VITE_TURNSTILE_SITE_KEY=..., USE_NEW_BOOKING_UI=true

apps/booking-api/.env: TURNSTILE_SECRET=..., SMTP vars (see section F)

In Admin ? Settings, use “Require CAPTCHA in dev” to force-enable locally if desired.

Verify: cards ? VRM modal (DVLA + manual) ? final price ? cart ? date/time ? account/details ? Turnstile ? confirm ? email received ? account booking visible.

Pricing changes in Admin instantly reflect in cards (no rebuild).

M) Changelog

Append a new entry to docs/CHANGELOG.md in the same format already used (date, brief summary, files modified, testing notes).

N) Commit

Single commit message suggestion:

feat(booking): redesign service selection + DVLA modal + Turnstile; DB-driven pricing table; admin wiring; feature flag & backup tag


Also: please output a short note with the exact .env keys you expect me to fill for Turnstile and SMTP so I can paste them right away.
```
.Replace('# A1 Service Expert — Change Log
','')

## [2025-10-28] Planning notes - confirm step & account overhaul (Codex)
**Summary**
- Captured the latest user requirements for the confirm-booking step, account/profile experience, Turnstile integration, and notification emails before making code changes.
- Outlined a sequence of sub-deliverables covering backend schema updates, frontend redesigns, and QA tasks so future sessions can execute incrementally.

**Files Affected**
- CONTEXT.md (documentation only)
- docs/CHANGELOG.md (this note)

**Testing Notes**
- No code changes in this session; tests not run.



## [2025-10-29] Pricing regression test update (Codex)
**Summary**
- Updated the pricing regression test data to send structured customer profile fields in line with the new booking DTO shape.
- Prisma migrations could not be applied locally (`P1002` advisory lock at `localhost:5433`), leaving the database without the new `User` columns.

**Files Modified**
- apps/booking-api/src/__tests__/pricing-regression.spec.ts

**Testing Notes**
- pnpm.cmd --filter booking-api test -- --config jest.config.ts *(fails: database schema missing new columns because Prisma migrate is blocked by advisory lock `P1002`).*

## [2025-10-29] Prisma lock recovery & tests (Codex)
**Summary**
- Terminated stale Postgres sessions holding the Prisma advisory lock, then ran `npx prisma migrate deploy` to sync the database with the new profile/session schema.
- End-to-end booking API tests now pass against the updated schema.

**Files Modified**
- (documentation only)

**Testing Notes**
- pnpm.cmd --filter booking-api test -- --config jest.config.ts

## [2025-10-29] Deliverable 2 readiness check (Codex)
**Summary**
- Audited the Turnstile + email updates and confirmed they satisfy the remaining requirements for Deliverable 2; no code changes made in this pass.

**Files Modified**
- (documentation only)

**Testing Notes**
- pnpm.cmd --filter booking-api test -- --config jest.config.ts

## [2025-10-29] Confirm step rebuild plan (Codex)
**Summary**
- Documented the implementation outline for Deliverable 3 (confirm-step UX rebuild) so the next session can execute against defined batches; no code committed yet.

**Files Modified**
- (documentation only)

**Testing Notes**
- pnpm.cmd --filter booking-api test -- --config jest.config.ts
## [2025-10-29] Confirm step UX rebuild (Codex)
**Summary**
- Rebuilt the confirm-booking step with the dark summary card, inline login/register cards, full profile capture, and updated CTA behaviour to match the redesign brief.
- Added support for on-the-spot account creation, profile syncing, and Turnstile validation prior to confirmation.

**Files Modified**
- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx

**Testing Notes**
- pnpm.cmd --filter booking-web build
## [2025-10-29] Confirm step rebuild attempt (rolled back) (Codex)
**Summary**
- Began reworking the confirm-booking step but reverted the changes after hitting CLI authoring issues that introduced JSX syntax errors.

**Files Modified**
- (documentation only)

**Testing Notes**
- Not run after revert
## [2025-10-29] Confirm step rebuild (Codex)
**Summary**
- Delivered the redesigned confirm booking step with the new summary card, inline account login/registration, full profile form, Turnstile checks, and success hand-off with invoice/quote links plus a "Book another visit" CTA.
- Versioned the booking wizard draft store to migrate legacy localStorage payloads, syncing account/profile edits as users type so the richer dataset persists between sessions.
**Files Modified**
- apps/booking-web/src/features/booking/state.tsx
- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx
- apps/booking-web/src/features/booking/types.ts
- apps/booking-web/src/features/booking/SuccessPage.tsx
**Testing Notes**
- pnpm.cmd --filter booking-web build
## [2025-10-29] Email delivery QA blocker (Codex)
**Summary**
- Email confirmation QA deferred until Microsoft 365 (GoDaddy) mailbox credentials are available; current `.env` already targets `smtp.office365.com:587` with STARTTLS and the support mailbox.
- Documented next steps for ops: supply the live password/app password, trigger a booking confirmation, and validate customer/staff emails plus invoice/quote links once access is granted.
**Files Modified**
- (documentation only)
**Testing Notes**
- Not run (awaiting SMTP credentials)
## [2025-10-29] Draft migration verification (Codex)
**Summary**
- Exported the booking draft normalisation helpers and introduced `scripts/checkDraftMigration.ts` so we can validate legacy localStorage payloads in isolation.
- `pnpm.cmd dlx tsx apps/booking-web/scripts/checkDraftMigration.ts` confirms legacy drafts upgrade correctly to the new schema (names split, notes preserved, booking notes fallback) while current-format drafts remain unchanged.
**Files Modified**
- apps/booking-web/src/features/booking/state.tsx
- apps/booking-web/scripts/checkDraftMigration.ts
**Testing Notes**
- pnpm.cmd dlx tsx apps/booking-web/scripts/checkDraftMigration.ts
## [2025-10-29] Confirm-step QA plan (Codex)
**Summary**
- Recorded the manual test matrix for the new confirm experience: guest booking flow with inline registration, authenticated confirmation with profile sync, and hold-expiry validation.
- Documented prerequisites (API + web dev servers, seeded data, Turnstile bypass toggle) so QA can run through the flows once interactive access is available.
**Files Modified**
- (documentation only)
**Testing Notes**
- Pending manual execution
## [2025-10-29] Header profile menu & routing tidy (Codex)
**Summary**
- Introduced the authenticated profile dropdown in `App.tsx`, surfacing account/admin/dev links while keeping Dev Tools hidden from non-admins and providing login/register buttons for guests.
- Added mobile-friendly account actions and menu-dismiss logic (click-away, escape) to keep the header responsive.
**Files Modified**
- apps/booking-web/src/App.tsx
**Testing Notes**
- pnpm.cmd --filter booking-web build
## [2025-10-29] Account area refresh (Codex)
**Summary**
- Revamped `AccountPage` with the new profile/booking layout: inline profile editing hooked to `/account/profile`, change-password form calling `/account/change-password`, refreshed verification messaging, and a richer booking history list with document chips and detail stubs.
- Admin users are redirected to the admin dashboard automatically when navigating to `/account`.
**Files Modified**
- apps/booking-web/src/pages/AccountPage.tsx
**Testing Notes**
- pnpm.cmd --filter booking-web build
## [2025-10-29] Booking detail view (Codex)
**Summary**
- Backend: added `GET /bookings/:id` with ownership checks and enriched response (customer, vehicle, services, documents, totals).
- Frontend: created `BookingDetailPage` (`/account/bookings/:bookingId`) and linked it from the account history; detail view shows totals, service breakdown, vehicle/contact info, and document download state.
**Files Modified**
- apps/booking-api/src/bookings/bookings.controller.ts
- apps/booking-api/src/bookings/bookings.service.ts
- apps/booking-web/src/routes.tsx
- apps/booking-web/src/pages/AccountPage.tsx
- apps/booking-web/src/pages/BookingDetailPage.tsx
**Testing Notes**
- pnpm.cmd --filter booking-api build
- pnpm.cmd --filter booking-web build
