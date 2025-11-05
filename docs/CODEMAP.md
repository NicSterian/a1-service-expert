Code Map and Refactor Plan

Overview
- Monorepo via pnpm workspaces
  - apps/booking-api (NestJS): core API, Prisma, docs/email/pdf integrations
  - apps/booking-web (React + Vite): customer booking flow + admin
  - packages/shared: shared pricing types and utilities

Principles
- Keep controllers/components thin; move logic to services/hooks
- Prefer small modules with clear ownership; pure helpers where possible
- Avoid duplicated formatting and mapping logic; centralise in utilities

Large Files and Suggested Splits
- API
  - bookings.service.ts (~1600 lines)
    - Extract: AvailabilityCoordinator, PricingGateway, BookingNotifier,
      DocumentOrchestrator
  - email.service.ts (~700 lines)
    - Extract: TemplateRenderer, TransportGateway (keep EmailService as façade)
    - Status: scaffolded interfaces added under src/email/ (not yet wired)
  - documents.controller.ts (~550 lines)
    - Extract: DocumentDtoMapper; keep controller to routing/guards only
  - vehicles.service.ts (~350 lines)
    - Extract: DVLA adapter interface + mock for tests

- Web (Admin)
  - AdminBookingDetailPage.tsx (~980 lines)
    - Components: CustomerPanel, VehiclePanel, ServicePricingPanel,
      DocumentsPanel, Timeline/NotesPanel
    - Hook: useAdminBooking(id)
  - CatalogManager.tsx (~580 lines)
    - Components: ServiceForm, TierForm, PriceGrid; client module for API
  - AdminBookingsList.tsx (~630 lines)
    - Hook: useBookingsFilters; Row component
  - DevToolsPage.tsx (~650 lines)
    - Components per tool card under pages/dev-tools/

- Web (Customer Flow)
  - DetailsConfirmStep.tsx (~720 lines)
    - Hooks: useAccountAuth, useProfileDraft, useHoldManager
    - Components: AccountSection, DetailsSection, SummarySection, FinalChecks
  - ServicesStep.tsx (~560 lines)
    - Extract price mapping and selection logic to hooks; componentize cards/table

Incremental Adoption Plan
1) Add unit tests for pure helpers as they are extracted
2) Introduce new modules alongside existing; wire them in without changing behaviour
3) Move components to new files and re-export from an index to keep imports stable
4) Review bundle size impact; prefer hooks + light components

Commentary Guidance
- Add file-level header comment with purpose and safe refactor ideas (started)
- Add JSDoc on exported functions/types (focus on larger modules first)
- Use TODO tags only for specific, small follow-ups; track big moves here

Recent Refactors (working-branch)
- Scope: No behavior/UI changes. All changes kept on `working-branch` per instructions; no promotions to `ready-for-deploy` yet in this phase.
- API
  - Email service adapters (prior step): EmailService now delegates to a TemplateRenderer and TransportGateway to preserve behavior while enabling injection and testability. Builds and Jest suites remain green.
- Web (Admin)
  - AdminBookingDetailPage has been progressively split into focused panels and backed by a small hook:
    - Added `useAdminBooking` hook to own fetch/status/error and provide update helpers (status, payment, customer, vehicle).
    - Extracted and wired panels:
      - `ServicePricingPanel` (existing) + `DocumentsPanel` (existing) — previously wired in.
      - `PaymentPanel` — extracted from inline Payment section.
      - `StatusPanel` — extracted status selector + history block.
      - `InternalNotesPanel` — extracted Internal Notes block (save/reset).
      - `VehiclePanel` — replaces the inline Vehicle section. The legacy inline markup is now hidden and will be removed after visual verification.
    - Fixed JSX closure issues encountered during panel wiring.
  - All web lint/build and API test/build checks pass after each change.

Files changed/created (admin web)
- Updated
  - `apps/booking-web/src/features/admin/pages/AdminBookingDetailPage.tsx`
    - Uses `useAdminBooking` and delegates mutations to it.
    - Renders `CustomerPanel`, `ServicePricingPanel`, `PaymentPanel`, `StatusPanel`, `VehiclePanel`, `DocumentsPanel`, `InternalNotesPanel`.
    - Legacy inline Vehicle block is hidden (safe to remove after verification).
- New
  - `apps/booking-web/src/features/admin/pages/useAdminBooking.ts`
    - API: `refreshBooking`, `updateStatus`, `updatePaymentStatus`, `updateCustomer`, `updateVehicle` (sets booking upon success).
  - `apps/booking-web/src/features/admin/pages/PaymentPanel.tsx`
  - `apps/booking-web/src/features/admin/pages/StatusPanel.tsx`
  - `apps/booking-web/src/features/admin/pages/InternalNotesPanel.tsx`

Validation status
- API
  - Tests: `pnpm.cmd --filter booking-api test -- --config jest.config.ts` → pass (2 suites, 7 tests).
  - Build: `pnpm.cmd --filter booking-api build` → pass.
- Web
  - Lint: `pnpm.cmd --filter booking-web lint` → pass.
  - Build: `pnpm.cmd --filter booking-web build` → pass.

Refactor outcomes
- Reduced surface area of `AdminBookingDetailPage.tsx` by extracting cohesive panels and moving fetch/update plumbing into `useAdminBooking`.
- Centralized booking mutations (status, payment, customer, vehicle) in the hook for consistency and testability.
- Maintained API contracts and preserved UI behavior.

Next refactor opportunities (no behavior change)
- Admin (short-term)
  - Remove the now-hidden legacy Vehicle inline JSX once visually confirmed.
  - Extract `DangerZonePanel` (soft delete/restore) for parity with other panels.
  - Unify date formatting helpers (formatDate/formatDateTime) into a small utility — currently duplicated across page/panels.
  - Move shared admin types (`AdminBookingResponse`, `BookingStatus`, `PaymentStatus`) from `AdminBookingDetailPage.tsx` into a `features/admin/types.ts` (or pages/types.ts) so panels don’t import from the page.
  - Extend `useAdminBooking` with remaining actions: `createInvoiceDraft`, `createQuoteDraft`, `issueInvoice`, `emailInvoice`, `softDelete`, `restore` — to further thin the page.
  - Tidy Vehicle make/model join character in `VehiclePanel.tsx` to a standard separator (e.g., `•`) if desired.
- Admin (medium-term)
  - Add component tests (React Testing Library) for panels and the hook:
    - Service price update flows, payment update, notes save/reset, status history rendering.
  - Introduce a lightweight `pages/index.ts` barrel to consolidate imports.
- API
  - Consider promoting email adapters to explicit `DefaultTemplateRenderer` and `DefaultTransportGateway` classes with DI wiring (keep defaults to preserve behavior).
  - Add unit tests for template mapping and a transport stub test.

Branch/PR notes
- All commits landed on `working-branch`. No promotions to `ready-for-deploy` during this refactor phase per request.
- Prior PRs for earlier lint/type fixes were raised separately and merged after verification.
