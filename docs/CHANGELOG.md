# A1 Service Expert - Change Log

## [2025-10-30] Footer dark theme + Cookie Policy (Codex)
**Summary**
- Restyled the footer to a dark theme (slate backgrounds, white headings) and ensured the logo remains clearly visible.
- Added a "Cookie Policy" link in the footer and created a new Cookie Policy page with clear sections and an example cookie table.
- Registered the `/cookie-policy` route in the web app.

**Files Modified**
- apps/booking-web/src/components/Footer.tsx
- apps/booking-web/src/pages/CookiePolicyPage.tsx (new)
- apps/booking-web/src/routes.tsx

**Testing Notes**
- Navigate to `/cookie-policy` to verify content.
- Confirm footer uses the dark scheme and the Cookie Policy link works on desktop and mobile.

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

# A1 Service Expert - Change Log

## [2025-10-29] Confirm step revamp (single Turnstile, dark cards, login modal)
**Summary**
- Rebuilt the confirm step into dark cards with a single Turnstile widget in "Final checks". Account section now shows Email/Password/Repeat only (no inline CAPTCHA, no mode toggle) and a login modal for existing users.
- Guest flow uses a single Turnstile token to register, login, create the booking, and confirm. Logged-in users still require Turnstile on confirm. On success, redirect to `/account`.
- Your details remain fully editable regardless of auth; added notes, marketing opt-in, and a terms checkbox. Inputs are dark-themed with readable errors.
- Cart sidebar is hidden on the confirm step only. Turnstile widget is stable (no flicker) via ref-held callback; no re-mounts on parent updates.

**Files Modified**
- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx

**Notes**
- `TurnstileWidget` already used a ref-stabilised callback and explicit loader; no code changes required.
- `BookingWizard` already hid `CartSidebar` for `details-confirm`.

**Testing Notes**
- Web: `pnpm.cmd --filter booking-web dev` and verify:
  - Single Turnstile widget in Final checks only.
  - Guest: Confirm registers + logs in + creates + confirms with one token; redirects to `/account`.
  - Logged-in: Confirm requires Turnstile; optional profile PATCH; redirects to `/account`.
  - Dark inputs and error text are readable; no Turnstile flicker.

## [2025-10-29] Confirm step validation fixes
**Summary**
- Made `County` optional in the Your details schema and UI label. Confirm button now enables when only required fields are valid plus Turnstile and hold are active.
- Relaxed `bookingReady` to not require an engine tier (supports fixed-price services) � relies on `pricePence` presence instead.
- Treated empty optional fields as undefined in validation (landline number, address lines, notes) so empty values don�t block validity.
- Added a non-intrusive disabled reason on the Confirm button (`title` attribute) and a schema-based validity fallback to avoid RHF `isValid` edge cases.
- Prevented unintended form resets for guests while typing (removed `draft` from dependencies), so `confirmPassword` no longer mirrors `password` on input.
- Made `landlineNumber` fully optional (no min length) to match copy.
- Live mismatch validation for passwords: when either password field changes, the repeat password field re-validates so users see the mismatch error immediately.
- Submission now validates details via Zod directly (and mirrors any issues back into RHF) to avoid native focus jumps to optional fields.
- Made `marketingOptIn` optional in validation to ensure optional fields are never required.
 - Suppressed noisy profile fetch toast when API base URL isn't configured or endpoint is unavailable; treat as guest.

**Files Modified**
- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx

**Testing Notes**
- With a fixed-price service or when engine tier is unset, Confirm becomes available once: service selected, price present, vehicle/date/time/hold set, required personal fields valid, and Turnstile solved.

## [2025-10-28] Confirm booking step rebuild (in progress)
**Summary**
- Reimplemented the booking wizard�s final step with the new �Confirm booking� layout, numbered sections, and inline login/register workflow that keeps users inside the flow.
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
- Replaced the legacy Vehicle wizard step with an inline �Booking summary� route, updated navigation copy, and surfaced a persistent Login control above the stepper.
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
# A1 Service Expert – Change Log

## [2025-10-27] Prisma migration casing fix
**Summary**
- Updated `20251027120000_booking_redesign` migration to cast `"Booking"."serviceCode"` with the correct quoted casing so resets/migrate deploy succeed on fresh databases.
- Documented the required Prisma reset command in CONTEXT.md for developers pulling Phase 1 locally.

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
- Documentation only (this file) — operational notes; code changes already captured in earlier entries.

**Testing Notes**
- Free occupied port: `netstat -ano | findstr :3000` → `taskkill /PID <pid> /F`.
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

## [2025-10-27] Phase 1 – Turnstile env wiring, admin toggles, env docs
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

## [2025-10-27] Phase 2 start � Service cards + vehicle modal (scaffold)
**Summary**
- Added black ServiceCard grid (SERVICE 1/2/3) behind `USE_NEW_BOOKING_UI` flag with �Price from �X� (en-GB) using `lowestTierPricePence`.
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

## [2025-10-27] Phase 3 spec lock � Vehicle modal UX + pricing table
**Summary**
- Locked Phase 3 scope per user/Nicolae: DB-driven card prices, pricing table below cards, and full vehicle modal UX (DVLA + manual) with confirmation and �Continue�.
- VRM validation: user-friendly strict GB pattern; uppercase & strip spaces; allow common legacy/personalized and Q-plates.
- Manual entry: VRM, Make, Engine size required; Model optional; includes fuel type capture (does not affect pricing).
- Make/Model suggestions: curated offline lists in repo for autosuggest.

**Files Modified**
- CONTEXT.md (Phase 3 Specification section)

**Testing Notes**
- Web: verify modal flows � DVLA success, DVLA failure ? manual, and manual-only path; all show confirmation and proceed on �Continue�.

## [2025-10-27] Phase 3 in progress � Vehicle modal DVLA/manual + pricing table (part 1)
**Summary**
- Implemented VehicleModal with DVLA lookup (yellow VRM input, Continue to the right on desktop, spinner, manual entry link) and manual entry (VRM/Make/Engine size required; Model optional; fuel type list captured).
- Added confirmation summary (Make/Model/CC/Tier/Price) with primary Continue; updates cart and closes modal.
- Added DB-driven �Fixed Price Menu Servicing� table beneath cards with spacing; reusable component.

**Files Modified**
- apps/booking-web/src/components/VehicleModal.tsx
- apps/booking-web/src/components/PricingTable.tsx (new)
- apps/booking-web/src/features/booking/steps/ServicesStep.tsx
- CONTEXT.md

**Testing Notes**
- Web: `pnpm --filter booking-web dev` with `USE_NEW_BOOKING_UI=true`.
- Select a service ? modal opens ? test DVLA path and manual path; on summary, Continue updates cart and closes.

## [2025-10-27] Phase 3 in progress � Cart Sidebar (desktop)
**Summary**
- Added desktop CartSidebar to the booking flow layout; shows service, VRM and price; Continue navigates to the next step; Start again resets draft.

**Files Modified**
- apps/booking-web/src/components/CartSidebar.tsx (new)
- apps/booking-web/src/features/booking/BookingWizard.tsx

**Testing Notes**
- Web: `pnpm --filter booking-web dev` with `USE_NEW_BOOKING_UI=true`.
- Select a service ? modal confirm Continue ? sidebar shows VRM and price; Continue advances; Start again clears.

## [2025-10-27] Phase 3 in progress � Autosuggest + summary (part 2)
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

## [2025-10-27] Phase 3 in progress � Mobile cart drawer (part 3)
**Summary**
- Added MobileCartDrawer: sticky bar + slide-up drawer on small screens with booking summary and actions.

**Files Modified**
- apps/booking-web/src/components/MobileCartDrawer.tsx (new)
- apps/booking-web/src/features/booking/BookingWizard.tsx

**Testing Notes**
- Web (mobile): select service ? modal Continue ? sticky bar shows price; tap to open drawer; Continue advances; Start again clears.

## [2025-10-27] Phase 3 � complete: Vehicle modal, pricing table, carts
**Summary**
- Finalized VehicleModal UX: DVLA lookup with spinner ("Searching DVLA�"), strict-but-friendly GB VRM validation, manual fallback (VRM/Make/Engine size required; Model optional; Fuel type captured), confirmation summary with "Change details" + primary "Continue". Continue updates cart and closes the modal.
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
- Long-running dev command appears to �block� the shell: it�s expected � Nest watch process holds the terminal. Use a second terminal or run build commands instead.
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

A) Step 1 � Services page redesign (Select service)

Goal: Replace the current tier button rows with three service cards in our site style (dark cards, orange CTAs).

Replace the tier button strips (Small/Medium/Large/XLarge) with a 3-card responsive grid:

Desktop: 3 cards side-by-side; mobile/tablet: stack (you choose breakpoints for best fit).

Cards: SERVICE 1 / SERVICE 2 / SERVICE 3 with the following texts:

SERVICE 1:
OIL AND FILTER � For all services please ensure your vehicle is dropped off between 09:00 am - 10:00 am so that we can have it ready for you by the end of the day. Please note, this is a booking only, card details are not required and payment will only be due after the work has been completed.

SERVICE 2:
INTERIM SERVICE � (same paragraph as above)

SERVICE 3:
FULL SERVICE � (same paragraph as above)

Each card shows �Price from �X� (force en-GB format) where X = lowest tier price from DB for that service.

Primary button: Select (or our standard CTA text).

Keep the heading above the grid unchanged:
1. Choose a service package
Each package is priced with VAT included. Engine size determines the final tier in the next step.

When a card is selected, open the Vehicle modal (section B).

Cart: Right sidebar on desktop, collapsible drawer on mobile:

Shows selected service, vehicle reg, final price, Continue, Start again, and Login link.

Removing the item returns to the service cards state.

The booking page may later scale to more services. When a new service is added in Admin (see G), auto-create the card with its DB name/description + �Price from ��.

B) Vehicle modal (DVLA + Manual fallback)

Goal: After selecting a service, show a modal to find/confirm the vehicle and resolve price by engine size/tier.

Modal style: Centered dialog on desktop; full-screen sheet on mobile. Use subtle Tailwind/Framer Motion animations.

VRM input UI:

Yellow background input (like the screenshot). Placeholder: �Enter your registration�.

Continue button is disabled until the user starts typing; it brightens when enabled.

On submit:

Show spinner + �Searching DVLA��; disable actions; call existing DVLA lookup (rate-limited).

Display results:

Make: e.g., Ford

Engine size: e.g., 1999 cc

Links: Search again | Enter manually

If DVLA fails (error/limit), show Manual entry panel within the same modal.

Manual entry (required fields):

Vehicle registration, Make, Engine size (cc) � all required.

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

D) Final step � Account, Details, Confirm

Must enforce login/register before final confirmation.

If user logs in, show an inline popup in-place (keep all entered data in memory), then return with a �Welcome back �� notice.

If user does not have an account, show a register block with required fields:

Email address*, Password*, Repeat password*

Your details: Title*, First name*, Surname*, Company name, Mobile number*, Landline number

Address block with lookup:

Box: Search for your address ? Enter your postcode (no external API yet � provide a minimal UX that lets them search their postcode and then fill address manually; keep a hook so we can plug a provider later).

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

Add a Settings toggle in Admin ? Settings: �Require CAPTCHA in dev� to force-enable locally.

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

G) Admin � live wiring & theming

Reflect instantly: Booking UI must read services, tiers, and prices from the API so changes appear without rebuild.

�Price from �X� = lowest tier price for that service.

Final price after vehicle = price for the resolved tier.

Auto panel creation: When a new service is added in Admin ? Catalog:

The booking page auto-renders a new card (grid grows to 4+).

Use service name, description, and computed �Price from�.

Service pricing modes (extend Admin forms & API model minimally):

Tiered pricing (current): small/medium/large/ex-large entries.

Fixed pricing (new option): a single price, applied irrespective of engine size.

Optional footnotes field (markdown/plain) for the service to display in the card or below.

If a service is set to Fixed, ignore engine tier mapping for that service and bypass DVLA in pricing (still allow VRM capture).

Admin UI theme: Restyle Admin to match site (dark/blackish cards, orange CTAs), preserving all existing actions & endpoints.

Re-check all existing actions & endpoints still align with the updated UI behaviors.

H) Fixed Price Menu Servicing table

Render a table below the booking UI:

Heading: �Fixed Price Menu Servicing�

Subhead: �All prices include VAT at 20% and apply to 4 cylinder cars only.�

Columns: Engine size | Service 1 | Service 2 | Service 3

Rows (derive from DB by tier max CCs):

Small Cars up to 1200cc

Medium Cars up to 1600cc

Large Cars up to 2200cc

Extra-Large Cars over 2200cc

If a price is missing, display ���.

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

apps/booking-web/src/components/PricingTable.tsx (new � DB-driven)

apps/booking-web/src/components/Turnstile.tsx (new � wrapper)

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

In Admin ? Settings, use �Require CAPTCHA in dev� to force-enable locally if desired.

Verify: cards ? VRM modal (DVLA + manual) ? final price ? cart ? date/time ? account/details ? Turnstile ? confirm ? email received ? account booking visible.

Pricing changes in Admin instantly reflect in cards (no rebuild).

M) Changelog

Append a new entry to docs/CHANGELOG.md in the same format already used (date, brief summary, files modified, testing notes).

N) Commit

Single commit message suggestion:

feat(booking): redesign service selection + DVLA modal + Turnstile; DB-driven pricing table; admin wiring; feature flag & backup tag


Also: please output a short note with the exact .env keys you expect me to fill for Turnstile and SMTP so I can paste them right away.
```
.Replace('# A1 Service Expert � Change Log
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
## [2025-10-29] Services step dark cards + selection pill
**Summary**
- Restyled Services step to match the dark cards from the Confirm step. Cards show title, description, and �Price from� computed from `/catalog` (`lowestTierPricePence`). Disabled services render as Not available.
- Added selection pill with a tick. A service becomes Selected after the Vehicle modal completes (VRM/Manual) and can be deselected to clear the cart state.
- Vehicle modal (manual entry) now has a Back button to return to the VRM lookup; summary view Back also returns to VRM.
- Fixed Price table in Services step uses a dark panel variant and pulls values from `/catalog` to ensure DB/admin parity.

**Files Modified**
- apps/booking-web/src/components/ServiceCard.tsx
- apps/booking-web/src/features/booking/steps/ServicesStep.tsx
- apps/booking-web/src/components/PricingTable.tsx
- apps/booking-web/src/components/VehicleModal.tsx

**Notes**
- For price discrepancies (e.g., Service 1 small �79.95 vs �91.06), update DB/service prices via Admin Catalog (or provide the pence values to seed). Cards will reflect the new prices automatically from `/catalog`.

## [2025-10-29] Cart price recompute, VRM fixes, admin pricing helper
**Summary**
- Cart total now updates immediately when switching between services after the vehicle has been selected. The Vehicle modal recomputes the exact price for the current `serviceId` using `/vehicles/recommend-tier` and updates draft `pricePence`, `engineTierCode`, and `engineTierName` before closing.
- Added a subtle pulse animation to the cart panel when the price changes.
- Removed stray literal `\n\n` text under the service cards/table by normalising newline artifacts in the Services step file.
- VRM modal fixes: "Search again" clears the DVLA result and the VRM field; only one operational Continue button remains.
- Admin web helper: a new "Apply fixed menu prices" button under Admin ? Catalog ? Service prices upserts all tier prices to the fixed inc-VAT values. A backend Prisma script is also provided.

**Files Modified**
- apps/booking-web/src/components/VehicleModal.tsx
- apps/booking-web/src/components/CartSidebar.tsx
- apps/booking-web/src/features/booking/steps/ServicesStep.tsx
- apps/booking-web/src/features/admin/CatalogManager.tsx
- apps/booking-api/scripts/upsert-fixed-prices.ts (new)

**Fixed Menu (inc-VAT) applied**
- Service 1: 79.95, 89.95, 99.95, 109.95
- Service 2: 119.95, 129.95, 139.95, 159.95
- Service 3: 179.95, 179.95, 199.95, 219.95

**Usage**
- Admin UI: Click "Apply fixed menu prices" and refresh Services; "Price from" updates.
- Script: `pnpm --filter booking-api ts-node scripts/upsert-fixed-prices.ts`

## [2025-10-29] Booking summary card (PriceStep) dark theme redesign
**Summary**
- Restyled the booking summary card on step 2 (PriceStep) to match the dark card aesthetic used across the booking wizard (ServicesStep and DetailsConfirmStep).
- Updated card styling: dark rounded corners (`rounded-3xl`), slate-900 background, slate-700 borders, and shadow-inner effect for consistency.
- Adjusted color scheme: icon background changed to orange-500, headings to white, body text to slate-300, labels to slate-400, and price/totals to orange-400.
- Updated vehicle details grid to use the matching `bg-slate-800/60` background pattern.
- Removed the Continue button from the card as it's redundant with the cart sidebar/drawer Continue button; retained only the Back button.
- Cleaned up unused imports and functions (toast, markStepComplete, handleContinue, canContinue).

**Files Modified**
- apps/booking-web/src/features/booking/steps/PriceStep.tsx

**Testing Notes**
- Verify the booking summary card displays with dark theme on step 2 of the booking wizard
- Confirm the Continue button is removed from the card and navigation works via the cart sidebar
- Test Back button functionality to return to services selection

## [2025-10-29] Date/Time step dark theme redesign and cart validation
**Summary**
- Restyled the Date & Time step (step 3) to match the dark card aesthetic used across the booking wizard.
- Wrapped the date/time interface in a dark card with rounded-3xl corners, slate-900 background, slate-700 borders, and shadow-inner effect.
- Updated booking summary banner to use rounded-2xl bg-slate-800/60 with consistent dark theme colors: labels (slate-400), values (white), price (orange-400).
- Restyled calendar navigation: Previous/Next buttons with slate-600 borders and orange-500 hover states, month heading in white.
- Redesigned calendar grid: day labels in slate-300, date cells with slate-800 backgrounds, selected dates with orange-500 background and black bold text, disabled/past dates in slate-700 with muted slate-500 text.
- Restyled time slot buttons: slate-800 backgrounds with slate-600 borders, selected slots with orange-500 background and black text, hover states with orange-400 border.
- Updated all error messages to use red-300 for improved contrast on dark backgrounds.
- Removed the "Continue to Details" button from the date-time card, keeping only the Back button to match other redesigned steps.
- Enhanced cart validation logic: the Continue button in both CartSidebar (desktop) and MobileCartDrawer (mobile) is now disabled on the date-time step until both a date and time slot are selected, preventing users from proceeding with incomplete booking details.
- Cleaned up unused code: removed markStepComplete, handleNext, and canContinue from DateTimeStep; reordered imports.

**Files Modified**
- apps/booking-web/src/features/booking/steps/DateTimeStep.tsx
- apps/booking-web/src/components/CartSidebar.tsx
- apps/booking-web/src/components/MobileCartDrawer.tsx

**Testing Notes**
- Verify dark theme styling is consistent across the entire date/time step
- Test calendar interactions: month navigation (Previous/Next), date selection (highlight and selection states), disabled/weekend dates cannot be clicked
- Confirm time slot selection: clicking a slot highlights it, clicking again does not deselect
- Verify cart Continue button behavior:
  - On date-time step: disabled until both date and time are selected
  - On other steps (services, pricing): enabled when service and vehicle are selected
- Test mobile drawer: same validation logic as desktop sidebar
- Confirm Back button navigates to the booking summary (pricing) step
- Verify hold creation and error handling still works correctly when selecting time slots

## [2025-10-29] Authentication and login state consistency fix
**Summary**
- Fixed authentication session/login state detection issues where users with valid auth tokens were not being recognized as logged in throughout the application.
- Updated App.tsx to use the same `/account/profile` API endpoint as DetailsConfirmStep for consistency (previously used `/auth/me`), ensuring both components fetch user data from a unified source.
- Replaced the minimal `CurrentUser` interface with the complete `PublicUser` interface to match the full API response structure from the backend, including profile fields like firstName, lastName, address details, and preferences.
- Implemented automatic token cleanup: invalid or expired JWT tokens are now automatically detected and cleared from localStorage when the API returns unauthorized errors, improving session security.
- Enhanced user display logic in the header profile menu:
  - Profile button now shows "FirstName LastName" when profile data is available (e.g., "John Smith")
  - Gracefully falls back to displaying the email address if profile name fields are not populated
  - User avatar initial prioritizes first name initial, then last name initial, then email initial
- Added comprehensive error handling in the user profile loading flow to prevent silent failures and improve debugging.
- Improved type safety by aligning frontend TypeScript types with backend API response structures.

**Backend Context**
- Both `/auth/me` and `/account/profile` endpoints return the same `PublicUser` structure containing: id, email, role, firstName, lastName, companyName, address fields, phone numbers, marketing preferences, and timestamps.
- Both endpoints are protected by `JwtAuthGuard` and require a valid JWT token in the Authorization header.
- The standardization on `/account/profile` ensures consistency across the booking wizard flow and main application navigation.

**Files Modified**
- apps/booking-web/src/App.tsx

**Technical Changes**
- Lines 10-33: Replaced `CurrentUser` interface with full `PublicUser` interface matching backend auth.responses.ts
- Line 55: Updated user state type from `CurrentUser | null` to `PublicUser | null`
- Line 80: Changed API endpoint from `/auth/me` to `/account/profile` for consistency with DetailsConfirmStep
- Lines 84-93: Added error handling to detect "unauthorized" or "invalid token" errors and automatically clear invalid tokens
- Lines 162-165: Added `userDisplayName` computation logic to show full name when available, falling back to email
- Line 282: Updated profile menu button to display `userDisplayName` instead of raw email

**User Experience Improvements**
- Login button in the header now correctly recognizes logged-in users and displays their profile menu
- Profile menu shows friendly display names (FirstName LastName) instead of just email addresses
- Expired sessions are automatically cleared without requiring manual logout
- Consistent user experience between the main app and booking wizard confirm step

**Testing Notes**
- Verify that the login button in the header correctly recognizes logged-in users and shows the profile menu button
- Confirm that the profile menu button displays the user's full name (FirstName LastName) when profile data is available
- Test fallback behavior: if user has no firstName/lastName, email should be displayed instead
- Verify that clicking the profile menu shows a dropdown with the correct email address and account links
- Test automatic token cleanup: use browser DevTools to corrupt the authToken in localStorage and verify it gets cleared on next page load
- On the confirm booking step (DetailsConfirmStep), verify the "Account information" section correctly shows "Signed in" with the user's email when logged in
- Test the "Click here to login" link opens the login modal correctly for guest users
- Confirm that both desktop and mobile header views display user information consistently
- Verify that signing out via the profile menu properly clears the session and returns to the login/register buttons
- Test navigation flows: logging in from the booking wizard should maintain wizard progress while updating the header state

## [2025-10-29] Booking confirmation validation alignment
**Summary**
- Removed the unused `/account/profile` PATCH call from the confirm step; the booking confirmation flow now relies on the booking payload for customer updates.
- Marked `customer.county` as optional in `CreateBookingDto` and adjusted downstream sanitation so empty (optional) values are accepted without runtime errors.
- Tidied the confirm step module by dropping the obsolete `apiPatch` import.

**Files Modified**
- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx
- apps/booking-api/src/bookings/dto/create-booking.dto.ts
- apps/booking-api/src/bookings/bookings.service.ts

**Testing Notes**
- Start the booking wizard as both a guest and a logged-in user; leave the County field blank and confirm the booking to verify the API no longer returns `Validation failed`.
- Repeat the flow with County populated to confirm the value is still persisted in the booking and related emails.
- Confirm the confirm step builds without TypeScript warnings (no unused imports) and still redirects to `/account` with the success payload.

## [2025-10-29] Validation diagnostics improvements
**Summary**
- Upgraded the NestJS global `ValidationPipe` error formatter to recursively flatten nested validation errors, returning dot-notated field paths for clarity.
- API consumers now receive actionable error messages for nested DTO properties (e.g. `customer.postcode`) instead of empty error arrays.
- API client now surfaces the first detailed validation message in thrown errors to improve user-facing toasts.

**Files Modified**
- apps/booking-api/src/main.ts
- apps/booking-web/src/lib/api.ts

**Testing Notes**
- Reproduce a validation error (for example, omit the terms checkbox on confirm) and ensure the response payload lists the failing nested field in the `errors` array.
- Confirm the booking wizard toast displays the field-specific detail returned by the API.

## [2025-10-29] Booking payload compatibility
**Summary**
- Added legacy-compatible `name`, `phone`, and `notes` fields to the confirm-step customer payload so older API builds can still validate bookings while newer deployments rely on the expanded schema.

**Files Modified**
- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx

**Testing Notes**
- Confirm the booking flow succeeds whether the API expects `customer.name`/`customer.phone` or the new first/last name fields.
## [2025-10-29] Booking build fix
**Summary**
- Reintroduced the missing `apiPatch` import in the confirm step to unblock the booking web build while keeping the confirm call intact.

**Files Modified**
- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx

**Testing Notes**
- `pnpm --filter booking-web build` now completes successfully.

## [2025-10-29] Nest dev entry alignment
**Summary**
- Pointed the booking-api `dev` and `start` scripts to the compiled `dist/apps/booking-api/src/main.js` bundle so the Nest watch runner no longer throws "Cannot find module dist/main".

**Files Modified**
- apps/booking-api/package.json

**Testing Notes**
- `pnpm --filter booking-api dev` now starts the API without module resolution errors.
- Production `pnpm --filter booking-api start` also executes the correct bundle.
## [2025-10-30] Booking confirmation hardening
**Summary**
- Wrapped the email dispatch during booking confirmation in a try/catch so SMTP misconfiguration or connection failures no longer surface as 500 errors.

**Files Modified**
- apps/booking-api/src/bookings/bookings.service.ts

**Testing Notes**
- Confirming a booking should succeed even when the email service cannot send; check API logs for the warning.
## [2025-10-30] Temp files cleanup and ignore rule
**Summary**
- Removed temporary scratch files (`temp_*.txt`) that were used during debugging.
- Added a `.gitignore` rule to prevent future `temp_*.txt` files from being tracked.

**Files Modified**
- .gitignore

**Files Removed**
- temp_firstline.txt, temp_full.txt, temp_full2.txt, temp_head.txt, temp_mid.txt, temp_services.txt, temp_slice.txt, temp_tail.txt, temp_ui.txt, temp_view.txt, temp_vm.txt

## [2025-10-30] Logo swap and booking stepper redesign
**Summary**
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

**Files Modified**
- apps/booking-web/src/components/HeaderLogo.tsx
- apps/booking-web/src/components/Footer.tsx
- apps/booking-web/src/features/booking/BookingWizard.tsx

**Testing Notes**
- Verify new logo displays correctly in header (desktop h-40, mobile h-16) and footer (h-32 to h-40 across breakpoints)
- Confirm stepper appears as horizontal text navigation on desktop with proper color states (orange for current, green for completed, slate for upcoming)
- Test stepper navigation: clicking completed or current steps should navigate backward through the wizard
- Verify stepper is completely hidden on mobile screens (below md breakpoint)
- Check "Online Booking" header matches dark card theme with good contrast on both desktop and mobile
- Ensure Login button styling aligns with dark theme and has proper hover states

## [2025-10-30] Stepper navigation improvements and mobile scroll behavior
**Summary**
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

**Files Modified**
- apps/booking-web/src/features/booking/types.ts
- apps/booking-web/src/features/booking/state.tsx
- apps/booking-web/src/features/booking/BookingWizard.tsx
- apps/booking-web/src/components/MobileCartDrawer.tsx
- apps/booking-web/src/features/booking/steps/PriceStep.tsx
- apps/booking-web/src/features/booking/steps/DateTimeStep.tsx
- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx

**Testing Notes**
- Desktop stepper: Navigate to step 3, verify steps 1-2 are green. Click step 1, confirm step 2 turns from green to default slate.
- Desktop stepper: From any step, click a previous step and verify all steps after it are cleared from completed state.
- Mobile: Drawer only appears after selecting a service and not on confirm step.
- Mobile: Complete steps 1-2, open cart drawer, press Continue, verify page scrolls smoothly to step content (below dark header).
- Mobile: Verify "Start again" and "Continue" buttons are always visible at bottom of drawer regardless of content length.
- Mobile: If booking details are long, verify content area scrolls while buttons stay fixed at bottom.
- Back buttons: Verify all Back buttons use new dark rounded design with left arrow and orange hover state.
- Both desktop and mobile: Ensure backward navigation works correctly and state is preserved for the clicked step and earlier.

## [2025-10-30] Services page dark theme redesign (primary and supporting services)
**Summary**
- Redesigned the entire services section on the Services page to match the dark theme aesthetic used throughout the site.

**Primary Services Section (Service 1, 2, 3):**
- Section container background changed from white to dark slate 900 (`bg-slate-900` with `border-slate-700` and `shadow-inner`).
- Primary service cards (Service 1, 2, 3) redesigned:
  - Background: White → Dark slate 800 (`bg-slate-800` with `border-slate-700`)
  - Enhanced shadows (`shadow-lg`)
  - Hover: Border turns orange, slight lift, enhanced shadow
  - Icon circles: h-12 → h-14, orange tint default
  - Icon hover effect: Lighter orange background (`bg-orange-500/20`), brighter orange icon (`text-orange-400`), orange ring (`ring-2 ring-orange-500`), glow shadow - keeps icon visible on hover
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

**Files Modified**
- apps/booking-web/src/pages/ServicesPage.tsx

**Testing Notes**
- Verify entire services section has cohesive dark theme matching booking wizard.
- Primary services: Confirm Service 1, 2, 3 cards display with dark backgrounds, proper spacing, and readable text.
- Test primary card hover states: border turns orange, lift animation, icons fill orange with black centers.
- Check servicing notes box: orange-tinted background, readable slate text, proper spacing.
- Supporting services: Verify all 12 cards display with dark backgrounds and consistent styling.
- Test supporting card hover states: same behavior as primary cards.
- Verify responsive layout works across all breakpoints.
- Check text readability: white/orange headings, slate-300/400 body text, proper contrast throughout.

## [2025-10-30] Cart sidebar redesign to match dark theme
**Summary**
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

**Files Modified**
- apps/booking-web/src/components/CartSidebar.tsx

**Testing Notes**
- Verify cart sidebar displays with dark theme matching booking wizard header
- Check text readability: white values, orange labels, slate descriptions
- Test pulse animation on price changes (still works)
- Verify Continue button: orange background, rounded-full, proper hover state
- Verify Start again button: dark background with orange hover
- Check responsive behavior and spacing
- Ensure total price stands out with orange-400 color and larger size

## [2025-10-30] Vehicle modal redesign to match dark theme
**Summary**
- Completely redesigned the vehicle lookup modal to match the dark theme aesthetic throughout the booking wizard.
- Modal container: White → Dark slate 900 with slate-700 border, `rounded-3xl`, enhanced shadow, darker backdrop
- Modal header: White title, border-bottom separator, proper X close button with hover
- VRM lookup: Enhanced yellow UK number plate styling, larger bold text, "Search" button, orange manual entry link
- Manual entry form: All inputs with dark slate-800 backgrounds, white text, orange focus rings, better spacing
- Vehicle summary card: Redesigned with key-value layout, slate-800 background, orange price emphasis, proper spacing
- Search again button: Completely redesigned from blue underline to dark theme button (slate-800 bg, slate-600 border, orange hover)
- All buttons: Consistent `rounded-full` styling matching site-wide design
- Error messages: Red-400 text on tinted red background
- Better spacing, focus states, and mobile responsiveness throughout
- Fixed mobile scrolling issue: Added `max-h-[90vh] overflow-y-auto` to modal dialog, preventing content cutoff on small screens

**Files Modified**
- apps/booking-web/src/components/VehicleModal.tsx

**Testing Notes**
- Verify modal displays with dark slate background and proper close button
- Test VRM lookup: yellow input looks like UK number plate, search works
- Test manual entry: dark fields with orange focus rings
- Check vehicle summary: key-value layout, orange price
- Verify "Search again" button: dark theme with orange hover (not blue underline)
- Test all navigation buttons: consistent dark styling
- Check error messages and form validations
- Verify responsive layout on mobile

## [2025-10-30] Homepage updates: Reviews link and "Get in touch" section redesign
**Summary**
- Updated Google Reviews link to new URL with enhanced tracking parameters
- Completely redesigned "Get in touch" section to match dark theme aesthetic
- Section container: White → Dark slate 900 with slate-700 border and shadow-inner
- Added "CONTACT" label and improved section header styling
- Reorganized all contact information into individual dark-themed cards
- Workshop address, phone/WhatsApp, opening hours, and social media each in separate cards
- All cards: Dark slate-800 backgrounds, slate-700 borders, rounded-2xl corners, shadow-lg
- Icons: Orange-500 in orange-500/10 circles
- Phone/WhatsApp buttons: Rounded-full dark theme with orange hover
- Opening hours: Individual dark cards for each day with orange times
- Social media icons: Dark backgrounds with orange icons and hover states
- "Ready to book?" section: Dark card with rounded-full buttons
- Map: Taller (h-80), darker border, matches card styling
- All buttons consistent with site-wide rounded-full design
- Better spacing and responsive layout throughout

**Files Modified**
- apps/booking-web/src/pages/HomePage.tsx

**Testing Notes**
- Verify Google Reviews link opens correct page
- Check "Get in touch" section dark theme matches rest of site
- Test all contact cards display with proper styling
- Verify Call and WhatsApp buttons have orange hover
- Check opening hours grid responsive layout
- Test social media icon hovers
- Verify "Start booking" and "Contact us" buttons
- Check map height and styling
- Test mobile responsive behavior
- Mobile scrolling: On small screens, confirm modal content scrolls independently (not backdrop), can reach Continue button
## [2025-10-30] Air Con packages section restyle (Codex)
**Summary**
- Restyled the Air Con page "Packages tailored to your vehicle" section to use dark cards with orange accents, consistent with the site theme.
- Updated the CTA to a rounded-full orange button with focus ring and hover transitions.

**Files Modified**
- apps/booking-web/src/pages/AirConPage.tsx

**Testing Notes**
- Go to `/air-con` and locate "Packages tailored to your vehicle".
- Confirm dark section background (slate-900) and dark cards (slate-800) with slate-700 borders.
- Hover a card: slight lift, orange border, text lightens; CTA button styles and focus state are visible.
## [2025-10-30] Air Con inspections + Diagnostics page dark restyle (Codex)
**Summary**
- Converted Air Con "What we inspect every time" to dark theme (slate-900/800, slate-700 borders, orange accents).
- Restyled Diagnostics page to the same dark pattern, with a dedicated component and route import update.

**Files Modified**
- apps/booking-web/src/pages/AirConPage.tsx
- apps/booking-web/src/pages/DiagnosticsPageDark.tsx (new)
- apps/booking-web/src/routes.tsx

**Testing Notes**
- Air Con: `/air-con` → verify the inspections section uses dark styling with orange bullets and that the image panel overlays correctly.
- Diagnostics: `/diagnostics` → confirm both content sections use dark styling, card uses slate-800 with slate-700 border, CTAs behave with hover lift and focus ring.
## [2025-10-30] Contact page dark restyle + hero image swap (Codex)
**Summary**
- Restyled Contact page to the site’s dark theme (slate-900/800 backgrounds, slate-700 borders, white headings, slate body text, orange accents) and improved CTA accessibility.
- Replaced hero background image with local asset `apps/booking-web/src/assets/images/contact-us-bg-image.jpg`.

**Files Modified**
- apps/booking-web/src/pages/ContactPage.tsx

**Testing Notes**
- Visit `/contact` and verify the hero image is the local asset, CTAs have focus rings and hover lift, the info grid and form use dark styles, and the opening hours list uses dark cards with orange times.
## [2025-10-30] Account page dark restyle + doc chips removed (Codex)
**Summary**
- Restyled the Account page to match the dark theme (slate-900/800 backgrounds, slate-700 borders, white headings, orange accents).
- Booking history: removed Documents chips (invoice/quote) and kept the View details action.
- Updated booking status badges for dark mode readability.
- Disabled the email verification alert; backend already auto-verifies on registration.

**Files Modified**
- apps/booking-web/src/pages/AccountPage.tsx

**Testing Notes**
- Log in and navigate to `/account`.
- Confirm dark styling, absence of document chips, and correct behavior of “View details”.
- Ensure no verification alert panel renders. If you want the inline “Status: …” line removed entirely, I can hide it in a follow-up.
## [2025-10-30] Remove verify-email route (Codex)
**Summary**
- Removed the `/verify-email` route and import so email verification UI is not accessible in the app.
- The underlying page component remains on disk for now (encoding issue) but is no longer referenced.

**Files Modified**
- apps/booking-web/src/routes.tsx

**Testing Notes**
- Hit `/verify-email` in the browser; confirm the route is not available anymore.
## [2025-10-30] Normalize quotes on Account + Booking detail (Codex)
**Summary**
- Replaced mojibake smart quotes with ASCII apostrophes on Account and Booking Detail pages.
- Fixed a corrupted back-arrow label on Booking Detail to display "Back to account".

**Files Modified**
- apps/booking-web/src/pages/AccountPage.tsx
- apps/booking-web/src/pages/BookingDetailPage.tsx

**Testing Notes**
- `/account`: Verify text shows as "we'll", "you're", "doesn't", "haven't", and fallback "Loading...".
- `/account/bookings/:id`: Verify the "Back to account" link shows correctly without stray characters.
## [2025-10-30] API cleanup: remove email verification helpers (Codex)
**Summary**
- Removed unused verification email sender and URL builder from the API email service.
- `.env.example`: removed `EMAIL_VERIFICATION_URL` and `EXPOSE_VERIFICATION_TOKEN`. Portal URL now optionally reads `PORTAL_BASE_URL` (fallback to localhost).

**Files Modified**
- apps/booking-api/src/email/email.service.ts
- apps/booking-api/.env.example

**Testing Notes**
- Run API and trigger a booking confirmation; ensure links in emails render with the correct base URL.

## [2025-10-30] Account page rebuild (fix JSX + encoding) (Codex)
**Summary**
- Rewrote `AccountPage.tsx` to resolve TypeScript and JSX errors caused by prior mojibake edits.
- Restored status management (`profileStatus`, `bookingsStatus`), dark theme cards, and removed document chips.

**Files Modified**
- apps/booking-web/src/pages/AccountPage.tsx

**Testing Notes**
- `/account`: verify loading/error states, booking list renders, and profile/password forms work. Confirm no stray characters remain.
## [2025-10-30] Booking Detail page dark restyle (Codex)
**Summary**
- Restyled the booking detail view (`/account/bookings/:id`) to the established dark theme with orange accents and dark-friendly status badges.

**Files Modified**
- apps/booking-web/src/pages/BookingDetailPage.tsx

**Testing Notes**
- Confirm all sections (services, totals, vehicle & contact, documents) render in dark style with consistent buttons and badges.
## [2025-10-30] Admin Panel dark restyle (Codex)
**Summary**
- Updated `/admin` to the dark theme: gradient header, dark cards for all admin sections, dark inputs, and orange CTAs.
- Adjusted labels and text colors for readability; fixed mojibake currency symbol in settings to `£`.

**Files Modified**
- apps/booking-web/src/pages/AdminPage.tsx
- apps/booking-web/src/features/admin/CatalogManager.tsx
- apps/booking-web/src/features/admin/CalendarManager.tsx
- apps/booking-web/src/features/admin/RecipientsManager.tsx
- apps/booking-web/src/features/admin/SettingsManager.tsx

**Testing Notes**
- Log in as ADMIN/STAFF and verify dark styling across Catalog, Calendar, Recipients, and Settings; inputs and buttons behave consistently; delete buttons show red accents; settings currency renders with `£`.
\n### 2025-10-31

- Admin: Fix low-contrast text and inputs inside dark cards.
  - CatalogManager: dark labels/inputs for Engine Tiers; dark list rows and buttons; Service Prices rows updated; fixed mojibake in tier summary (middle dot and em dash).
  - SettingsManager: darken remaining labels/selects/textarea and helper/message text in the General settings card.
  - Verified Calendar and Recipients are already consistent.
