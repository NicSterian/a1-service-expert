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

---

SOLID Refactor Plan (2025-11)

Scope and Constraints
- No behavior or API contract changes.
- Keep API tests/build green; keep Web lint/build green.
- Small, focused commits with prefixes: `refactor(api|web|shared): …`, `docs:` for this file.
- Do not promote to `ready-for-deploy` until explicitly requested.

Targets (≥500 LOC)
- API
  - `apps/booking-api/src/bookings/bookings.service.ts` (~1643)
  - `apps/booking-api/src/email/email.service.ts` (~770)
  - `apps/booking-api/src/admin/documents.controller.ts` (~567)
- Web
  - `apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx` (~736)
  - `apps/booking-web/src/features/admin/bookings/ManualBookingForm.tsx` (~715)
  - `apps/booking-web/src/features/admin/pages/AdminBookingDetailPage.tsx` (~699)
  - `apps/booking-web/src/features/admin/pages/DevToolsPage.tsx` (~666)
  - `apps/booking-web/src/features/admin/bookings/AdminBookingsList.tsx` (~640)
  - `apps/booking-web/src/features/admin/pages/UsersPage.tsx` (~545)
  - `apps/booking-web/src/features/admin/SettingsManager.tsx` (~538)
  - `apps/booking-web/src/features/admin/CatalogManager.tsx` (~503)

API Refactors
- bookings.service.ts
  - Extract delegates (BookinsService remains the façade):
    - AvailabilityCoordinator: slot checks and hold management (wraps `HoldsService`, date normalization).
    - PricingPolicy: pricing resolution (FIXED/TIERED), engine tier mapping via `@a1/shared/pricing`.
    - DocumentOrchestrator: draft/issue/email documents and presenters (wraps `DocumentsService`, `EmailService`, `SettingsService`).
    - BookingNotifier: customer/admin booking notifications (wraps `EmailService`).
    - BookingRepository: typed Prisma queries/transactions for bookings + includes.
    - AdminBookingManager: admin mutations (status, payment status, internal notes, customer, vehicle, service lines).
    - Helpers file: move `normalizeEngineSize`, `presentDocument` to `bookings.helpers.ts`.
  - Interfaces: `IAvailabilityCoordinator`, `IPricingPolicy`, `IDocumentOrchestrator`, `IBookingNotifier`, `IBookingRepository`, `IAdminBookingManager`.

- email.service.ts
  - Introduce DI-friendly adapters with defaults to preserve behavior:
    - `DefaultTemplateRenderer` implements `TemplateRenderer`.
    - `DefaultTransportGateway` implements `TransportGateway` (wraps nodemailer).
    - `email.utils.ts` for `formatDate`, logo loader, small formatting helpers.
  - EmailService accepts optional renderer/gateway; falls back to defaults.

- admin/documents.controller.ts
  - Thin controller by extracting:
    - `DocumentCsvBuilder`: rows → CSV.
    - `DocumentQueryBuilder`: builds Prisma `where` from query params.
    - `DocumentsAdminService`: heavy operations (issue/email/update) wrapping `PrismaService`, `DocumentsService`, `SettingsService`, `EmailService`.
    - `dto/` for request DTOs (keep shape; optional class-validator later).

- vehicles.service.ts (near-threshold)
  - Define `DvlaLookup` interface and mock adapter; keep current lookups unchanged.

Web Refactors
- DetailsConfirmStep.tsx
  - Components: `DetailsForm`, `VehicleForm`, `AddressForm`, `ReviewSummary`, `TermsCheckbox`.
  - Hook: `useBookingDetails` (state, validation, submit).
  - Utils: `validators.ts`, `dates.ts` for formatting.

- ManualBookingForm.tsx
  - Sections: `CustomerSection`, `VehicleSection`, `ServicesSection`, `ScheduleSection`, `NotesSection`.
  - Hook: `useManualBooking` (state, normalization, submit).

- AdminBookingDetailPage.tsx
  - Continue panelization: add `CustomerPanel`, `DocumentsPanel`, `DangerZonePanel`.
  - Shared types: `features/admin/types.ts`.
  - Utils: `lib/dates.ts`.
  - Extend `useAdminBooking` with document actions + delete/restore.

- DevToolsPage.tsx
  - Panels per tool: `EmailTestPanel`, `SeedDataPanel`, `FeatureFlagsPanel`, `DiagnosticsPanel`.
  - API module: `devToolsApi.ts`.

- AdminBookingsList.tsx
  - Components: `BookingsFilterBar`, `BookingsTable`, `BookingRow`, `PaginationControls`.
  - Hook: `useAdminBookings` (query, paging, sorting).

- UsersPage.tsx
  - Components: `UsersTable`, `UserEditorModal`; API: `useUsersApi`.

- SettingsManager.tsx
  - Panels: `GeneralSettingsPanel`, `EmailSettingsPanel`, `PricingSettingsPanel`.
  - Hook/API: `useSettings`, `settingsApi.ts`.

- CatalogManager.tsx
  - Components: `PriceGrid`, `PriceList`, `ServiceList`, `TierList`.
  - Hook/API: `useCatalog`, `catalogApi.ts`.
  - Money utils: `lib/money.ts` for `formatPrice`.

Phased Execution
- Phase 1 (low risk, pure extractions)
  - API: Extract `bookings.helpers.ts` for pure helpers.
  - API: Move email adapters to `email/adapters/*` and utils; wire defaults in `EmailService`.
  - Web: Extract `catalogApi.ts`, `useCatalog`, and `PriceList` without UI change.

- Phase 2 (orchestration delegates)
  - API: Extract `PricingPolicy` and `DocumentOrchestrator` presenters; delegate from `BookingsService`.
  - Web: Add `CustomerPanel`, `DocumentsPanel` to AdminBooking page using existing hook.

- Phase 3 (admin/service segmentation)
  - API: Extract `AvailabilityCoordinator`, `BookingNotifier`, partial `AdminBookingManager`.
  - Web: Split `ManualBookingForm` into sections + `useManualBooking`.

- Phase 4 (thin controllers/services)
  - API: Add `DocumentQueryBuilder`, `DocumentCsvBuilder`, `DocumentsAdminService` and thin the controller.
  - Web: Extract list views into hooks + table components (AdminBookings, Users).

- Phase 5 (repository/interfaces cleanup)
  - API: Centralize booking queries/transactions in `BookingRepository`; introduce lean interfaces; minimize `any`.
  - Web: Centralize `dates.ts`, `money.ts`, `validators.ts` and remove duplication.

Verification per Step
- Commands:
  - `pnpm.cmd --filter booking-api test -- --config jest.config.ts`
  - `pnpm.cmd --filter booking-api build`
  - `pnpm.cmd --filter booking-web lint`
  - `pnpm.cmd --filter booking-web build`
- No changes to public APIs or UI.

Commit and Documentation
- Use small commits with clear prefixes.
- Update `docs/CODEMAP.md` after each completed sub-step with a brief summary.

Commenting Approach During Refactors
- File headers: brief purpose, ownership, and collaboration points.
- JSDoc: public classes/functions/interfaces with parameter/return docs and invariants.
- Block comments: before non-trivial logic to explain intent, not mechanics.
- Behavior lock: add a short note where behavior must remain unchanged (e.g., “Do not alter pricing resolution order”).
- Avoid noise: prefer concise, high-signal comments; keep code self-explanatory where possible.

Ready State
- Awaiting explicit go-ahead to begin Phase 1 implementation. When proceeding, changes will include clarifying comments as noted, with no behavior changes.

---

Window Context #2 – BookingsService Refactor Plan

File: apps/booking-api/src/bookings/bookings.service.ts (~1643 LOC)

Goal
- Reduce responsibility by extracting cohesive delegates while preserving all public method signatures and runtime behavior.
- Improve readability via concise, high-signal comments and JSDoc on touched areas.

Phases (per this file)
- Phase 1 — Helpers and comments (no behavior change)
  - Extract pure helpers into `bookings.helpers.ts`:
    - `normalizeEngineSize(number | null | undefined): number | null`.
    - `presentDocument(doc: Document): { id, type, number, status, totalAmountPence, vatAmountPence, pdfUrl, validUntil }`.
  - Add a short file header to `bookings.service.ts` documenting purpose, collaborators, and behavior lock.
  - Add JSDoc to public methods and the new helper functions.

- Phase 2 — PricingPolicy (typed, pure)
  - Introduce `PricingPolicy.resolveUnitPrice()` to handle FIXED/TIERED logic and engine-tier mapping (using `@a1/shared/pricing`).
  - Delegate from `createBooking` and keep error semantics/messages identical.

- Phase 3 — Document presenters + orchestrator
  - Move document mappers to `DocumentOrchestrator` (presenters first), then add draft/issue/email orchestration (wraps `DocumentsService`, `EmailService`, `SettingsService`).
  - Delegate admin document actions from `BookingsService` to orchestrator.

- Phase 4 — AvailabilityCoordinator (slots + holds)
  - Extract slot checks and hold lifecycle into `AvailabilityCoordinator` (wraps `HoldsService`, date utils), and use from create/confirm paths.

- Phase 5 — BookingNotifier
  - Extract booking notification composition/dispatch for customer and staff to `BookingNotifier` (wraps `EmailService`).

- Phase 6 — AdminBookingManager
  - Extract admin-only mutations: status, payment status, internal notes, customer, vehicle, service lines, soft/hard delete and restore.

- Phase 7 — BookingRepository
  - Centralize Prisma queries/transactions with typed includes; `BookingsService` remains the façade.

- Phase 8 — Interfaces + cleanup
  - Introduce lean interfaces for delegates and replace `any` in touched areas with precise types; add concise comments on business rules.

Verification per Phase
- Run: `pnpm.cmd --filter booking-api test -- --config jest.config.ts` and `pnpm.cmd --filter booking-api build`.
- Lint changed files to avoid introducing new violations.

Commenting Approach (this file)
- File header with purpose and behavior lock.
- JSDoc for public methods and extracted helpers.
- Short block comments before non-trivial business rules (no behavior change notes).

Status
- Phase 1 (Helpers + comments): completed.
  - Extracted `bookings.helpers.ts` and added file header/comments in service.
  - Rewired callers; preserved behavior. Tests/build green.
- Phase 2 (PricingPolicy): completed.
  - Added `pricing.policy.ts` and delegated `createBooking` pricing resolution.
  - Preserved selection order and error messages. Tests/build green.
  - Lint clean on changed files.
- Phase 3 (Document presenters + orchestrator): completed.
  - Added `document.orchestrator.ts` and delegated `adminIssueInvoice`, `adminEmailInvoice`, `adminCreateInvoiceDraft`, `adminCreateQuoteDraft`.
  - Moved document summary presenter; preserved messages and sequencing. Tests/build green.
  - Lint clean on changed files.
- Phase 4 (AvailabilityCoordinator): completed.
  - Added `availability.coordinator.ts`; delegated slot checks in `createBooking` and `createManualBooking`.
  - Delegated hold release in `confirmBooking` with same logging.
  - Tests/build green; lint clean on changed files.
- Phase 5 (BookingNotifier): completed.
  - Added `booking.notifier.ts`; delegated booking confirmation emails from `confirmBooking` and manual booking flow.
  - Preserved email payload shape and reference resolution; error logging remains at call sites.
  - Tests/build green; lint clean on changed files.
- Phase 6 (AdminBookingManager): completed.
  - Added `admin-booking.manager.ts`; delegated admin mutations (status, notes, payment status, customer, vehicle, service line, soft/hard delete, restore).
  - Preserved validation, messages, and hold-release behaviour.
  - Tests/build green; lint clean on changed files within bookings module.
- Phase 7 (BookingRepository): completed.
  - Added `booking.repository.ts`; delegated common queries used by user/admin views.
  - Reduced include duplication; preserved return shapes and ordering.
  - Tests/build green; lint clean on changed files.
- Phase 8 (Interfaces + cleanup): completed.
  - Added `bookings.ports.ts` and typed private collaborators to interfaces for DIP.
  - No behaviour changes; added concise comments to delegates and service.
  - Tests/build green; lint clean on changed files in bookings module.

Step 1 – Presenters Extraction (planned)
- Objective
  - Move all API response shaping/mapping out of `bookings.service.ts` into a small presenter module.
  - Keep logic and response shapes identical; add concise JSDoc and intent comments.
- Targets to extract
  - list item mapping (used by `listBookingsForUser`).
  - user booking mapping (used by `getBookingForUser`).
  - admin booking mapping (used by `getBookingForAdmin`).
  - confirmation mapping (used by `confirmBooking`).
- New module
  - `apps/booking-api/src/bookings/bookings.presenter.ts` with:
    - `presentListItem(booking)`
    - `presentUserBooking(booking)`
    - `presentAdminBooking(booking)`
    - `presentConfirmation(booking, totals)`
  - Uses existing helpers (`presentDocument`) and mirrors current field mapping.
  - Internal helper duplicates the current booking reference formatting for confirmation’s fallback to avoid behaviour change.
- Changes in service
  - Replace inline maps with calls to presenter functions.
  - Remove private `presentConfirmation` and `computeServicesTotal` methods.
  - Keep method signatures and error messages unchanged.
- Verification
  - Run API: build + tests; lint the changed files in bookings module.
  - No UI/behaviour changes; response payloads remain identical.

Step 1 – Presenters Extraction (done)
- Implemented
  - Added `bookings.presenter.ts` with four mappers: `presentListItem`, `presentUserBooking`, `presentAdminBooking`, `presentConfirmation`.
  - Rewired `listBookingsForUser`, `getBookingForUser`, `getBookingForAdmin`, and `confirmBooking` to call presenters.
  - Removed private `presentConfirmation` and `computeServicesTotal` from service.
- Behaviour
  - Response shapes, field names, and values preserved. Fallback reference formatting mirrors existing logic.
- Verification
  - API build/tests pass; module lint is clean (existing controller lint untouched).
- File size reduced: `bookings.service.ts` now ~776 LOC (from ~984). Further reductions planned in next steps.

Step 2 – Finance/Sequence Utils (planned)
- Objective
  - Move VAT calculation and booking reference/sequence helpers out of the service.
- Targets to extract
  - `calculateVatFromGross`, `nextSequence`, `formatBookingReference`, `resolveBookingReference`.
- New module
  - `apps/booking-api/src/bookings/bookings.utils.ts` exporting the four helpers.
- Changes in service
  - Replace method calls with imports; remove the private methods.
- Verification
  - API build/tests pass; bookings module lint clean.

Step 2 � Finance/Sequence Utils (done)
- Implemented
  - Added `bookings.utils.ts` with the four helpers mirroring prior logic.
  - Rewired `confirmBooking`, manual booking flow, and reference usage to call imported helpers.
  - Removed private helpers from `bookings.service.ts`.
- Behaviour
  - Identical VAT calculation, sequence upsert, and reference formatting.
- Verification
  - API build/tests pass; module lint remains clean.
  - File size reduced: `bookings.service.ts` now ~747 LOC.


Step 2.1 - BookingsService ESLint review (done)
- Objective
  - Ensure apps/booking-api/src/bookings/bookings.service.ts is clean under our current lint posture without altering behavior.
- Findings
  - No booking-api lint script is defined; relied on build/tests and manual static review.
  - No unused imports or obvious rule violations in this file; Logger usage and async flows are correct.
- Verification
  - Built successfully: pnpm.cmd --filter booking-api build.
  - Tests remain green: pnpm.cmd --filter booking-api test -- --config jest.config.ts.
  - No code changes required for lint beyond existing comments/structure.

---

Window Context #3 - EmailService Refactor Plan

File: apps/booking-api/src/email/email.service.ts (~700 LOC)

Goal
- Introduce DI-friendly adapters and small utils while preserving behaviour and the public API of EmailService.
- Keep build/tests green; add concise comments and section headers as we touch files.

Phases (per this file)
- Phase 1 - Adapters + utils (no behaviour change)
  - Add default adapters implementing existing seams: DefaultTransportGateway, DefaultTemplateRenderer.
  - Extract small pure helpers to email.utils.ts (formatCurrencyGBP, formatDateLong, tryLoadLogoDataUri).
  - Wire EmailService.getTransportGateway/getTemplateRenderer to use the adapters; keep call sites identical.
- Phase 2 - Renderer consolidation (planned)
  - Move full subject/body/html branching into DefaultTemplateRenderer and remove duplication from EmailService.
  - Remove temporary hooks after migration; use utils for formatting and links.
- Phase 3 - Cleanup (planned)
  - Ensure comments remain high-signal; prune stale notes; consider extracting contact-message builder to renderer.

Phase 1 - Adapters + utils (done)
- Implemented
  - apps/booking-api/src/email/adapters/default-transport.gateway.ts
  - apps/booking-api/src/email/adapters/default-template.renderer.ts
  - apps/booking-api/src/email/email.utils.ts (formatCurrencyGBP, formatDateLong, tryLoadLogoDataUri)
- Service changes
  - EmailService now instantiates adapters via lazy getters; behaviour preserved.
  - formatCurrency/formatDate now delegate to utils; logo loader wraps tryLoadLogoDataUri with caching.
- Verification
  - Build: pnpm.cmd --filter booking-api build -> pass.
  - Tests: pnpm.cmd --filter booking-api test -- --config jest.config.ts -> pass (2 suites, 7 tests).
