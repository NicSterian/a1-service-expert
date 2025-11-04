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

