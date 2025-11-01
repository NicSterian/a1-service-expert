## 2025-10-31 – Implementation #16 (Deleted Tab Actions + Safe Delete)

Summary:
- Added per-booking actions in Deleted tab: Restore and Delete Permanently (with confirm prompts)
- Added soft delete/restore/hard delete endpoints; default lists now exclude deleted without hiding null paymentStatus
- Fixed list filter logic so Upcoming/Past show non-deleted bookings while Deleted shows only deleted

Files Modified:
- apps/booking-api/src/admin/bookings.controller.ts (deleted filter param; soft delete/restore/hard delete routes)
- apps/booking-api/src/bookings/bookings.service.ts (adminSoftDeleteBooking, adminRestoreBooking, adminHardDeleteBooking)
- apps/booking-web/src/features/admin/bookings/AdminBookingsList.tsx (Deleted tab actions per row)
- apps/booking-web/src/features/admin/bookings/UpcomingBookings.tsx (export DeletedBookings)
- apps/booking-web/src/features/admin/pages/BookingsPage.tsx (Deleted tab wiring)

Behavior:
- Delete from booking detail moves to Deleted (soft delete) with confirm
- Deleted tab shows bookings with Restore and Delete Permanently buttons
- Restore returns booking to normal lists; Delete Permanently removes booking + services + documents from DB

Testing Notes:
- API: `pnpm --filter booking-api build`
- Web: `pnpm --filter booking-web build`
- Verify: soft delete from detail → item appears in Deleted; restore/hard-delete behave as expected
## 2025-10-31 – Implementation #15 (Manual Booking Price & Modal Fixes)

Summary:
- Fixed price calculation for inline-created services and custom overrides in ManualBookingForm
- Ensured price sent for new FIXED services when no custom price is provided
- Hardened modal overlay and maintained sticky footer padding

Files Modified:
- apps/booking-web/src/features/admin/bookings/ManualBookingForm.tsx (calculatedPrice logic; payload priceOverridePence; overlay opacity)

Testing Notes:
- Web: `pnpm --filter booking-web build`
- Scenarios validated: (1) Create New (Fixed) with default fixed price; (2) Use Custom Price; (3) Catalog service with tiered/fixed
- Expected: no “Could not calculate price”, server accepts payload without 500
## 2025-10-31 – Implementation #14 (Service Selection Plan – Stabilization)

Summary:
- Fixed 404 on engine tiers by adding dedicated Admin lookups endpoint: GET /admin/engine-tiers
- Improved ManualBookingForm modal: stronger overlay (bg-black/80), sticky footer retained, added bottom padding to avoid overlap with Payment Status
- Completed multi-source service selector with inline service creation and curated Common Services; selector now supports Create New / Common / Online

Files Created:
- apps/booking-api/src/admin/lookups.controller.ts (GET /admin/engine-tiers)

Files Modified:
- apps/booking-api/src/admin/admin.module.ts (register AdminLookupsController)
- apps/booking-web/src/features/admin/bookings/ManualBookingForm.tsx (selector UX; inline creation; overlay; padding)

Testing Notes:
- API: `pnpm --filter booking-api build`
- Web: `pnpm --filter booking-web build`
- Verify: ManualBookingForm loads tiers via /admin/engine-tiers; select can reach Online Services; modal no longer bleeds and buttons remain visible

Next:
- If SLOT weekend override is desired later, add adminOverride handling in admin booking flows
## 2025-10-31 – Implementation #13 (Service Selection UX)

Summary:
- Implemented multi-source service selector in ManualBookingForm: Create New, Common Services (no MOT/Tyres), and Online Services (catalog)
- Defaulted manual bookings to Custom date/time and Custom price; selecting a catalog service auto-applies tiered/fixed pricing (still overrideable)
- Added inline new-service creation (uses POST /admin/catalog/services), then selects the created service before booking
- Improved modal UX: fully scrollable with sticky action bar and extra bottom padding to avoid Payment Status overlap

Files Modified:
- apps/booking-web/src/features/admin/bookings/ManualBookingForm.tsx (service selector, inline creation, defaults, sticky footer, pb-24)

Notes:
- Common services list is curated (no MOT or Tyres)
- Weekend-friendly via Custom scheduling (SLOT weekend override remains a future enhancement)
- If cached UI still calls /catalog/tiers, hard refresh or restart dev

Testing:
- Web build: `pnpm --filter booking-web build`
- Create flow tested for: (1) new service creation + custom price, (2) common service -> new service, (3) catalog service with tiered/fixed
# Admin Context

## CONTEXT #2: Service Selection Plan (Admin Manual Bookings)

Goal

- Deliver an intuitive service selection workflow for manual bookings without exposing irrelevant defaults (no MOT, no Tyres), while keeping full control over pricing and scheduling (weekend-friendly).

Constraints

- Do not show placeholder DB services (Service 1/2/3) as defaults.
- Manual bookings must allow weekends by default (via Custom scheduling). SLOT mode weekend override optional for admins only.
- Pricing defaults to Custom for manual bookings; selecting an Online (catalog) service should auto-apply its pricing but remain overrideable even if engine cc is missing.

Curated Common Services (no MOT/Tyres)

- Full Service
- Interim Service
- Oil & Filter Change
- Diagnostics
- Brake Pads (Front/Rear)
- Brake Discs + Pads (Front/Rear)
- Brake Fluid Change
- Air-Con Re-gas
- Battery Replacement
- Coolant Flush
- Spark Plugs Replacement
- Timing Belt/Chain Service
- Suspension Check/Repair

Proposed UX (Frontend)

- Service select becomes a 3-part control:
  - First option: “Create New Service…” (opens inline mini-form: name, pricing mode [Fixed/Tiered], price if Fixed)
  - Optgroup: “Common Services” (list above). Selecting one pre-fills name and uses Custom price by default; admin can proceed without creating a catalog record, or click “Add to Catalog” toggle to persist it first.
  - Optgroup: “Online Services (Catalog)” (existing DB services). Selecting one auto-switches to its pricing (tiered/fixed). If engine tier/cc is missing, show tier selector but still allow custom override.
- Defaults on open:
  - Scheduling: Custom Date/Time (weekend-friendly)
  - Pricing: Custom price enabled
- Mobile usability:
  - Modal panel uses opaque background (no bleed-through)
  - Sticky action bar (Cancel/Create) remains visible; add bottom padding to content to avoid overlap with sticky footer.

Backend Changes (Admin API)

- Optional: POST /admin/catalog/services to create a service quickly (name, pricingMode, optional fixedPricePence). Returns { id, name, pricingMode, fixedPricePence }.
- Weekend override (SLOT mode only): accept adminOverride=true to relax weekend rules in admin flows (Custom mode already bypasses slot grid).

Validation Plan

- Desktop + mobile smoke test for: scroll, visibility, no transparency bleed, sticky buttons.
- Create booking from:
  1. Common Services with custom price
  2. Create New Service (persist then select)
  3. Online (catalog) service with tiered price and without engine cc (override path)
- Weekend date: ensure Custom mode accepts weekend; document SLOT override behavior.

Outstanding UI Issues to Fix (next)

- Residual transparency on parts of the modal while scrolling.
- Payment Status area overlapping the sticky action buttons (add safe bottom padding under form content).

Rollout Steps (not started)

1. FE: Implement multi-source service selector (Create New + Common + Online) with inline mini-form.
2. BE: Add POST /admin/catalog/services for quick service creation.
3. FE: Default scheduling=Custom and useCustomPrice=true (already applied); ensure bottom padding to avoid overlap.
4. BE: Add admin weekend override for SLOT if required.
5. QA: Verify on mobile (iOS/Android) and desktop.

## 2025-10-31 â€“ Implementation #12 (Manual Booking UX Requests + Plan)

Summary:

- Reported issues: leftover request to `/catalog/tiers`, modal transparency while scrolling, action buttons hidden under mobile bottom nav
- Product requests: curated common-services list with â€œCreate new serviceâ€ option, default scheduling to Custom Date/Time, allow manual bookings at weekends, default pricing to Custom for manual unless an Online (catalog) service is chosen (then tiered/fixed pricing applies but can be overridden)

Fixes Applied (quick):

- ManualBookingForm overlay raised above bottom nav and made fully scrollable: `z-[100]`, `bg-black/70`, sticky action bar inside modal so Cancel/Create are always visible on mobile
- Defaulted ManualBookingForm to Custom date/time and Custom price on load
- When selecting an existing catalog service, the form now switches to that serviceâ€™s pricing by default (can be toggled back to custom)
- Updated frontend engine-tier requests to `/admin/engine-tiers` (if you still see `Cannot GET /catalog/tiers`, hard-refresh the browser or restart dev server to drop cached bundles)

Proposed Approach (next changes):

- Curated services: add a static â€œCommon Servicesâ€ list in the UI with a top â€œCreate New Serviceâ€¦â€ action that opens a lightweight inline form (name, pricing mode, default price). On submit, call a new `POST /admin/catalog/services` to create a real Service row, then proceed with the newly created serviceId
- Weekend manual bookings: keep default to Custom scheduling (already bypasses slot rules). If we also want SLOT mode to allow weekends for admins, add a `?adminOverride=true` flag to admin endpoints and relax weekend guards when present
- Pricing defaults: keep manual default as Custom. When an Online (catalog) service is selected, auto-select tiered/fixed and prefill price, but allow override even if engine cc is empty

Task Backlog:

1. FE: Add Common Services optgroup + â€œCreate New Serviceâ€¦â€ at top of Service select, with inline creation flow
2. BE: `POST /admin/catalog/services` (name, description?, pricingMode, fixedPricePence?) returning new Service
3. FE: After creation, re-fetch services and select the new one; keep custom price toggle available
4. BE: Optional weekend override for SLOT mode in admin flows
5. QA: Verify mobile modal buttons stay visible and no background bleed-through

Testing Notes:

- Web: `pnpm --filter booking-web build`
- API: `pnpm --filter booking-api build`
- Hard-refresh in browser after pulling to ensure bundles arenâ€™t serving cached `/catalog/tiers`

## 2025-10-31 â€“ Implementation #11 (Admin Engine Tiers API)

Summary:

- Added admin-only engine tier endpoint to support booking filters and manual booking form
- Updated frontend to consume secured engine tier data instead of public catalog route

Files Modified:

- apps/booking-api/src/admin/bookings.controller.ts (new GET /admin/engine-tiers returning tiers ordered by sort order)
- apps/booking-web/src/features/admin/bookings/AdminBookingsList.tsx (fetch engine tiers via admin endpoint)
- apps/booking-web/src/features/admin/bookings/ManualBookingForm.tsx (fetch engine tiers via admin endpoint)

Features Implemented:

- Admin engine tier endpoint returns id/name/maxCc/sortOrder for all tiers, ordered by sortOrder
- Upcoming bookings filters and manual booking form both load tiers via admin API, eliminating 404s against `/catalog/tiers`

Testing Notes:

- API: `pnpm --filter booking-api build`
- Web: `pnpm --filter booking-web build`
- Verified upcoming bookings filter dropdown and manual booking form load tiers without errors

Next Steps:

- Consider caching engine tiers client-side to reduce repeat requests
- Review other catalog dependencies for potential admin equivalents

## 2025-10-31 â€“ Implementation #10 (Phase 4 Enhancements)

Summary:

- Delivered full Phase 4 admin bookings tooling: advanced lists, booking detail actions, and calendar view
- Extended admin API with rich filters, sorting, detail retrieval, status/payments/notes mutations, and invoice helpers
- Upgraded frontend with shared list filters, detail page controls, FullCalendar integration, and UI polish fixes

Files Created:

- apps/booking-api/src/admin/dto/update-admin-booking.dto.ts (status/notes/payment DTOs)
- apps/booking-web/src/features/admin/bookings/AdminBookingsList.tsx (shared list with filters/sorting)
- apps/booking-web/src/features/admin/bookings/CalendarView.tsx (FullCalendar month/week/day view)
- apps/booking-web/src/features/admin/pages/AdminBookingDetailPage.tsx (admin booking detail UI)

Files Modified:

- apps/booking-api/src/admin/bookings.controller.ts (new filters; GET /:id; status/notes/payment/invoice endpoints)
- apps/booking-api/src/bookings/bookings.service.ts (admin detail + status/notes/payment updates; invoice issue/email; helpers)
- apps/booking-api/src/admin/admin.module.ts (import BookingsModule for new services)
- apps/booking-web/package.json (added @fullcalendar/core, react, daygrid, timegrid, interaction deps)
- apps/booking-web/src/features/admin/bookings/UpcomingBookings.tsx (proxy to shared list)
- apps/booking-web/src/features/admin/bookings/PastBookings.tsx (proxy to shared list)
- apps/booking-web/src/features/admin/pages/BookingsPage.tsx (refresh keys; calendar tab wiring)
- apps/booking-web/src/routes.tsx (registered /admin/bookings/:bookingId detail route)
- apps/booking-web/src/features/admin/CalendarManager.tsx (dark-theme heading contrast fix)
- apps/booking-web/src/features/admin/bookings/ManualBookingForm.tsx (overlay scroll/top positioning)

Features Implemented:

- Admin bookings list now supports date presets, multi-status filters, source/service/engine-tier filters, search (name/email/VRM/ID), and configurable sorting
- Admin booking detail page surfaces customer/vehicle/services/totals/documents and allows status updates, payment status updates, internal notes edits, invoice issue, and invoice email
- Backend exposes status/notes/payment endpoints plus invoice regeneration/email helpers; list endpoint returns service data and supports full filter set
- Calendar tab renders FullCalendar with color-coded events by source, lazy loads current range, supports drawer preview with quick link to full detail, and manual refresh

Bug Fixes / UX Tweaks:

- Calendar settings header now uses light text for readability on dark background
- Manual booking modal overlay aligns to top with scrollable body so header is always reachable

Testing Notes:

- API: `pnpm --filter booking-api build`
- Web: `pnpm --filter booking-web build`
- Verified admin list filters, detail updates (status/payment/notes), invoice issue/email flows, and calendar event drawer in local env

Next Steps:

- Consider pagination for admin list when more than 50 bookings
- Add calendar export/print options or drag-to-reschedule in future iteration
- Surface toast confirmations for invoice email failures if backend returns error

## 2025-10-31 â€” Implementation #8 (Phase 3 - Part 1)

Summary:

- Created BookingSourceBadge component for visual distinction (GREEN=ONLINE, BLUE=MANUAL)
- Updated UpcomingBookings list to display source badges
- Updated BookingDetailPage to show source badge
- Extended admin bookings API to return and filter by source
- Extended bookings.service.ts to return source field
- Created comprehensive ManualBookingForm component (7 sections: customer, vehicle, service, scheduling, additional info)

Files Created:

- apps/booking-web/src/features/admin/bookings/BookingSourceBadge.tsx (badge component)
- apps/booking-web/src/features/admin/bookings/ManualBookingForm.tsx (full manual booking form)

Files Modified:

- apps/booking-web/src/features/admin/bookings/UpcomingBookings.tsx (added source badge)
- apps/booking-web/src/pages/BookingDetailPage.tsx (added source badge + type)
- apps/booking-api/src/admin/bookings.controller.ts (added source filter + select source field)
- apps/booking-api/src/bookings/bookings.service.ts (return source field in getBookingForUser)

Features Implemented:

- Visual badges: "ONLINE BOOKING" (green), "LOCAL BOOKING" (blue)
- Booking source displayed in all booking lists and detail pages
- Source filter in API (source=ONLINE|MANUAL|ALL)
- Comprehensive manual booking form with:
  - Customer details (name, email, phone, address)
  - Vehicle details (registration, make, model, engine size)
  - Service selection with TIERED/FIXED pricing support
  - Custom price override option
  - Scheduling modes: SLOT (use availability) or CUSTOM (bypass checks)
  - Internal notes (staff-only)
  - Payment status (UNPAID/PAID/PARTIAL)
  - Real-time price calculation
  - Form validation

Remaining Work (Phase 3 - Part 2):

- Create backend DTO: create-manual-booking.dto.ts
- Implement POST /admin/bookings/manual endpoint
- Update bookings.service.ts with createManualBooking method
- Add "Create Manual Booking" button to BookingsPage
- Test end-to-end manual booking creation
- Add source filter dropdown to frontend

Testing Notes:

- Both builds pass: pnpm --filter booking-api build && pnpm --filter booking-web build
- BookingSourceBadge renders correctly with green/blue styling
- ManualBookingForm has all required sections and validation
- Form calculates prices correctly for FIXED and TIERED services
- Custom price override works
- Backend API returns source field for existing bookings

Next Session Tasks:

1. Create CreateManualBookingDto with validation
2. Implement POST /admin/bookings/manual controller method
3. Add createManualBooking to bookings.service.ts (skip holds, set source=MANUAL, status=CONFIRMED)
4. Wire up ManualBookingForm in BookingsPage
5. Add source filter dropdown to UpcomingBookings
6. Test complete flow: create manual booking â†’ see in list with blue badge

---

## 2025-10-31 â€” Implementation #7

Summary:

- Completed Phase 2: Prisma schema extensions for admin features
- Added BookingSource enum (ONLINE | MANUAL) for distinguishing booking types
- Extended BookingStatus enum with COMPLETED and NO_SHOW states
- Extended DocumentStatus enum with SENT, ACCEPTED, DECLINED, EXPIRED, PAID states
- Made ServicePrice.engineTierId nullable to support fixed pricing services
- Extended Booking model: added source (default ONLINE), internalNotes (staff-only), paymentStatus fields
- Extended Document model: added userId, payload (JSON snapshot), version, issuedAt, dueAt, createdBy for invoice lifecycle
- Extended User model: added deletedAt for soft delete support
- Created PasswordResetToken table for password reset flow
- Added database indexes on Booking: slotDate, status, userId, source for performance
- Fixed VehiclesService to handle nullable engineTierId in price lookups

Files Modified:

- apps/booking-api/prisma/schema.prisma (extended enums and models)
- apps/booking-api/prisma/migrations/20251031012455_admin_phase_2_schema_extensions/migration.sql (new migration)
- apps/booking-api/src/vehicles/vehicles.service.ts (filter null engineTierIds for fixed pricing)

Migration Details:

- Migration name: 20251031012455_admin_phase_2_schema_extensions
- All enum values added successfully
- All new fields and indexes created
- Foreign key constraints updated for nullable engineTierId
- Prisma Client regenerated successfully

Testing Notes:

- Migration applied successfully: `pnpm --filter booking-api exec prisma migrate dev`
- API build succeeds with new schema: `pnpm --filter booking-api build`
- Web build succeeds (no breaking changes): `pnpm --filter booking-web build`
- Database now ready for manual booking system (Phase 3)
- All existing bookings automatically get source=ONLINE default
- ServicePrice records with null engineTierId will support fixed pricing

---

## 2025-10-31 â€” Implementation #6

Summary:

- Fixed TypeScript build errors from Phase 1 implementation
- Fixed API controller method names: `lookupVrm` (not `lookupVehicle`), `updateDvlaApiKey` (not `setDvlaApiKey`)
- Fixed CompanySettings TypeScript errors: created separate `CompanyDataResponse` interface for API (allows nulls), kept `CompanyData` for form state (strings only), convert nulls to empty strings using `??` operator
- Verified both API and web apps build successfully (`pnpm --filter booking-api build` and `pnpm --filter booking-web build`)

Files Modified:

- apps/booking-api/src/admin/dvla-test.controller.ts (fixed lookupVrm call - pass object `{ vrm: dto.registration }`)
- apps/booking-api/src/admin/settings-endpoints.controller.ts (fixed updateDvlaApiKey call)
- apps/booking-web/src/features/admin/settings/CompanySettings.tsx (fixed null handling for form inputs)

Technical Details:

- Error 1: Changed `lookupVehicle(dto.registration)` â†’ `lookupVrm({ vrm: dto.registration })` because VehicleLookupDto expects `{ vrm: string }`
- Error 2: Changed `setDvlaApiKey(dto.apiKey)` â†’ `updateDvlaApiKey(dto.apiKey)` to match actual SettingsService method name
- Error 3: Split CompanySettings interfaces - `CompanyDataResponse` (API response with nulls) and `CompanyData` (form state with strings); all inputs now use string values with `??` fallback

Testing Notes:

- Both builds pass with no TypeScript errors
- CompanySettings form correctly handles null values from API by converting to empty strings
- DVLA test lookup works with corrected method call
- Company settings save/load works with corrected method name

---

## 2025-10-31 â€” Implementation #5

Summary:

- Completed Phase 1: Admin foundation with mobile bottom nav + desktop top nav
- Created AdminLayout with auth checks and 4 main routes (Overview, Bookings, Users, Settings)
- Implemented Overview page with dashboard stats (placeholders for Phase 4 enhancement)
- Implemented Users list page with search/sort/pagination + read-only display
- Reorganized Settings into 5 sub-tabs: Company, Catalog & Pricing, Calendar, Notifications, Integrations
- Created Company Settings tab with editable company info form
- Created Integrations Settings tab with DVLA key management + test lookup
- Implemented Bookings page with 3 sub-tabs: Upcoming (working), Past (placeholder), Calendar (placeholder)
- Created /admin/dev route (ADMIN-only) with basic health check
- Backend: Added 5 new API controllers (Users, Bookings, Settings endpoints, Dev Tools, DVLA test)
- Routes: /admin now redirects to /admin/overview; all tabs accessible via nav

Files Modified:

- apps/booking-web/src/features/admin/AdminLayout.tsx (new)
- apps/booking-web/src/features/admin/pages/OverviewPage.tsx (new)
- apps/booking-web/src/features/admin/pages/UsersPage.tsx (new)
- apps/booking-web/src/features/admin/pages/BookingsPage.tsx (new)
- apps/booking-web/src/features/admin/pages/SettingsPage.tsx (new)
- apps/booking-web/src/features/admin/pages/DevToolsPage.tsx (new)
- apps/booking-web/src/features/admin/bookings/UpcomingBookings.tsx (new)
- apps/booking-web/src/features/admin/bookings/PastBookings.tsx (new)
- apps/booking-web/src/features/admin/bookings/CalendarView.tsx (new)
- apps/booking-web/src/features/admin/settings/CompanySettings.tsx (new)
- apps/booking-web/src/features/admin/settings/IntegrationsSettings.tsx (new)
- apps/booking-web/src/routes.tsx (updated: new admin routes with AdminLayout)
- apps/booking-api/src/admin/users.controller.ts (new)
- apps/booking-api/src/admin/bookings.controller.ts (new)
- apps/booking-api/src/admin/settings-endpoints.controller.ts (new)
- apps/booking-api/src/admin/dev-tools.controller.ts (new)
- apps/booking-api/src/admin/dvla-test.controller.ts (new)
- apps/booking-api/src/admin/admin.module.ts (updated: added new controllers)

Testing Notes:

- Navigate to /admin â†’ should redirect to /admin/overview
- Check mobile view: sticky bottom nav with 4 icons visible
- Check desktop view: horizontal top nav with active tab highlighted
- Test /admin/users: search by name/email works, sorting by name/date/bookings works, pagination works
- Test /admin/bookings?tab=upcoming: should show upcoming bookings from today onwards
- Test /admin/settings: all 5 tabs accessible, Company tab form saves, Integrations tab shows DVLA status
- Test /admin/dev: only accessible to ADMIN role, shows health check
- Verify auth: logout button works, non-admin users redirected
- Browser back/forward: URL state syncs with displayed content

---

# CONTEXT #1: Implementation Plan & Assumptions (2025-10-31)

## Complete Implementation Plan

### Phase 1: Foundation & Navigation âœ… COMPLETED

**Goal:** New admin routes, mobile bottom nav, basic tab structure

**What was implemented:**

1. AdminLayout with mobile bottom nav + desktop top nav
2. Route structure: `/admin/overview`, `/admin/bookings`, `/admin/users`, `/admin/settings`
3. Overview page with dashboard stats (placeholders)
4. Bookings page with Upcoming (working), Past (placeholder), Calendar (placeholder)
5. Users list page with search/sort/pagination (read-only)
6. Settings reorganized into 5 tabs: Company, Catalog & Pricing, Calendar, Notifications, Integrations
7. `/admin/dev` route (ADMIN-only, hidden from main nav)
8. Backend APIs: Users list, Bookings list, Company settings, DVLA integration, Dev health check

**Files created/modified:**

- Frontend: 11 new page/component files + routes.tsx update
- Backend: 5 new controllers + admin.module.ts update

---

### Phase 2: Prisma Schema Extensions (NEXT - CRITICAL)

**Goal:** Database structure ready for all features, especially manual booking system

**Schema changes needed:**

```prisma
// 1. Add booking source tracking
enum BookingSource {
  ONLINE
  MANUAL
}

// 2. Extend Booking model
model Booking {
  // ... existing fields ...
  source         BookingSource @default(ONLINE)  // NEW
  internalNotes  String?                         // NEW - staff-only notes
  paymentStatus  String?                         // NEW - UNPAID|PAID|PARTIAL
  // ... rest of fields ...
}

// 3. Make ServicePrice.engineTierId nullable for FIXED pricing
model ServicePrice {
  engineTierId Int?  // Change from Int to Int?
}

// 4. Extend BookingStatus enum
enum BookingStatus {
  DRAFT
  HELD
  CONFIRMED
  COMPLETED    // NEW
  CANCELLED
  NO_SHOW      // NEW
}

// 5. Expand Document model for full invoice lifecycle
enum DocumentStatus {
  DRAFT
  SENT        // NEW
  ACCEPTED    // NEW
  DECLINED    // NEW
  EXPIRED     // NEW
  ISSUED
  PAID        // NEW
  VOID
}

model Document {
  // ... existing fields ...
  userId    Int?     // NEW - link to customer
  issuedAt  DateTime? // NEW
  dueAt     DateTime? // NEW
  payload   Json     // NEW - snapshot for immutable invoices
  version   Int      @default(1) // NEW
  createdBy String   // NEW - staff user who created it
}

// 6. User soft delete & password reset
model User {
  // ... existing fields ...
  deletedAt DateTime? // NEW - soft delete
  passwordResets PasswordResetToken[] // NEW relation
}

model PasswordResetToken {  // NEW table
  id        Int      @id @default(autoincrement())
  token     String   @unique
  userId    Int
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// 7. Add database indexes for performance
@@index([slotDate], map: "booking_slot_date")
@@index([status], map: "booking_status")
@@index([userId], map: "booking_user_id")
@@index([source], map: "booking_source")  // NEW - for filtering online vs manual
```

**Migration steps:**

1. Create Prisma migration file
2. Run migration against development database
3. Update Prisma client
4. Test with existing data (ensure no data loss)

---

### Phase 3: Manual Booking System (HIGH PRIORITY)

**Goal:** Staff can create local/manual bookings with flexible fields

**Frontend components:**

1. **"Create Manual Booking" button** in Bookings page header

2. **Manual Booking Form Modal/Page:**

   - **Customer Section:**

     - Name (required)
     - Email (optional, for invoice)
     - Phone (required)
     - Address fields (optional: addressLine1, city, postcode)

   - **Vehicle Section:**

     - Registration/VRM (required)
     - Make (optional, can auto-fill from DVLA or manual)
     - Model (optional)
     - Engine Size CC (optional, for tier selection)

   - **Service Section:**

     - Service multi-selector (from active catalog)
     - For each service:
       - If TIERED: tier selector based on engine size or manual selection
       - If FIXED: show fixed price
       - Allow price override checkbox â†’ manual price input

   - **Scheduling Section:**

     - Mode selector: "Use available slots" OR "Custom date/time"
     - If slot mode: date picker + available slots (like booking wizard)
     - If custom mode: date picker + time input (bypasses availability check)

   - **Additional Info:**

     - Internal notes (multi-line, staff-only)
     - Payment status dropdown: Unpaid (default) | Paid | Partial

   - **Preview:**

     - Calculated total (services + VAT)
     - Summary of entered data

   - **Actions:**
     - "Create Booking" button
     - "Cancel" button

3. **Visual Distinction:**
   - **ONLINE BOOKING** badge: green (`bg-green-500/20 text-green-300 border-green-500/30`)
   - **LOCAL BOOKING** badge: blue (`bg-blue-500/20 text-blue-300 border-blue-500/30`)
   - Show badges in all booking lists and detail pages

**Backend API:**

```
POST /admin/bookings/manual
Body: {
  customer: { name, email?, phone, address? }
  vehicle: { registration, make?, model?, engineSizeCc? }
  services: [{ serviceId, engineTierId?, priceOverridePence? }]
  scheduling: { mode: 'SLOT'|'CUSTOM', slotDate?, slotTime?, customDate? }
  internalNotes?: string
  paymentStatus?: 'UNPAID'|'PAID'|'PARTIAL'
}
```

**Service logic:**

- Create or link user record
- Create booking with `source: MANUAL`
- Skip hold system entirely
- For SLOT mode: validate availability (but allow override)
- For CUSTOM mode: bypass availability checks
- Calculate pricing from catalog (or use override)
- Set status to CONFIRMED immediately
- Return created booking

**Files to create:**

- `apps/booking-web/src/features/admin/bookings/ManualBookingForm.tsx`
- `apps/booking-web/src/features/admin/bookings/BookingSourceBadge.tsx`
- `apps/booking-api/src/admin/dto/create-manual-booking.dto.ts`
- Update `apps/booking-api/src/admin/bookings.controller.ts`
- Update `apps/booking-api/src/bookings/bookings.service.ts`

---

### Phase 4: Bookings Module Enhancement

**Goal:** Complete bookings management with all filters and actions

**Sub-tabs:**

- Upcoming: from=today, status!=CANCELLED|COMPLETED|NO_SHOW
- Past: to=today, status=COMPLETED|CANCELLED|NO_SHOW
- Calendar: FullCalendar month/week/day views

**Filters (Upcoming/Past):**

- Date range: Today | 7 days | 30 days | Custom
- Status: All | Draft | Held | Confirmed | Completed | Cancelled | No Show
- **Source: All | Online | Manual**
- Service: dropdown
- Engine tier: dropdown

**Search:**

- Customer name/email
- VRM
- Booking ID

**Sort:**

- Slot time (default)
- Created date
- Customer name

**Booking Detail Page:**

- Header: Booking ID + source badge
- Customer info
- Vehicle info
- Services with prices
- Timing: slot or custom datetime
- Status + history
- Payment status (for manual bookings)
- Internal notes (editable)
- Related documents
- Actions: Cancel, Mark Completed, Mark No-Show, Issue Invoice, Email Invoice

**Calendar View:**

- FullCalendar integration
- Month/week/day views
- Color-coded by source (green=online, blue=manual)
- Click event â†’ drawer with summary + "Open booking" button

---

### Phase 5: Users Module (Full)

**Goal:** Complete user management

**Users List:** (already done in Phase 1)

**User Detail Page:**

- Summary: registered date, last login, total bookings, total spent
- Contact info: editable form
- Actions: Send password reset, Deactivate (soft delete)
- Bookings table: all user bookings with source badges
- Documents table: all quotes/invoices

**API:**

```
GET /admin/users/:id
PATCH /admin/users/:id (contact info)
POST /admin/users/:id/send-password-reset
DELETE /admin/users/:id (soft delete)
```

---

### Phase 6: Catalog & Pricing (Fixed vs Tiered)

**Goal:** Support both pricing modes

**Service Form:**

- Code, Name, Description
- **Pricing Mode:** FIXED | TIERED
- If FIXED: single price input
- If TIERED: tier grid editor (Small/Medium/Large/Ex-Large)

**Integration:**

- Public pricing table reads ServicePrice
- Booking wizard reads ServicePrice
- Manual booking form reads ServicePrice

---

### Phase 7: Settings - Calendar (Dynamic Slots)

**Goal:** Unlimited default time slots

**UI:**

- Replace 3 fixed inputs with dynamic list
- Add slot: time picker â†’ add chip
- Remove slot: X button on chip
- Reorder: drag-and-drop or up/down arrows

**Storage:**

- `defaultSlots: string[]` in Settings.defaultSlotsJson

**Keep existing:**

- Exceptions management
- Extra slots management

---

### Phase 8: Settings - Other Sub-tabs

**Goal:** Organize settings into tabs (mostly done in Phase 1)

**Tabs:**

1. Company (done in Phase 1)
2. Catalog & Pricing (done - will enhance in Phase 6)
3. Calendar (done - will enhance in Phase 7)
4. Notifications (done in Phase 1)
5. Integrations (done in Phase 1)

---

### Phase 9: Documents & Invoicing

**Goal:** Generate, issue, email invoices

**From Booking Detail:**

- "Issue Invoice" â†’ generates PDF, assigns number, stores snapshot
- "Email Invoice" â†’ sends PDF to customer
- "Regenerate PDF" â†’ uses same snapshot

**From User Detail:**

- View all documents
- Same actions

**Customer Portal:**

- `/account/bookings/:id` shows invoice download if issued

**API:**

```
POST /admin/bookings/:id/issue-invoice
POST /admin/documents/:id/send
POST /admin/documents/:id/regenerate
```

---

### Phase 10: Dev Tools (Hidden)

**Goal:** Admin-only utilities

**Route:** `/admin/dev` (link from Settings footer)

**Tools:**

- Availability Probe: test availability for date/service/duration
- Holds Manager: create/release test holds
- DVLA Test Lookup: moved from Settings (currently in Integrations)
- Health Check: API version, DB, Redis (basic version done in Phase 1)
- Service Pings: test Redis, storage, email

**API:**

```
GET /admin/dev/availability?date&serviceId&duration
POST /admin/dev/holds
DELETE /admin/dev/holds/:id
POST /admin/dev/dvla-test (already exists)
GET /admin/dev/health (already exists)
GET /admin/dev/ping/:service (redis|storage|email)
```

---

## Assumptions Made (Phase 1 Implementation)

### Navigation & UX

1. **Mobile bottom nav** with 4 icons (Overview, Bookings, Users, Settings)
2. **Desktop horizontal top nav** (not sidebar)
3. `/admin` redirects to `/admin/overview`
4. **Heroicons-style SVG icons** (inline in components)
5. Active tab uses orange color (`brand-orange`)
6. Focus states use orange ring

### Users Page

1. **Columns:** Name, Email, Phone, Role, Registered, Last Login, # Bookings
2. **Default sort:** Recent registrations first (createdAt desc)
3. **Search:** Name + Email (case-insensitive)
4. **Click row:** Do nothing for now (wait for Phase 5 user detail page)
5. **Phone display:** Show mobile OR landline (whichever exists)
6. **Pagination:** 20 users per page

### Settings Organization

1. **In-page tabs** using URL query params (`?tab=company`)
2. **Company tab:** All fields editable (name, address, phone, VAT, timezone, logo, bank holiday region)
3. **Catalog & Pricing:** Move existing CatalogManager as-is (enhance in Phase 6)
4. **Calendar:** Move existing CalendarManager as-is (enhance in Phase 7)
5. **Notifications:** Move existing RecipientsManager as-is
6. **Integrations:** DVLA key + test lookup (move test to Dev Tools in Phase 10)

### Dev Tools

1. **Link location:** Settings page footer ("Developer Tools" small text)
2. **Access:** ADMIN-only (not STAFF)
3. **Phase 1 implementation:** Placeholder page with basic health check
4. **Future features:** Placeholders with "Coming in Phase 10" messages

### Overview Dashboard

1. **Simple stats:** Today/Week/Month bookings, Total Users
2. **Phase 1 implementation:** Mock/placeholder data (0 for all)
3. **Future enhancement:** Real stats from API in Phase 4
4. **Quick actions:** Links to Bookings, Users, Catalog
5. **System status:** API/DB/Redis indicators (basic)

### Bookings Page

1. **Sub-tabs:** Upcoming (working), Past (placeholder), Calendar (placeholder)
2. **Upcoming definition:** From today onwards, any status except CANCELLED
3. **Past definition:** To today, status in (COMPLETED, CANCELLED, NO_SHOW) - Phase 4
4. **URL sync:** `?tab=upcoming|past|calendar`

### Visual Design

1. **Dark theme:** slate-950 background, slate-900 cards
2. **Orange accents:** brand-orange for buttons, active states
3. **Rounded corners:** rounded-3xl for cards, rounded-lg for inputs
4. **Border colors:** slate-700 for borders
5. **Text colors:** white for headings, slate-300 for body, slate-400 for labels

### API Design

1. **Pagination:** Default 20 items per page (users), 50 per page (bookings)
2. **Search:** Case-insensitive, multiple fields with OR
3. **Sort:** Default descending for dates, ascending for names
4. **Filters:** Query params (e.g., `?from=2025-01-01&status=CONFIRMED`)
5. **Response format:** `{ items, total, page, pageSize, pages }`

### Auth & Security

1. **Route guards:** STAFF + ADMIN can access /admin/\*
2. **Dev Tools:** ADMIN only (not STAFF)
3. **Auth check:** On every page load via `/auth/me`
4. **Redirect:** Non-authenticated â†’ `/login`, Non-authorized â†’ forbidden message
5. **Logout:** Clear token + redirect to `/login`

---

This session continues from a previous conversation. Read this entire brief and then:

Create or update a repo-root file named admin-context.md and save this whole prompt verbatim inside it.

From now on, after every implementation step, append a new entry at the top of admin-context.md in this format:

## {YYYY-MM-DD} â€” Implementation #{N}

Summary:

- What changed (1â€“5 bullets)

Files Modified:

- path/to/fileA
- path/to/fileB

Testing Notes:

- Manual checks to verify

Increment #{N} each time (1, 2, 3â€¦). Also continue appending to CONTEXT.md and docs/CHANGELOG.md.

Important for Claude: Any mention of apply_patch is for Codex only. You can ignore that and use your normal file operations for create/edit.

Primary Goals

Ship a clean, mobile-friendly Admin with 4 main tabs: Overview, Bookings, Users, Settings.

Bookings sub-tabs: Upcoming, Past, Calendar, each with filters/search/sort; booking detail page with actions (cancel/complete, Issue Invoice, Email Invoice).

Users: list + detail page (summary, contact edit, Send password reset, bookings, documents).

Settings sub-tabs: Company, Catalog & Pricing, Calendar, Notifications, Integrations.

Keep existing Notification recipients block.

Catalog & Pricing supports Fixed and Tiered (Engine CC) prices, reflected immediately in:
a) public "Fixed Price Menu" table, and
b) booking wizard price.

Calendar: dynamic defaultSlots list (unlimited), plus existing Exceptions and Extra Slots.

Integrations: store DVLA key here (move Test Lookup to Dev Tools).

Hidden Dev Tools (/admin/dev, ADMIN-only): availability probe, holds create/release, DVLA Test Lookup, health/version, Redis/storage/email ping.

Keep the established dark theme + orange accents.

Manage Documents (Quotes/Invoices) inside Booking and User detail pages (no separate top tab yet).

Keep changes minimal and well-documented.

Non-Negotiable Rules (adapted for Claude)

The apply_patch requirement is ignored (Codex-only). Use normal file edits.

After every change, append entries to:

admin-context.md (top-insert with date + Implementation #),

CONTEXT.md,

docs/CHANGELOG.md
including Summary, Files Modified, Testing Notes.

Keep diffs minimal; preserve style/formatting; don't expose secrets.

Reference files with repo-relative paths.

Avoid long-running commands unless explicitly asked.

Tech Overview (current)

Monorepo with pnpm workspaces.

Web: React + Vite + TypeScript + Tailwind in apps/booking-web.

API: NestJS + Prisma + Redis in apps/booking-api.

Routing in apps/booking-web/src/routes.tsx with createBrowserRouter (bootstrapped in src/main.tsx).

Theme: dark slate backgrounds, orange accents, rounded-full buttons, focus rings.

Keep (already present)

Admin dark restyle of Catalog, Calendar, Recipients, Settings UIs.

Public pages + booking flow themed.

Notification recipients block.

Calendar Exceptions/Extra Slot logic works; default slots currently limited to 3 inputs but wired.

DVLA key storage + Test Lookup UI (we'll relocate the Test to Dev Tools).

New / Updated Features

1. Admin Navigation & Mobile UX

Primary tabs as routes: /admin/overview, /admin/bookings, /admin/users, /admin/settings.

Mobile: sticky bottom nav for the 4 primaries; desktop: top/side nav.

Sub-tabs (in-page, URL-synced):

Bookings: Upcoming (from=now), Past (to=now, statuses COMPLETED|CANCELLED|NO_SHOW), Calendar (FullCalendar).

Settings: Company, Catalog & Pricing, Calendar, Notifications, Integrations.

Hidden route: /admin/dev (ADMIN only; link from Settings footer).

2. Bookings Module

Upcoming/Past lists: filters (date quick picks Today/7d/30d/Custom; status; service; engine tier); search (user name/email, VRM, booking ID); sort (start time, created, customer).

Calendar: month/week/day; click â†’ drawer summary + "Open booking".

Detail page: customer + vehicle + service/tier + times, internal notes, related documents; actions: cancel, mark completed, Issue Invoice, Email Invoice.

3. Users Module

List: search + sort (name, registered, last booking); columns: Name, Email, Phone, Registered, Last booking, #Bookings.

Detail: summary (registered, last login, totals), edit contact, Send password reset (token email), deactivate/delete (soft), bookings table, documents table.

4. Settings â€” Catalog & Pricing (Fixed vs Tiered)

Support PriceType = FIXED | TIERED and TierDimension = ENGINE_CC.

Add Service form: Code, Name, Description, Price Type (and TierDimension when Tiered).

Price editor:

FIXED â†’ single input.

TIERED â†’ grid of inputs across existing EngineTier rows (Small/Medium/Large/Ex-Large).

Booking wizard + public price table both read from the same ServicePrice records.

5. Settings â€” Calendar (Default Slots)

Replace 3 fixed inputs with a dynamic list of time chips (defaultSlots: string[]).

Add/remove/reorder; persist; availability generator uses this list.

Keep Exceptions/Extra Slots unchanged.

6. Settings â€” Integrations

Keep DVLA key storage here.

Move DVLA Test Lookup to Dev Tools.

7. Dev Tools (hidden)

Availability probe, Holds create/release, DVLA test lookup, health/version, Redis/storage/email pings.

ADMIN-only; not in primary nav.

8. Documents (Quotes/Invoices)

Manage from Booking/User detail pages (Generate Quote, Convert â†’ Invoice, Issue (number + snapshot + PDF), Regenerate PDF (same snapshot), Email PDF).

In customer portal /account/bookings/:id, show issued invoice download.

Suggested Schema & API (additions)

Prisma (API):

enum PriceType { FIXED TIERED }
enum TierDimension { ENGINE_CC }

model Service {
id String @id @default(cuid())
code String @unique
name String
description String?
priceType PriceType @default(TIERED)
tierDim TierDimension?
isActive Boolean @default(true)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
prices ServicePrice[]
}

model EngineTier {
id String @id @default(cuid())
name String
maxCc Int?
sort Int @default(0)
active Boolean @default(true)
prices ServicePrice[]
}

model ServicePrice {
id String @id @default(cuid())
serviceId String
engineTierId String? // null if FIXED
amountPence Int
currency String @default("GBP")
active Boolean @default(true)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
service Service @relation(fields: [serviceId], references: [id])
engineTier EngineTier? @relation(fields: [engineTierId], references: [id])
}

enum DocumentType { QUOTE INVOICE CREDIT_NOTE }
enum DocumentStatus { DRAFT SENT ACCEPTED DECLINED EXPIRED ISSUED PAID VOID }

model Document {
id String @id @default(cuid())
type DocumentType
status DocumentStatus
number String @unique
userId String?
bookingId String?
currency String @default("GBP")
subtotal Decimal @db.Decimal(10,2)
taxTotal Decimal @db.Decimal(10,2)
total Decimal @db.Decimal(10,2)
issuedAt DateTime?
dueAt DateTime?
validUntil DateTime?
pdfUrl String?
payload Json
version Int @default(1)
createdBy String
updatedBy String?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}

Admin API (NestJS) â€” guarded by STAFF/ADMIN (Dev = ADMIN only):

Bookings
GET /admin/bookings?from&to&status&serviceId&q&page&pageSize
GET /admin/bookings/calendar?from&to
GET /admin/bookings/:id Â· PUT /admin/bookings/:id (status, notes)
POST /admin/bookings/:id/issue-invoice â†’ create Document snapshot + assign number + generate PDF
POST /admin/documents/:id/send â†’ email PDF

Users
GET /admin/users?search&sort&order&page&pageSize
GET /admin/users/:id Â· PUT /admin/users/:id (contact)
POST /admin/users/:id/send-password-reset
DELETE /admin/users/:id (soft/anonymise)

Settings
GET/PUT /admin/settings/company
GET/PUT /admin/settings/calendar (persist defaultSlots: string[])
GET/POST/DELETE /admin/settings/notifications
GET/PUT /admin/settings/integrations/dvla-key

Catalog & Pricing
GET /admin/services (with prices)
POST /admin/services
PUT /admin/services/:id
POST /admin/services/:id/prices (create/update fixed or tier prices)

Dev Tools (ADMIN)
GET /admin/dev/availability?date&serviceId&duration
POST /admin/dev/holds Â· DELETE /admin/dev/holds/:id
POST /admin/dev/dvla-test (VRM)
GET /admin/dev/health and GET /admin/dev/ping/redis|storage|email

Indexes:

Booking.startsAt, Booking.status, Booking.userId

User.createdAt, User.email (and support name search)

Acceptance Criteria

4 main admin tabs; mobile bottom nav works.

Bookings: Upcoming/Past/Calendar with filters/search/sort; detail page includes actions; Issue Invoice generates/stores PDF and appears under booking and user.

Users: list + detail; edit contact; send password reset; see bookings/documents.

Catalog & Pricing: Fixed + Tiered; changes reflect immediately in public price table and booking wizard.

Calendar: dynamic defaultSlots; Exceptions/Extra Slots still work.

Dev Tools exists and is ADMIN-only; DVLA Test Lookup moved there.

Notification recipients remains under Settings â†’ Notifications.

What to Do Now (Claude)

Create or update admin-context.md (repo root) with this full brief.

Analyze the repo (web + API) and report:

What's already reusable (components, endpoints).

Required Prisma migrations vs. current schema.

Endpoints to add/adjust; any code to refactor/remove.

Output a concise plan with phases and begin Phase 1:

Tabs/routes + mobile bottom nav

Bookings Upcoming (read-only list with filters/search)

Users list (read-only)

Settings â†’ Notifications (keep existing UI; ensure endpoints wired)

After each atomic change, prepend an "Implementation #N" entry to admin-context.md (with date), and append to CONTEXT.md + docs/CHANGELOG.md.

Testing Notes (global)

Contrast/focus states OK; aria-current="page" on active nav.

Sub-tab/filter state reflected in URL; browser Back/Forward behave.

Booking wizard + public price table read the same ServicePrice data.

Issued invoices are immutable (regen uses same snapshot).

Dev Tools inaccessible to non-ADMIN.

## 2025-10-31 â€“ Implementation #9 (Phase 3 - Part 2)

Summary:

- Completed end-to-end Manual Booking flow wiring (backend + frontend)
- Created DTO and admin POST endpoint for manual bookings
- Implemented createManualBooking in service with pricing, slot checks, document issuing
- Wired BookingsPage to open ManualBookingForm and refresh list on success
- Added source filter dropdown to UpcomingBookings
- Fixed build and runtime DI issues uncovered during testing

Files Created:

- apps/booking-api/src/admin/dto/create-manual-booking.dto.ts (DTO with validation for manual booking)

Files Modified:

- apps/booking-api/src/admin/bookings.controller.ts (added POST /admin/bookings/manual)
- apps/booking-api/src/bookings/bookings.service.ts (added createManualBooking + bcrypt import)
- apps/booking-api/src/bookings/bookings.module.ts (exported BookingsService)
- apps/booking-api/src/admin/admin.module.ts (imported BookingsModule so DI works in admin controllers)
- apps/booking-web/src/features/admin/pages/BookingsPage.tsx (added "+ Create Manual Booking" button + modal + refresh key)
- apps/booking-web/src/features/admin/bookings/UpcomingBookings.tsx (added source filter param + UI dropdown)

Features Implemented:

- DTO: CreateManualBookingDto composed of nested customer, vehicle, services[], scheduling blocks
- Admin endpoint: POST /admin/bookings/manual -> calls BookingsService.createManualBooking
- Service logic (createManualBooking):
  - Parses scheduling: SLOT (checks unique slot) or CUSTOM (bypasses slot check)
  - Validates service availability and pricing; supports FIXED, TIERED, and price override
  - Resolves engine tier metadata to EngineTierCode when applicable
  - Finds or creates user: if no user exists, creates a guest account with a secure random bcrypt password and marks emailVerified=true
  - Creates Booking with source=MANUAL and status=CONFIRMED; attaches BookingService row
  - Calculates totals, issues invoice and quote, finalizes documents with summaries
  - Best-effort email sending (non-fatal on failure)
- Frontend wiring:
  - BookingsPage opens ManualBookingForm modal, refreshes Upcoming list on success
  - ManualBookingForm posts to /admin/bookings/manual with the DTO shape
  - UpcomingBookings supports source filter (ALL | ONLINE | MANUAL) and displays source badge

Debugging & Build Fixes:

- Removed non-existent `isGuest` field from user creation (initial TS2353)
- Added bcrypt-based random `passwordHash` on guest user creation to satisfy Prisma UserCreateInput (fixed TS2322)
- Exported BookingsService from BookingsModule and imported BookingsModule into AdminModule to resolve runtime DI error:
  - Error: "Nest can't resolve dependencies of the AdminBookingsController (PrismaService, ?). Please make sure that the argument BookingsService at index [1] is available in the AdminModule context."
  - Resolution: `BookingsModule` now exports `BookingsService`; `AdminModule` imports `BookingsModule`
- Verified builds:
  - API: `pnpm --filter booking-api build` â†’ success
  - Web: `pnpm --filter booking-web build` â†’ success

Testing Notes:

- From the admin UI, creating a manual booking succeeds and appears in Upcoming with the blue MANUAL badge
- Source filter dropdown correctly filters Upcoming list by ALL/ONLINE/MANUAL
- SLOT mode prevents double-booking for the same `slotDate` + `slotTime`; CUSTOM mode bypasses the slot check
- API returns booking id, reference, status, slotDate, slotTime for confirmation UI

Next Session Ideas:

- Add audit trail (createdBy staff user) to manual bookings
- Expose paymentStatus updates and internalNotes editing in admin UI
- Extend manual booking to support multiple services per booking




## 2025-10-31 - Implementation #17 (Deleted Tab Toasts + Detail Restore Type Fix)

Summary:
- Fixed build error in `AdminBookingDetailPage.tsx` when checking deleted state by widening `PaymentStatus` to include `'DELETED'` (admin-only soft-delete marker)
- Added success/error toasts and a clean reload trigger for Deleted tab actions (Restore, Delete Permanently)

Files Modified:
- apps/booking-web/src/features/admin/pages/AdminBookingDetailPage.tsx (PaymentStatus type includes 'DELETED'; UI already shows Restore/Delete with toasts and navigation)
- apps/booking-web/src/features/admin/bookings/AdminBookingsList.tsx (import `react-hot-toast`; toasts on restore/hard-delete; `reloadKey` state to refresh list)

Behavior:
- Deleted tab per-row actions now show success toasts and refresh the list without hacks or page flicker
- Booking detail “Danger Zone” continues to show Restore when deleted, with success toast and navigation back to Upcoming after restore

Build/Verify:
- API: `pnpm --filter booking-api build` → OK
- Web: `pnpm --filter booking-web build` → OK
## 2025-10-31 - Implementation #18 (Admin Edit: Customer, Vehicle, Service Price)

Summary:
- Added admin endpoints to update booking customer details, vehicle details, and per-service line price
- Updated Booking Detail page to allow inline editing of customer info, vehicle info, and service price with instant DB updates and toasts

API Files Modified:
- apps/booking-api/src/admin/dto/update-admin-booking.dto.ts (added UpdateCustomerDto, UpdateVehicleDto, UpdateServiceLineDto)
- apps/booking-api/src/admin/bookings.controller.ts (PATCH /:id/customer, PATCH /:id/vehicle, PATCH /:id/services/:serviceLineId)
- apps/booking-api/src/bookings/bookings.service.ts (adminUpdateCustomer, adminUpdateVehicle, adminUpdateServiceLine)

Web Files Modified:
- apps/booking-web/src/features/admin/pages/AdminBookingDetailPage.tsx (inline edit UI for customer/vehicle; editable price input per service line; PATCH calls; success/error toasts)

Behavior:
- Customer: Click Edit → update name/email/phones/company/address fields → Save writes to DB and refreshes view
- Vehicle: Click Edit → update registration/make/model/engine cc → Save writes to DB and refreshes view
- Services: Price input per service row with Save button → updates unitPricePence and refreshes totals

Build/Verify:
- API: `pnpm --filter booking-api build` → OK
- Web: `pnpm --filter booking-web build` → OK
## 2025-10-31 - Implementation #19 (Phase 5: Users Module – Full)

Summary:
- Completed Admin Users module: user detail page, contact editing, admin actions, bookings and documents views
- Added admin API for user detail, contact patch, password reset initiation, and soft delete
- Made Users list items clickable to open the user detail

API Files Created/Modified:
- apps/booking-api/src/admin/dto/update-admin-user.dto.ts (UpdateAdminUserDto)
- apps/booking-api/src/admin/users.controller.ts (GET /admin/users/:id, PATCH /admin/users/:id, POST /admin/users/:id/send-password-reset, DELETE /admin/users/:id)

Web Files Created/Modified:
- apps/booking-web/src/features/admin/pages/AdminUserDetailPage.tsx (user detail page: summary, editable contact, actions, bookings, documents)
- apps/booking-web/src/routes.tsx (route /admin/users/:userId)
- apps/booking-web/src/features/admin/pages/UsersPage.tsx (link rows/cards to detail page)

Behavior:
- Summary shows registered, last login, total bookings, total spent (sum of invoice totals)
- Contact info editable; Save patches user and refreshes
- Actions: Send password reset (creates reset token), Deactivate (soft delete)
- Bookings list with source badges, totals, and links to admin booking detail
- Documents list of quotes/invoices with totals and PDF links

Build/Verify:
- API: `pnpm --filter booking-api build` → OK
- Web: `pnpm --filter booking-web build` → OK
## 2025-10-31 - Implementation #20 (Phase 6: Catalog & Pricing – Fixed vs Tiered)

Summary:
- Extended Admin Catalog to support both pricing modes per service and inline tier price editing
- Service create form now includes Pricing Mode (FIXED | TIERED); if FIXED, enter a single price
- For TIERED services, per-service tier grid editor shows Small/Medium/Large/Ex‑Large prices with quick update

API: (already supported in existing catalog endpoints)
- Services: `POST /admin/catalog/services` accepts `pricingMode` and `fixedPricePence`; `PATCH /admin/catalog/services/:id` updates `pricingMode` and `fixedPricePence`
- Prices: `PUT /admin/catalog/prices` upserts per‑tier `amountPence`
- Public: `GET /catalog` returns `services`, `engineTiers`, and `prices` for UI consumption

Web Files Modified:
- apps/booking-web/src/features/admin/CatalogManager.tsx (service form pricing mode + fixed input; per‑service tier grid editor; actions to set mode and fixed price)

Integration:
- Public pricing table (`PricingTable`) reads `catalog.prices` → no changes needed
- Booking wizard (`useCatalogSummary`, `ServicesStep`, `PriceStep`) continues to read `catalog` → reflects new prices automatically
- Manual booking form uses `/catalog/prices` + `/admin/engine-tiers` → tier/fixed prices apply as configured

Build/Verify:
- Web: `pnpm --filter booking-web build` → OK
## 2025-10-31 - Implementation #21 (Phase 7: Calendar – Dynamic Default Slots)

Summary:
- Added UI on the Calendar tab to manage weekday default time slots as a dynamic list
- Supports add (time picker → chip), remove (X on chip), and reorder (up/down arrows)
- Persists to `Settings.defaultSlotsJson` via PATCH `/admin/settings`

Files Modified:
- apps/booking-web/src/features/admin/CalendarManager.tsx (new Default time slots section; add/remove/reorder; saves to settings)

Behavior:
- Existing Exception dates and Extra slots panels remain unchanged
- Default time slots apply Monday–Friday (weekends still driven by exceptions/extra slots)
- Example: with defaults 09:00, 10:00, 11:00 you can add 12:00 to permanently offer four weekday slots

Storage/API:
- Reads current defaults from `GET /admin/settings` (`defaultSlotsJson`)
- Saves changes with `PATCH /admin/settings { defaultSlots: string[] }`

Build/Verify:
- Web: `pnpm --filter booking-web build` → OK
## 2025-10-31 - Implementation #22 (Phase 7 Extension: Separate Weekend Default Slots)

Summary:
- Added support for permanent Saturday/Sunday default time slots in Settings → Calendar
- Availability now uses: Mon–Fri → `defaultSlotsJson`, Sat → `saturdaySlotsJson`, Sun → `sundaySlotsJson`

Backend:
- prisma/schema: added `saturdaySlotsJson` and `sundaySlotsJson` to `Settings`
- migration: apps/booking-api/prisma/migrations/20251031191500_add_weekend_slots/migration.sql (adds JSONB columns with [] default)
- DTO: apps/booking-api/src/settings/dto/update-settings.dto.ts (new fields `saturdaySlots`, `sundaySlots` with HH:mm validation)
- Service: apps/booking-api/src/settings/settings.service.ts (persist weekend slots; cache-safe)
- Availability: apps/booking-api/src/availability/availability.service.ts (weekend-aware slot selection)

Frontend:
- apps/booking-web/src/features/admin/CalendarManager.tsx
  - New dynamic lists: “Saturday slots”, “Sunday slots” (add via time input, remove via X, reorder via ↑/↓)
  - Existing “Default time slots (Mon–Fri)” retained
  - Persists via PATCH `/admin/settings` with `saturdaySlots` / `sundaySlots`

Notes:
- Existing Exception dates and Extra slots panels unchanged
- DB migration required: run `pnpm --filter booking-api prisma migrate deploy` or equivalent to apply new columns

Build/Verify:
- API: `pnpm --filter booking-api build` → OK
- Web: `pnpm --filter booking-web build` → OK
## 2025-10-31 - Implementation #23 (Catalog Visibility + Ordering for Wizard/Table; UI polish)

Summary:
- Added per‑service visibility flags and ordering to control what appears in the Booking Wizard and the public Pricing Table
- Removed the standalone “Service prices” list; prices are edited inside each service card (tier buttons or fixed price)
- Fixed tier chip overflow (e.g., “Medium”) in admin Service cards

Backend (Prisma + API):
- Service model: `showInWizard` (bool), `showInPricingTable` (bool), `sortOrder` (int)
- Migrations:
  - apps/booking-api/prisma/migrations/20251031193600_service_wizard_flags/migration.sql
- DTOs:
  - apps/booking-api/src/catalog/dto/create-service.dto.ts (new fields)
  - apps/booking-api/src/catalog/dto/update-service.dto.ts (new fields)
- Service logic:
  - apps/booking-api/src/catalog/catalog.service.ts
    - Orders services by `sortOrder,name` (typed via `as any` until migrations are applied)
    - Exposes `showInWizard`, `showInPricingTable`, `sortOrder` in Catalog summary
    - Update supports toggling these fields

Web (Admin):
- apps/booking-web/src/features/admin/CatalogManager.tsx
  - Added buttons on each service: “Add to Wizard”/“In Wizard”, “Add to Pricing Table”/“In Pricing Table”
  - Added per‑service Order controls (↑/↓) and label showing current order
  - Removed the old “Service prices” panel; tier prices edited inline within service card
  - Added `whitespace-nowrap` to tier price chips to prevent label overflow (Medium)

Web (Public):
- apps/booking-web/src/components/PricingTable.tsx
  - Filters services to `showInPricingTable === true`
  - Sorts by `sortOrder`
- apps/booking-web/src/features/booking/types.ts
  - Extended Catalog service type with `showInWizard`, `showInPricingTable`, `sortOrder`

Notes / How to use:
- Booking Wizard currently shows the 3 built‑in packages (Service 1/2/3). Keep using those for now.
- To curate the Pricing Table, toggle “In Pricing Table” on the desired services (e.g., Service 1/2/3), then use ↑/↓ to reorder.
- If later you want to expose additional services in the wizard, we can switch the wizard to read `showInWizard` instead of the fixed list.

Build/Verify:
- API: `pnpm --filter booking-api build` → OK (apply migrations in your DB)
- Web: `pnpm --filter booking-web build` → OK
## 2025-10-31 - Implementation #24 (Catalog UI polish + Edit Descriptions)

Summary:
- Fixed tier price chip overflow in admin Catalog by widening grid responsiveness and tightening chip layout (no more text escaping)
- Added “Edit description” action per service to patch the service description directly from the card

Files Modified:
- apps/booking-web/src/features/admin/CatalogManager.tsx
  - Tier prices grid: `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
  - Tier chips: `inline-flex`, reduced padding, `whitespace-nowrap`
  - New `Edit description` button (PATCH update-service)

Notes:
- The code suffix format `(MANUAL-<timestamp>-<SLUG>)` identifies manually-created codes. The numeric component is a timestamp used for uniqueness, not the DB id. The DB id is auto-incremented and you never need to enter it manually.

Build/Verify:
- Web: `pnpm --filter booking-web build` → OK
## 2025-10-31 - Implementation #25 (Admin UX Contrast + Overview Metrics + Date Range Bug)

Summary:
- Increased text contrast for Settings subheaders (Catalog, Notifications) to ensure readability on dark panels
- Wired Admin Overview to real counts using existing endpoints
- Fixed Upcoming “Today” range to only show today’s bookings (no future spillover)

Files Modified:
- apps/booking-web/src/features/admin/CatalogManager.tsx (header colors -> white/slate-400)
- apps/booking-web/src/features/admin/RecipientsManager.tsx (header colors -> white/slate-400)
- apps/booking-web/src/features/admin/bookings/AdminBookingsList.tsx (Upcoming Today sets from=to=today)
- apps/booking-web/src/features/admin/pages/OverviewPage.tsx (fetch stats via /admin/bookings and /admin/users; recent bookings feed)

Behavior:
- Catalog/Notifications headings/subtext are clearly visible and consistent across Admin
- Overview shows live counts: Today, This Week, This Month, Total Users, plus recent bookings
- Upcoming date preset “Today” now lists only bookings on the current date (UTC-normalized)

Verify:
- Web: `pnpm --filter booking-web build` → OK
- Open /admin/overview to see live stats; switch to Bookings → Upcoming → Date Range: Today to confirm results
## CONTEXT #3: Financial & Invoicing Plan

Goals

- Add an Admin "Financial" tab to manage invoices (draft -> issue -> email) for booking-linked and standalone work.
- Keep the existing booking-issued invoice flow working; add the ability to draft and edit before issuing.
- Brand invoices with company info and logo; support non-VAT (hide VAT rows) with a future-proof path to VAT per line.

Numbering & VAT

- Numbering: continue Sequence.INVOICE -> INV-YYYY-####.
- VAT: Settings.vatRegistered (default false). When false, hide VAT column and totals entirely. Lines still support a VAT rate for future needs. Totals displayed as Net + VAT + Gross when VAT is on.

Company/Branding (Settings)

- Add fields (editable any time): companyRegNumber, companyWebsite, invoicePaymentNotes, bankName, bankSortCode, bankAccountNumber, bankIban, bankSwift. Show only values that are filled; optionally include show/hide toggles.
- Address policy: show the trading address (11 Cunliffe Dr, Kettering NN16 8LD) on invoices; registered office can be shown in a small footer if needed later.
- Logo upload: POST /admin/settings/logo (multipart) stores file in /uploads and sets Settings.logoUrl; API serves at /static/uploads/...

API (Admin)

- Documents (type=INVOICE):
  - GET /admin/documents?type=INVOICE&... -> list
  - GET /admin/documents/:id -> detail
  - POST /admin/documents -> create Draft (standalone or optional bookingId/userId)
  - PATCH /admin/documents/:id -> update Draft (customer, lines, terms/due date)
  - POST /admin/documents/:id/issue -> assign number, lock snapshot, generate PDF, status=ISSUED
  - POST /admin/documents/:id/send -> email PDF to customer
  - POST /admin/documents/:id/regenerate -> regenerate PDF from locked snapshot
  - PATCH /admin/documents/:id/status -> mark PAID or VOID (optional paymentDate)
- Settings: extend PATCH /admin/settings with new fields; POST /admin/settings/logo for branding assets.
- Keep existing booking aliases:
  - POST /admin/bookings/:id/documents/invoice (quick issue)
  - POST /admin/bookings/:id/documents/invoice/email

PDF & Email

- PDF: header with logo, business (name, trading address, phone, website, company reg; VAT number only if registered). Items table (description/qty/unit/line VAT when VAT on). Totals: Net/VAT/Gross when VAT on; Net/Gross only otherwise. Footer with terms/payment notes and page numbering.
- Email: dedicated invoice template (professional tone). Subject "Invoice INV-YYYY-#### from A1 Service Expert Ltd". Attach PDF; short summary in body.

Admin Web – Financial Tab

- List view: filters (date, status, linked booking, search), columns (Number/Draft, Customer, Linked booking, Net/VAT/Gross, Status, Created/Issued). Row actions: Open, Issue/Email/Regenerate, Mark Paid/Void.
- Draft editor: business block (read-only from Settings, link to edit), customer (name/email/address; optional link booking), line items (description/qty/unit price/VAT%), terms (due date – default 14 days, editable; payment notes shown only when due date present). Buttons: Save Draft, Issue Invoice. Optional Clone Draft.
- Issued view: Email Invoice, Regenerate PDF, Mark Paid/Void; open PDF.

Integrations in existing screens

- Booking Detail: "Create draft" (prefilled) + keep "Issue/Email/Regenerate". List invoices for this booking.
- User Detail: documents table -> open draft to edit; actions on issued invoices.
- Customer Portal: /account/bookings/:id shows "Download invoice" when issued (PDF link).

Behavioral rules

- After Issue: payload snapshot locked; no editing. Use Regenerate to rebuild the PDF only. For changes, create a new draft (replacement) or add a credit note later (future phase).
- Due date default 14 days; editable per invoice. When Paid: show "PAID on (date)", suppress due date messaging.
- Payment notes default: "Please pay by bank transfer within 14 days." (shown only when a due date is present).

Minimal Reporting (Phase 9)

- Rely on list view filters and totals; optional export later.

Rollout Steps

1) Backend: settings fields + logo upload + new invoice endpoints + PDF template respecting VAT/trading address.
2) Web: Financial tab list -> draft editor -> integrate booking/user pages.
3) QA: issue/email/regenerate from booking and standalone; logo; VAT on/off; due date/paid badge.
4) Customer Portal: verify invoice download shows when issued.
## 2025-11-01 - Implementation #26 (Phase 9 – Financials: Admin Invoices MVP)

Summary:
- Fixed logo upload placeholders; invoices can include uploaded logo in PDFs
- Added Admin Invoices endpoints (draft → issue/email/regenerate/status)
- Upgraded PDF generator to support logo, company block, VAT on/off, and itemized lines
- Added Financial tab (list + draft editor) and Booking Detail “Create invoice draft”

Files Created:
- apps/booking-api/src/admin/documents.controller.ts (admin invoices CRUD/actions)
- apps/booking-web/src/features/admin/pages/FinancialPage.tsx (Financial tab)
- apps/booking-web/src/features/admin/financial/InvoicesList.tsx (list + New Draft)
- apps/booking-web/src/features/admin/financial/InvoiceEditor.tsx (draft editor)

Files Modified:
- apps/booking-api/src/admin/admin.module.ts (import DocumentsModule; register AdminDocumentsController)
- apps/booking-api/src/settings/admin-settings.controller.ts (POST /admin/settings/logo fixed)
- apps/booking-api/src/documents/documents.service.ts (PDF branding, VAT, items table, logo)
- apps/booking-api/src/email/email.service.ts (sendInvoiceEmail helper)
- apps/booking-web/src/routes.tsx (add /admin/financial)
- apps/booking-web/src/features/admin/AdminLayout.tsx (Financial nav link desktop/mobile)
- apps/booking-web/src/features/admin/pages/AdminBookingDetailPage.tsx (Create invoice draft action)

Behavior:
- Admin → Financial shows invoices list with New Draft; drafts editable in a simple editor (customer, items, due date, notes)
- Issue assigns INV-YYYY-####, generates PDF (logo if uploaded), applies VAT rules (hidden when not registered)
- Email sends a professional minimal email with PDF link (uses SMTP if configured; logs otherwise)
- Booking detail now offers “Create invoice draft” (prefills from services) and keeps quick “Issue/Email invoice” actions

Notes / Next:
- List filters (date/status/search) and per-row Issue/Email/Regenerate can be expanded next
- User detail linking to invoice editor and richer email template are follow‑ups
- Settings UI for new financial fields can be surfaced in Settings > Company/Financial section
## 2025-11-01 - Implementation #27 (Financial UX + Reliability)

Summary:
- Fixed PDF generation path (no more 500 on Issue) and allowed draft regeneration for preview
- Added delete for draft invoices; added Cancel/Preview/Delete buttons in editor
- Enhanced invoices list actions: Issue (for drafts), PDF, Mark Paid, Void, Delete (draft)

Files Modified:
- apps/booking-api/src/documents/documents.service.ts (use dirname for output folder)
- apps/booking-api/src/admin/documents.controller.ts (regenerate for drafts; issue flow; send; delete draft)
- apps/booking-web/src/features/admin/financial/InvoiceEditor.tsx (Cancel, Preview, Delete, Print via PDF open)
- apps/booking-web/src/features/admin/financial/InvoicesList.tsx (row Issue/Void/Delete; improved actions)

Behavior:
- Draft editor: Cancel returns to list; Preview generates a PDF (opens in new tab); Delete removes draft
- Issue now succeeds and the PDF link opens correctly; “Mark Paid” updates status immediately after refresh

Notes / Next:
- Add filters (status/date/search) and totals strip; bulk actions & export CSV
- Quotes tab, Payments, Products/Services, simple Reports, and Settings (numbering/email templates) to be implemented next
## 2025-11-01 - Implementation #28 (PDF Auth + Preview)

Summary:
- Fixed pdfkit import (CommonJS) to resolve constructor error
- Added authenticated blob download helper and switched Admin PDF/Preview to use it (no more 401/SPA 404)
- Totals panel in draft editor now shows Live total while typing; Preview auto-saves first

Files Modified:
- apps/booking-api/src/documents/documents.service.ts (CommonJS import for PDFKit)
- apps/booking-web/src/lib/api.ts (apiGetBlob)
- apps/booking-web/src/features/admin/financial/InvoicesList.tsx (PDF button → auth blob open)
- apps/booking-web/src/features/admin/financial/InvoiceEditor.tsx (preview uses auth blob; live totals)

Behavior:
- Preview/Draft PDF opens in a new tab under Admin session without 401
- Issued PDF buttons open via authenticated blob even when pdfUrl is pending://…
- Editor totals show Live vs Saved values; Preview runs Save before generating
## 2025-11-01 - Implementation #29 (Invoice Template v1 – Handlebars + Puppeteer)

Summary:
- Added HTML template renderer (Handlebars) and PDF output via Puppeteer for clean A4 invoices
- New template files: `invoice.hbs` + `invoice.css` (print-friendly, brand accent, totals box, page numbers)
- DocumentsService now prefers the template engine and falls back to legacy pdfkit if anything fails

Files Added:
- apps/booking-api/src/pdf/pdf.service.ts (Handlebars + Puppeteer renderer; helpers registered)
- apps/booking-api/src/pdf/templates/invoice.hbs
- apps/booking-api/src/pdf/templates/invoice.css

Files Modified:
- apps/booking-api/src/documents/documents.module.ts (provide PdfService)
- apps/booking-api/src/documents/documents.service.ts (build data contract; call PdfService; fallback retained)
- apps/booking-api/package.json (deps: handlebars, puppeteer)

How to preview
- From Admin → Financial: Draft → Save → Preview (auto-saves and opens the new PDF)
- Issued invoices also open with the new template

Notes / TODOs
- Company contact fields (email/website) can be surfaced from Settings and mapped into template
- If Chromium download is blocked, Puppeteer may fail and the service falls back to the old pdfkit layout; allow first run to fetch Chromium
## 2025-11-01 - Implementation #30 (Invoice Receipt Upgrade)

Summary:
- Added receipt fields to Document (paidAt, paymentMethod)
- Admin: Mark Paid now prompts for method and regenerates the PDF as a receipt
- PDF data now passes paid flags; template shows PAID RECEIPT badge and payment details

Files Modified:
- apps/booking-api/prisma/schema.prisma (Document.paidAt, Document.paymentMethod)
- apps/booking-api/src/admin/documents.controller.ts (list selections include paidAt/paymentMethod; PATCH /status accepts paymentMethod and regenerates)
- apps/booking-api/src/pdf/templates/invoice.hbs (receipt sections and PAID stamp)
- apps/booking-api/src/pdf/templates/invoice.css (paid-stamp class)
- apps/booking-api/src/documents/documents.module.ts (PdfService already wired)
- apps/booking-api/src/documents/documents.service.ts (template data includes paid info; VAT enabled)
- apps/booking-web/src/features/admin/financial/InvoicesList.tsx (Mark Paid prompt, status shows Paid (Method))

DB Migration:
- Run: pnpm --filter booking-api prisma:migrate (name suggestion: add_paid_fields_to_document)

How to test:
- Admin → Financial → Draft: Issue → row actions → Mark Paid (choose method) → “PDF” button shows receipt with badge and payment details.
## 2025-11-01 - Implementation #31 (Financial: Invoices Filters, Bulk, CSV + Quotes Tab)

Summary:
- Invoices list now supports filters (status/date range/search), bulk mark paid, and CSV export
- Added Quotes tab with Convert to Invoice action; issued invoice is generated and PDF created

API:
- GET /admin/documents?type=INVOICE&status=&from=&to=&q= (enhanced filters)
- GET /admin/documents/csv?… (CSV export)
- PATCH /admin/documents/bulk-status (ids[], status, paymentMethod)
- POST /admin/documents/:id/convert-to-invoice (QUOTE → INVOICE, issues immediately and generates PDF)

Web:
- apps/booking-web/src/features/admin/pages/FinancialPage.tsx (sub-tabs: Invoices, Quotes; keeps editor route)
- apps/booking-web/src/features/admin/financial/InvoicesList.tsx (filters UI, CSV export, row checkboxes, bulk mark paid)
- apps/booking-web/src/features/admin/financial/QuotesList.tsx (list + Convert to Invoice)

How to use:
- Financial → Invoices: set filters, click Export CSV; select rows and “Mark Paid (selected)” to bulk-update
- Financial → Quotes: Convert to Invoice; you’ll be returned to Invoices tab

Next:
- Add Payments and Products/Services tabs; add Reports + totals strip; replace prompt with a proper payment modal
## 2025-11-01 - Implementation #32 (Financial: Payment Modal)

Summary:
- Replaced prompt with a proper modal to mark invoices paid (single + bulk)
- Method buttons (Cash, Card, Bank Transfer, Other) + optional payment date; sends to API and regenerates receipts

Files Added:
- apps/booking-web/src/features/admin/financial/PaymentModal.tsx

Files Modified:
- apps/booking-web/src/features/admin/financial/InvoicesList.tsx (integrate modal for row/bulk)

Behavior:
- Click “Mark Paid” on a row, or “Mark Paid (selected)” after choosing checkboxes → modal appears → choose method/date → Confirm
- API regenerates the PDF, so Invoice becomes a receipt with payment details
## 2025-11-01 - Implementation #33 (Financial: Totals Strip + Reports Tab)

Summary:
- Added totals strip on Invoices tab (Draft, Issued this month, Unpaid total, Paid this month)
- Added Reports tab with Monthly totals, VAT summary, Outstanding list and Top services

API:
- GET /admin/documents/stats (totals strip)
- GET /admin/documents/reports/invoices (monthly series)
- GET /admin/documents/reports/vat (VAT total)
- GET /admin/documents/reports/outstanding (unpaid ISSUED docs)
- GET /admin/documents/reports/top-services (aggregate payload lines)

Web:
- apps/booking-web/src/features/admin/financial/ReportsView.tsx (Reports + TotalsStrip)
- apps/booking-web/src/features/admin/pages/FinancialPage.tsx (integrate Reports tab and totals strip on Invoices)

Usage:
- Financial → Invoices shows the totals strip above the list
- Financial → Reports shows monthly totals (table), VAT total (YTD), outstanding and top services
## 2025-11-01 - Implementation #34 (Financial: Void Modal + Reason)

Summary:
- Added Void modal with optional reason (single/bulk)
- API stores void reason in document.payload.history and sets status to VOID

Files Added:
- apps/booking-web/src/features/admin/financial/VoidModal.tsx

Files Modified:
- apps/booking-web/src/features/admin/financial/InvoicesList.tsx (integrate modal)
- apps/booking-api/src/admin/documents.controller.ts (accept reason and persist in payload history)
## 2025-11-01 - Implementation #35 (Financial: Settings Tab – Numbering, VAT, Branding)

Summary:
- Added Financial → Settings sub-tab to manage: VAT registered + default rate, invoice number format, brand primary color, and PDF logo upload
- Persisted new fields in Settings (invoiceNumberFormat, brandPrimaryColor) and wired into PDF + numbering

API:
- Prisma Settings: add `invoiceNumberFormat String?`, `brandPrimaryColor String?`
- PATCH /admin/settings: accepts invoiceNumberFormat, brandPrimaryColor
- DocumentsService: number formatting uses Settings.invoiceNumberFormat (tokens {{YYYY}}, {{0000}}); PDF branding uses Settings.brandPrimaryColor

Web:
- apps/booking-web/src/features/admin/financial/FinancialSettings.tsx (UI to edit + upload logo)
- apps/booking-web/src/features/admin/pages/FinancialPage.tsx (adds Settings tab)

Notes:
- Number format applies to new invoices; existing numbers are unchanged
- If Puppeteer is unavailable, PDF falls back to legacy layout although branding color still attempts to pass through
## 2025-11-01 - Implementation #36 (Financial: Reusable Items)

Summary:
- Added Products/Services sub-tab to manage reusable invoice items stored in Settings
- Invoice editor now has “Add from items…” to insert a saved item as a line

API:
- Prisma Settings: add `invoiceItemsJson Json?`
- PATCH /admin/settings accepts `invoiceItems: {code?, description, defaultQty?, unitPricePence, vatPercent?}[]`

Web:
- apps/booking-web/src/features/admin/financial/FinancialItems.tsx (CRUD UI)
- apps/booking-web/src/features/admin/financial/InvoiceEditor.tsx (Add from items)
- apps/booking-web/src/features/admin/pages/FinancialPage.tsx (Products tab)

## 2025-11-01 - Implementation #37 (Reports: Date Range + CSV)

Summary:
- Reports tab now has From/To filters and CSV export buttons for: Monthly totals, Outstanding, Top services

Files Modified:
- apps/booking-web/src/features/admin/financial/ReportsView.tsx (filters + export)
- apps/booking-api/src/admin/documents.controller.ts (reports endpoints already accept from/to)

## 2025-11-01 - Implementation #38 (Invoice Template Polish)

Summary:
- Tighter spacing, repeating header rows on page breaks, brand color applied via CSS var

Files Modified:
- apps/booking-api/src/pdf/templates/invoice.css (font-size 11pt, thead display: table-header-group, page-break-inside: avoid)
- apps/booking-api/src/pdf/templates/invoice.hbs (brand CSS var already applied)

## 2025-11-01 - Implementation #39 (Financial PDFs: Preview Stabilization & Absolute URLs)

Summary:
- Fixed Preview 500s/404s by stabilizing Puppeteer launch, template path resolution, and file serving paths
- Switched pdfUrl to absolute (API origin) so the web app does not open PDFs on the Vite dev port
- Added file-existence checks and clearer error logs to speed up diagnosis

API Changes:
- apps/booking-api/src/pdf/pdf.service.ts
  - Added type-only import for `Browser` to fix TS2503
  - Robust Chrome resolution: `PUPPETEER_EXECUTABLE_PATH` → `puppeteer.executablePath()` → common Windows paths; logs chosen path
  - Template/CSS resolution now tries dev and dist locations (avoids duplicated `apps/booking-api/...` in paths)
  - After `page.pdf(...)` verify file with `fs.stat` and log: "PDF generated at: <path>"
- apps/booking-api/src/admin/documents.controller.ts
  - `POST /admin/documents/:id/regenerate` wrapped in try/catch; logs controller error and responds with `Preview failed: <message>`
- apps/booking-api/src/documents/documents.service.ts
  - `buildPublicUrl()` now uses `DOCUMENTS_BASE_URL` (or defaults to `http://localhost:3000`) to return absolute links
  - After generation, verifies file existence before updating `pdfUrl`
- apps/booking-api/src/files/files.controller.ts
  - Download now searches both `storage/invoices` and `storage/documents`, in both current working dir and repo root
  - Returns first existing file; otherwise responds with JSON 404 showing the attempted path

Issues & Troubleshooting (chronological):
- TS2503: Cannot find namespace 'puppeteer' → fixed by adding `import type { Browser } from 'puppeteer'` and updating the variable type
- 500 on Preview with ENOENT for template: `...apps\\booking-api\\apps\\booking-api\\src\\pdf\\templates\\invoice.hbs` → fixed by a resolver that tries multiple candidate paths (dev/dist)
- 404 when opening PDF at `http://localhost:5173/files/invoices/...` → cause: relative `pdfUrl` opened on web origin; fix: absolute `pdfUrl` using API base
- 404 on `http://localhost:3000/files/invoices/...` while file existed under `storage/documents` → route originally only checked `storage/invoices`; fix: FilesController now checks both `invoices` and `documents`
- Validation: API log now shows `Puppeteer executable: <path>` and `PDF generated at: storage\documents\DRF-...pdf`; browser opens the absolute link on port 3000

Environment Notes:
- Install Chrome for Puppeteer if needed: `pnpm --filter booking-api exec npx puppeteer browsers install chrome`
- Or set `PUPPETEER_EXECUTABLE_PATH` to your Chrome binary and restart the API
- Recommended: set `DOCUMENTS_BASE_URL=http://localhost:3000` in `apps/booking-api/.env`
- Optional (to keep paths neat): set `DOCUMENTS_STORAGE_DIR=storage/invoices` so generation and serving use the same folder name

Files Modified:
- apps/booking-api/src/pdf/pdf.service.ts
- apps/booking-api/src/admin/documents.controller.ts
- apps/booking-api/src/documents/documents.service.ts
- apps/booking-api/src/files/files.controller.ts

Testing Notes:
- API: `pnpm --filter booking-api build` and restart
- In Admin → Financial → open a draft with at least one line → Save → Preview
- Expected: new tab opens to `http://localhost:3000/files/invoices/<NUMBER>.pdf` and the API logs show the chosen Chrome path and the generated PDF path
