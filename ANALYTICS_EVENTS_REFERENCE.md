# Google Analytics 4 - Event Tracking Reference

**Project:** A1 Service Expert Booking Platform  
**Analytics Type:** Google Analytics 4 (GA4)  
**Last Updated:** November 2, 2025

---

## 📊 Overview

This document provides a complete reference of all analytics events tracked in the A1 Service Expert booking platform. Use this as a guide when adding new tracking or debugging existing events.

---

## 🔧 Setup

### Environment Variables
```bash
# apps/booking-web/.env.local
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# apps/booking-web/.env.production
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX  # Your production GA4 ID
```

### Import in Components
```typescript
import {
  trackPageView,
  trackEvent,
  trackBookingConversion,
  trackFunnelStep,
  trackRegistration,
  trackVehicleLookup,
  trackDocumentDownload,
} from '@/lib/analytics';
```

---

## 📋 Standard Events (Enhanced Measurement)

These events are **automatically tracked** by GA4 when enabled:

| Event Name | Trigger | Parameters |
|------------|---------|------------|
| `page_view` | Route change | `page_location`, `page_title` |
| `scroll` | User scrolls 90% | `percent_scrolled` |
| `click` | Outbound link click | `link_url` |
| `file_download` | PDF/file download | `file_name`, `file_extension` |
| `video_start` | Video plays | `video_title` (if videos added) |
| `form_start` | User interacts with form | `form_id` |

**Note:** We manually track `page_view` for better SPA support.

---

## 🎯 Custom Events

### 1. Booking Funnel Steps

**Event:** `booking_funnel_step`

**When:** User progresses through booking wizard steps

**Where:** `apps/booking-web/src/features/booking/BookingWizard.tsx`

**Parameters:**
- `step_number` (number): 1-4
- `step_name` (string): 'Service Selection' | 'Pricing' | 'Date & Time' | 'Confirmation'

**Example:**
```typescript
useEffect(() => {
  if (location.pathname === '/online-booking') {
    trackFunnelStep(1, 'Service Selection');
  } else if (location.pathname.includes('/pricing')) {
    trackFunnelStep(2, 'Pricing');
  } else if (location.pathname.includes('/date-time')) {
    trackFunnelStep(3, 'Date & Time');
  } else if (location.pathname.includes('/details-confirm')) {
    trackFunnelStep(4, 'Confirmation');
  }
}, [location.pathname]);
```

**GA4 Report Location:** Reports → Engagement → Events → `booking_funnel_step`

---

### 2. Booking Conversion

**Event:** `purchase` + `booking_completed`

**When:** User successfully completes booking and reaches success page

**Where:** `apps/booking-web/src/features/booking/SuccessPage.tsx`

**Parameters:**
- **purchase event:**
  - `transaction_id` (string): Booking reference (e.g., 'BK-A1-2025-0042')
  - `value` (number): Total amount in GBP
  - `currency` (string): 'GBP'
  - `items` (array): Service names
  
- **booking_completed event:**
  - `booking_reference` (string): Same as transaction_id
  - `total_value` (number): Total amount
  - `service_count` (number): Number of services booked

**Example:**
```typescript
useEffect(() => {
  if (booking) {
    trackBookingConversion(
      booking.reference,           // 'BK-A1-2025-0042'
      booking.grossTotal,           // 149.99
      booking.services.map(s => s.serviceName)  // ['MOT Test', 'Full Service']
    );
  }
}, [booking]);
```

**GA4 Report Location:** 
- Reports → Monetization → Purchases
- Reports → Engagement → Conversions

---

### 3. User Registration

**Event:** `sign_up`

**When:** User creates new account (registration page or inline during booking)

**Where:** 
- `apps/booking-web/src/pages/RegisterPage.tsx`
- `apps/booking-web/src/features/booking/DetailsConfirmStep.tsx` (inline registration)

**Parameters:**
- `method` (string): 'email' | 'inline_booking'

**Example:**
```typescript
// After successful registration API call
trackRegistration('email');  // From RegisterPage
// or
trackRegistration('inline_booking');  // From booking wizard
```

**GA4 Report Location:** Reports → Engagement → Events → `sign_up`

---

### 4. Vehicle Lookup

**Event:** `vehicle_lookup`

**When:** User performs DVLA vehicle lookup

**Where:** `apps/booking-web/src/features/booking/VehicleModal.tsx` (or similar)

**Parameters:**
- `lookup_success` (boolean): true if DVLA returned data, false if failed

**Example:**
```typescript
try {
  const vehicleData = await dvlaLookup(registration);
  trackVehicleLookup(true);  // Success
  // ... populate form
} catch (error) {
  trackVehicleLookup(false);  // Failure
  // ... show error
}
```

**GA4 Report Location:** Reports → Engagement → Events → `vehicle_lookup`

**Use Case:** Monitor DVLA API usage and success rate

---

### 5. Document Download

**Event:** `document_download`

**When:** User downloads invoice, quote, or receipt PDF

**Where:** 
- `apps/booking-web/src/pages/AccountPage.tsx`
- `apps/booking-web/src/features/admin/financial/InvoiceList.tsx`

**Parameters:**
- `document_type` (string): 'invoice' | 'quote' | 'receipt'
- `document_number` (string): Document number (e.g., 'INV-2025-0042')

**Example:**
```typescript
const handleDownload = (documentUrl: string, documentType: string, documentNumber: string) => {
  trackDocumentDownload(documentType, documentNumber);
  window.open(documentUrl, '_blank');
};

// Usage:
<button onClick={() => handleDownload(invoice.pdfUrl, 'invoice', invoice.number)}>
  Download Invoice
</button>
```

**GA4 Report Location:** Reports → Engagement → Events → `document_download`

---

### 6. Service Selection (Future)

**Event:** `service_selected`

**When:** User adds service to cart in booking wizard

**Where:** `apps/booking-web/src/features/booking/ServicesStep.tsx`

**Parameters:**
- `service_name` (string): Name of service
- `service_price` (number): Price of service
- `engine_tier` (string): '0-1400cc' | '1401-2000cc' | '2001cc+'

**Example (to implement):**
```typescript
const handleAddService = (service: Service, tier: string, price: number) => {
  trackEvent('Booking', 'service_selected', service.name, price);
  // ... add to cart
};
```

---

### 7. Contact Form Submission (Future)

**Event:** `contact_form_submit`

**When:** User submits contact form

**Where:** `apps/booking-web/src/pages/ContactPage.tsx`

**Parameters:**
- `contact_reason` (string): Reason for contact

**Example (to implement):**
```typescript
const handleSubmit = async (data: ContactFormData) => {
  await submitContactForm(data);
  trackEvent('Contact', 'contact_form_submit', data.reason);
};
```

---

## 📊 Key Conversion Funnel

**Goal:** Track complete booking journey

### Funnel Visualization in GA4

1. **Step 1:** Service Selection (`booking_funnel_step` where `step_number = 1`)
2. **Step 2:** Pricing View (`booking_funnel_step` where `step_number = 2`)
3. **Step 3:** Date/Time Selection (`booking_funnel_step` where `step_number = 3`)
4. **Step 4:** Confirmation (`booking_funnel_step` where `step_number = 4`)
5. **Conversion:** Booking Completed (`purchase` event)

### How to View in GA4:
1. Go to **Explore**
2. Create new **Funnel exploration**
3. Add steps:
   - Step 1: Event `booking_funnel_step` where `step_number = 1`
   - Step 2: Event `booking_funnel_step` where `step_number = 2`
   - Step 3: Event `booking_funnel_step` where `step_number = 3`
   - Step 4: Event `booking_funnel_step` where `step_number = 4`
   - Conversion: Event `purchase`
4. Set as **closed funnel** (users must complete in order)

---

## 🎯 Recommended KPIs to Monitor

### Traffic Metrics
- **Users:** Total unique visitors
- **Sessions:** Total browsing sessions
- **Bounce Rate:** % of single-page sessions
- **Average Session Duration:** Time on site

### Engagement Metrics
- **Pages per Session:** Engagement depth
- **Scroll Rate:** % reaching 90% scroll
- **Event Count:** Total interactions

### Conversion Metrics
- **Booking Conversion Rate:** `purchase` events / `booking_funnel_step` (step 1) events
- **Funnel Drop-off Rate:** % lost between each step
- **Average Order Value:** Average `value` of `purchase` events
- **Registration Rate:** `sign_up` events / Users

### Behavior Metrics
- **DVLA Lookup Success Rate:** `vehicle_lookup` (success=true) / total `vehicle_lookup`
- **Document Downloads:** Count of `document_download` events
- **Top Services Selected:** Most common `service_selected` labels

---

## 🧪 Testing Analytics Events

### Development Testing

**1. Check Browser Console**
```javascript
// In browser console (after GA4 initialized)
window.gtag  // Should be a function
window.dataLayer  // Should be an array
```

**2. Chrome DevTools Network Tab**
- Filter by `google-analytics`
- Look for requests to `https://www.google-analytics.com/g/collect`
- Check request payload for event names

**3. GA4 DebugView**
1. Go to GA4 Dashboard
2. Navigate to **Admin → DebugView**
3. Visit your site with `?debug_mode=true` in URL
4. See events in real-time with full parameters

### Production Monitoring

**1. Realtime Reports**
- Go to **Reports → Realtime**
- See events as they happen
- Verify event parameters

**2. Event Reports**
- Go to **Reports → Engagement → Events**
- See all event names and counts
- Click event for parameter breakdown

---

## 🚨 Troubleshooting

### Events Not Appearing in GA4

**Check:**
1. ✅ `VITE_GA_MEASUREMENT_ID` is set correctly
2. ✅ `initializeAnalytics()` is called in `App.tsx`
3. ✅ Browser console shows `[Analytics] GA4 initialized: G-...`
4. ✅ Ad blockers disabled (or use incognito mode)
5. ✅ Network tab shows requests to `google-analytics.com`
6. ✅ Wait 24-48 hours for non-realtime reports

### Parameters Missing

**Check:**
1. ✅ Event function called with all required parameters
2. ✅ Parameters match expected types (string, number, boolean)
3. ✅ Use DebugView to inspect parameter values

### Funnel Not Working

**Check:**
1. ✅ All funnel steps fire in correct order
2. ✅ User completes steps in single session
3. ✅ Step numbers are consistent (1, 2, 3, 4)
4. ✅ Funnel configured as "closed" in GA4 Explore

---

## 📚 Additional Resources

- **GA4 Documentation:** https://developers.google.com/analytics/devguides/collection/ga4
- **Event Reference:** https://developers.google.com/analytics/devguides/collection/ga4/reference/events
- **Measurement Protocol:** https://developers.google.com/analytics/devguides/collection/protocol/ga4
- **React GA4 Library:** https://github.com/codler/react-ga4

---

## 🔄 Event Changelog

| Date | Event Added/Modified | Description |
|------|---------------------|-------------|
| 2025-11-02 | Initial setup | Created analytics tracking plan |
| TBD | `service_selected` | To be implemented in Week 2 |
| TBD | `contact_form_submit` | To be implemented when contact form added |

---

**Questions?** See `CODE_IMPROVEMENT_PLAN.md` for full implementation details.
