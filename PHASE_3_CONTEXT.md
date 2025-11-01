# Phase 3 Context: Manual Booking System Implementation

## Current Status (2025-10-31)

### Completed Phases
- ✅ **Phase 1**: Admin foundation with navigation, users list, bookings list, settings, dev tools
- ✅ **Phase 2**: Prisma schema extensions for manual bookings and enhanced features

### Phase 2 Summary (Just Completed)

**Database Schema Changes Applied:**
1. New `BookingSource` enum: ONLINE | MANUAL
2. Extended `BookingStatus` enum: + COMPLETED, NO_SHOW
3. Extended `DocumentStatus` enum: + SENT, ACCEPTED, DECLINED, EXPIRED, PAID
4. `Booking` model additions:
   - `source BookingSource @default(ONLINE)` - distinguish booking types
   - `internalNotes String?` - staff-only notes
   - `paymentStatus String?` - UNPAID | PAID | PARTIAL
   - Indexes: slotDate, status, userId, source
5. `ServicePrice.engineTierId` now nullable (supports fixed pricing)
6. `Document` model extensions: userId, payload (JSON), version, issuedAt, dueAt, createdBy
7. `User.deletedAt` added (soft delete)
8. New `PasswordResetToken` table

**Migration:** `20251031012455_admin_phase_2_schema_extensions`
**Status:** ✅ Applied successfully, both builds pass

---

## Phase 3: Manual Booking System (HIGH PRIORITY)

### Goal
Enable staff/admin to create local/manual bookings directly in the admin panel with flexible fields and clear visual distinction from online bookings.

### User Requirements
> "i also forgot that i want to add for the bookings a manual/local booking system for the staff/admin to be able to add bookings and those to be stored in the DB but to be clearly visible that those are local bookings and the online bookings are clearly visible as ONLINE BOOKING(maybe with a green text for the online booking)"

### Visual Design
- **ONLINE BOOKING** badge: `bg-green-500/20 text-green-300 border-green-500/30`
- **LOCAL BOOKING** badge: `bg-blue-500/20 text-blue-300 border-blue-500/30`
- Show badges in all booking lists and detail pages

---

## Implementation Plan - Phase 3

### 3.1 - BookingSourceBadge Component
**Priority:** HIGH
**Effort:** Small

Create reusable badge component for displaying booking source.

**Files to Create:**
- `apps/booking-web/src/features/admin/bookings/BookingSourceBadge.tsx`

**Component Props:**
```typescript
interface BookingSourceBadgeProps {
  source: 'ONLINE' | 'MANUAL';
  className?: string;
}
```

**Styling:**
- Online: green background/text/border with 20% opacity
- Manual: blue background/text/border with 20% opacity
- Small pill shape with rounded corners

---

### 3.2 - Update Bookings Lists with Badge
**Priority:** HIGH
**Effort:** Small

Add BookingSourceBadge to existing booking lists.

**Files to Modify:**
- `apps/booking-web/src/features/admin/bookings/UpcomingBookings.tsx`
- `apps/booking-web/src/features/admin/bookings/PastBookings.tsx` (when implemented)
- `apps/booking-web/src/pages/BookingDetailPage.tsx`

**Implementation:**
- Import BookingSourceBadge
- Display next to booking ID or customer name
- Ensure badge is visible on both desktop and mobile views

---

### 3.3 - Manual Booking Form Modal
**Priority:** HIGH
**Effort:** Large

Create comprehensive form for staff to add manual bookings.

**File to Create:**
- `apps/booking-web/src/features/admin/bookings/ManualBookingForm.tsx`

**Form Sections:**

#### 1. Customer Section
- Name (required)
- Email (optional, for invoice)
- Phone (required)
- Address fields (optional): addressLine1, city, postcode
- County (optional)

#### 2. Vehicle Section
- Registration/VRM (required)
- Make (optional, can auto-fill from DVLA or manual)
- Model (optional)
- Engine Size CC (optional, for tier selection)

#### 3. Service Section
- Service multi-selector (from active catalog)
- For each service:
  - If TIERED: tier selector based on engine size or manual selection
  - If FIXED: show fixed price
  - Allow price override checkbox → manual price input

#### 4. Scheduling Section
- **Mode selector:** "Use available slots" OR "Custom date/time"
- If slot mode: date picker + available slots (like booking wizard)
- If custom mode: date picker + time input (bypasses availability check)

#### 5. Additional Info
- Internal notes (multi-line, staff-only)
- Payment status dropdown: Unpaid (default) | Paid | Partial

#### 6. Preview
- Calculated total (services + VAT)
- Summary of entered data

#### 7. Actions
- "Create Booking" button (primary)
- "Cancel" button

**UI/UX:**
- Dark theme matching admin design (slate-900/800 backgrounds)
- Modal or full-page form (mobile-friendly)
- Validation: required fields, email format, VRM format
- Loading states during DVLA lookup
- Success/error toasts

---

### 3.4 - Backend API for Manual Booking
**Priority:** HIGH
**Effort:** Medium

Create dedicated endpoint for staff to create manual bookings.

**Files to Create:**
- `apps/booking-api/src/admin/dto/create-manual-booking.dto.ts`

**Files to Modify:**
- `apps/booking-api/src/admin/bookings.controller.ts`
- `apps/booking-api/src/bookings/bookings.service.ts`

**API Endpoint:**
```
POST /admin/bookings/manual
Authorization: Bearer {jwt} (STAFF or ADMIN)
```

**Request Body:**
```typescript
{
  customer: {
    name: string;
    email?: string;
    phone: string;
    addressLine1?: string;
    city?: string;
    postcode?: string;
    county?: string;
  };
  vehicle: {
    registration: string;
    make?: string;
    model?: string;
    engineSizeCc?: number;
  };
  services: [
    {
      serviceId: number;
      engineTierId?: number;
      priceOverridePence?: number;
    }
  ];
  scheduling: {
    mode: 'SLOT' | 'CUSTOM';
    slotDate?: string;  // ISO date
    slotTime?: string;  // HH:MM
    customDate?: string; // ISO datetime
  };
  internalNotes?: string;
  paymentStatus?: 'UNPAID' | 'PAID' | 'PARTIAL';
}
```

**Service Logic:**
1. Create or link user record (by email, or create guest user)
2. Create booking with `source: MANUAL`
3. Skip hold system entirely (manual bookings bypass holds)
4. For SLOT mode: validate availability (but allow override)
5. For CUSTOM mode: bypass availability checks completely
6. Calculate pricing from catalog (or use override)
7. Set status to CONFIRMED immediately (no draft state)
8. Return created booking with ID

**Validation:**
- Ensure slot not already taken (for SLOT mode)
- Validate service IDs exist
- Validate tier IDs if provided
- Ensure staff user has STAFF or ADMIN role

---

### 3.5 - Add "Create Manual Booking" Button
**Priority:** HIGH
**Effort:** Small

Add button to Bookings page to open manual booking form.

**File to Modify:**
- `apps/booking-web/src/features/admin/pages/BookingsPage.tsx`

**Implementation:**
- Add "+ Create Manual Booking" button in page header
- Opens ManualBookingForm modal/page
- Only visible to STAFF/ADMIN users
- Prominent placement (top-right of page)

---

### 3.6 - Filter Bookings by Source
**Priority:** Medium
**Effort:** Small

Add filter to booking lists to show only online or manual bookings.

**Files to Modify:**
- `apps/booking-web/src/features/admin/bookings/UpcomingBookings.tsx`
- `apps/booking-api/src/admin/bookings.controller.ts` (add `source` query param)

**Implementation:**
- Add "Source" dropdown filter: All | Online | Manual
- Update API query to filter by source
- Sync filter state to URL query params

---

## Technical Considerations

### 1. Customer/User Linking
- If email provided: check if user exists, link to existing or create new
- If no email: create anonymous user record with phone as identifier
- Use `User.notes` field to mark as "Manual booking customer"

### 2. Availability Bypass
- SLOT mode: validate slot availability, show warning if taken, allow override
- CUSTOM mode: completely bypass availability checks, allow any date/time

### 3. Price Calculation
- Fetch prices from `ServicePrice` table
- If TIERED: use engineTierId to get price
- If FIXED: use `Service.fixedPricePence`
- Allow manual override (store in `BookingService.unitPricePence`)

### 4. Payment Tracking
- Store payment status in `Booking.paymentStatus`
- Display in booking detail page
- Allow editing payment status after creation

### 5. Internal Notes
- Store in `Booking.internalNotes`
- Never expose to customer-facing pages
- Display in booking detail page for staff only

---

## Testing Checklist

### Manual Booking Creation
- [ ] Create booking with all required fields
- [ ] Create booking with optional fields (email, address)
- [ ] Create booking with DVLA vehicle lookup
- [ ] Create booking with manual vehicle entry
- [ ] Create booking with SLOT mode (uses availability)
- [ ] Create booking with CUSTOM mode (bypasses availability)
- [ ] Create booking with single service
- [ ] Create booking with multiple services
- [ ] Create booking with TIERED pricing
- [ ] Create booking with FIXED pricing
- [ ] Create booking with price override
- [ ] Set payment status to Paid/Unpaid/Partial
- [ ] Add internal notes

### Visual Distinction
- [ ] Manual bookings show blue "LOCAL BOOKING" badge
- [ ] Online bookings show green "ONLINE BOOKING" badge
- [ ] Badges visible in Upcoming bookings list
- [ ] Badges visible in Past bookings list
- [ ] Badge visible in booking detail page
- [ ] Badges readable on both light/dark backgrounds

### Filtering
- [ ] Filter bookings by "All" shows both online and manual
- [ ] Filter by "Online" shows only online bookings
- [ ] Filter by "Manual" shows only manual bookings
- [ ] Filter state persists in URL query params
- [ ] Browser back/forward works with filters

### API Security
- [ ] Only STAFF/ADMIN can create manual bookings
- [ ] CUSTOMER users get 403 Forbidden
- [ ] Unauthenticated requests get 401 Unauthorized

### Data Integrity
- [ ] Manual bookings get `source=MANUAL` in database
- [ ] Existing online bookings retain `source=ONLINE`
- [ ] Internal notes only visible to staff
- [ ] Payment status persists correctly
- [ ] Customer email links to existing user if found

---

## Files Modified Summary

### New Files (Phase 3)
1. `apps/booking-web/src/features/admin/bookings/BookingSourceBadge.tsx`
2. `apps/booking-web/src/features/admin/bookings/ManualBookingForm.tsx`
3. `apps/booking-api/src/admin/dto/create-manual-booking.dto.ts`

### Modified Files (Phase 3)
1. `apps/booking-web/src/features/admin/bookings/UpcomingBookings.tsx`
2. `apps/booking-web/src/features/admin/bookings/PastBookings.tsx`
3. `apps/booking-web/src/features/admin/pages/BookingsPage.tsx`
4. `apps/booking-web/src/pages/BookingDetailPage.tsx`
5. `apps/booking-api/src/admin/bookings.controller.ts`
6. `apps/booking-api/src/bookings/bookings.service.ts`

---

## Next Session Instructions

1. **Start with BookingSourceBadge component** (small, quick win)
2. **Update existing booking lists** to show badges
3. **Build ManualBookingForm** (largest piece)
4. **Implement backend API** for manual booking creation
5. **Add "Create Manual Booking" button** to Bookings page
6. **Test end-to-end** manual booking flow

---

## Key Questions to Answer Before Starting

1. Should manual bookings require staff approval, or go straight to CONFIRMED?
   - **Recommendation:** Go straight to CONFIRMED (staff is creating it, implies approval)

2. Should manual bookings send confirmation emails to customers?
   - **Recommendation:** Yes, if email is provided (same as online bookings)

3. Should manual bookings create holds in Redis?
   - **Recommendation:** No, bypass hold system entirely (staff is booking directly)

4. Can staff edit existing bookings to change source (online → manual)?
   - **Recommendation:** No, source should be immutable (reflects how booking was created)

5. Should there be a limit on how far in advance staff can create manual bookings?
   - **Recommendation:** No limit (staff should have full flexibility)

---

## Related Documentation
- [admin-context.md](./admin-context.md) - Full admin implementation log
- [CONTEXT.md](./CONTEXT.md) - Project-wide context
- [docs/CHANGELOG.md](./docs/CHANGELOG.md) - All changes log

---

**Phase 2 Complete** | **Ready for Phase 3** | **Database Schema Ready** ✅
