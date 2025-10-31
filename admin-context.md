# Admin Context

This session continues from a previous conversation. Read this entire brief and then:

Create or update a repo-root file named admin-context.md and save this whole prompt verbatim inside it.

From now on, after every implementation step, append a new entry at the top of admin-context.md in this format:

## {YYYY-MM-DD} — Implementation #{N}
Summary:
- What changed (1–5 bullets)

Files Modified:
- path/to/fileA
- path/to/fileB

Testing Notes:
- Manual checks to verify



Increment #{N} each time (1, 2, 3…). Also continue appending to CONTEXT.md and docs/CHANGELOG.md.

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
1) Admin Navigation & Mobile UX

Primary tabs as routes: /admin/overview, /admin/bookings, /admin/users, /admin/settings.

Mobile: sticky bottom nav for the 4 primaries; desktop: top/side nav.

Sub-tabs (in-page, URL-synced):

Bookings: Upcoming (from=now), Past (to=now, statuses COMPLETED|CANCELLED|NO_SHOW), Calendar (FullCalendar).

Settings: Company, Catalog & Pricing, Calendar, Notifications, Integrations.

Hidden route: /admin/dev (ADMIN only; link from Settings footer).

2) Bookings Module

Upcoming/Past lists: filters (date quick picks Today/7d/30d/Custom; status; service; engine tier); search (user name/email, VRM, booking ID); sort (start time, created, customer).

Calendar: month/week/day; click → drawer summary + "Open booking".

Detail page: customer + vehicle + service/tier + times, internal notes, related documents; actions: cancel, mark completed, Issue Invoice, Email Invoice.

3) Users Module

List: search + sort (name, registered, last booking); columns: Name, Email, Phone, Registered, Last booking, #Bookings.

Detail: summary (registered, last login, totals), edit contact, Send password reset (token email), deactivate/delete (soft), bookings table, documents table.

4) Settings — Catalog & Pricing (Fixed vs Tiered)

Support PriceType = FIXED | TIERED and TierDimension = ENGINE_CC.

Add Service form: Code, Name, Description, Price Type (and TierDimension when Tiered).

Price editor:

FIXED → single input.

TIERED → grid of inputs across existing EngineTier rows (Small/Medium/Large/Ex-Large).

Booking wizard + public price table both read from the same ServicePrice records.

5) Settings — Calendar (Default Slots)

Replace 3 fixed inputs with a dynamic list of time chips (defaultSlots: string[]).

Add/remove/reorder; persist; availability generator uses this list.

Keep Exceptions/Extra Slots unchanged.

6) Settings — Integrations

Keep DVLA key storage here.

Move DVLA Test Lookup to Dev Tools.

7) Dev Tools (hidden)

Availability probe, Holds create/release, DVLA test lookup, health/version, Redis/storage/email pings.

ADMIN-only; not in primary nav.

8) Documents (Quotes/Invoices)

Manage from Booking/User detail pages (Generate Quote, Convert → Invoice, Issue (number + snapshot + PDF), Regenerate PDF (same snapshot), Email PDF).

In customer portal /account/bookings/:id, show issued invoice download.

Suggested Schema & API (additions)

Prisma (API):

enum PriceType { FIXED TIERED }
enum TierDimension { ENGINE_CC }

model Service {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  description String?
  priceType   PriceType   @default(TIERED)
  tierDim     TierDimension?
  isActive    Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  prices      ServicePrice[]
}

model EngineTier {
  id       String  @id @default(cuid())
  name     String
  maxCc    Int?
  sort     Int     @default(0)
  active   Boolean @default(true)
  prices   ServicePrice[]
}

model ServicePrice {
  id           String  @id @default(cuid())
  serviceId    String
  engineTierId String?   // null if FIXED
  amountPence  Int
  currency     String  @default("GBP")
  active       Boolean @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  service      Service     @relation(fields: [serviceId], references: [id])
  engineTier   EngineTier? @relation(fields: [engineTierId], references: [id])
}

enum DocumentType { QUOTE INVOICE CREDIT_NOTE }
enum DocumentStatus { DRAFT SENT ACCEPTED DECLINED EXPIRED ISSUED PAID VOID }

model Document {
  id        String   @id @default(cuid())
  type      DocumentType
  status    DocumentStatus
  number    String   @unique
  userId    String?
  bookingId String?
  currency  String   @default("GBP")
  subtotal  Decimal  @db.Decimal(10,2)
  taxTotal  Decimal  @db.Decimal(10,2)
  total     Decimal  @db.Decimal(10,2)
  issuedAt  DateTime?
  dueAt     DateTime?
  validUntil DateTime?
  pdfUrl    String?
  payload   Json
  version   Int      @default(1)
  createdBy String
  updatedBy String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}


Admin API (NestJS) — guarded by STAFF/ADMIN (Dev = ADMIN only):

Bookings
GET /admin/bookings?from&to&status&serviceId&q&page&pageSize
GET /admin/bookings/calendar?from&to
GET /admin/bookings/:id · PUT /admin/bookings/:id (status, notes)
POST /admin/bookings/:id/issue-invoice → create Document snapshot + assign number + generate PDF
POST /admin/documents/:id/send → email PDF

Users
GET /admin/users?search&sort&order&page&pageSize
GET /admin/users/:id · PUT /admin/users/:id (contact)
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
POST /admin/dev/holds · DELETE /admin/dev/holds/:id
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

Notification recipients remains under Settings → Notifications.

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

Settings → Notifications (keep existing UI; ensure endpoints wired)

After each atomic change, prepend an "Implementation #N" entry to admin-context.md (with date), and append to CONTEXT.md + docs/CHANGELOG.md.

Testing Notes (global)

Contrast/focus states OK; aria-current="page" on active nav.

Sub-tab/filter state reflected in URL; browser Back/Forward behave.

Booking wizard + public price table read the same ServicePrice data.

Issued invoices are immutable (regen uses same snapshot).

Dev Tools inaccessible to non-ADMIN.
