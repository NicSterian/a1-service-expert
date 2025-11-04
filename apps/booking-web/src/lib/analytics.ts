/**
 * Google Analytics 4 Integration
 * 
 * Provides type-safe wrapper around react-ga4 for tracking
 * user interactions, conversions, and custom events.
 * 
 * Environment Variables:
 * - VITE_GA_MEASUREMENT_ID: GA4 Measurement ID (G-XXXXXXXXXX)
 * 
 * @see https://developers.google.com/analytics/devguides/collection/ga4
 * @see ANALYTICS_EVENTS_REFERENCE.md for full event documentation
 */

import ReactGA from 'react-ga4';

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

/**
 * Initialize Google Analytics
 * Only runs in production and when measurement ID is provided
 * 
 * Call this once when the app loads (in App.tsx useEffect)
 */
export function initializeAnalytics() {
  if (!GA_MEASUREMENT_ID) {
    console.warn('[Analytics] No GA_MEASUREMENT_ID found, analytics disabled');
    return;
  }

  try {
    ReactGA.initialize(GA_MEASUREMENT_ID, {
      gaOptions: {
        // Enhanced measurement (automatic scroll, outbound clicks, etc.)
        send_page_view: false, // We'll send manually for SPA
      },
      gtagOptions: {
        // Enable debug mode in development
        debug_mode: import.meta.env.DEV,
      },
    });

    console.log('[Analytics] GA4 initialized:', GA_MEASUREMENT_ID);
  } catch (error) {
    console.error('[Analytics] Failed to initialize GA4:', error);
  }
}

/**
 * Track page view
 * Call on route changes in React Router
 * 
 * @param path - Page path (e.g., '/online-booking')
 * @param title - Page title for analytics
 * 
 * @example
 * trackPageView('/services', 'Our Services');
 */
export function trackPageView(path: string, title?: string) {
  if (!GA_MEASUREMENT_ID) return;

  try {
    ReactGA.send({
      hitType: 'pageview',
      page: path,
      title: title || document.title,
    });
  } catch (error) {
    console.error('[Analytics] Failed to track page view:', error);
  }
}

/**
 * Track custom event
 * 
 * @param category - Event category (e.g., 'Booking')
 * @param action - Event action (e.g., 'service_selected')
 * @param label - Optional event label
 * @param value - Optional numeric value
 * 
 * @example
 * trackEvent('Contact', 'form_submit', 'enquiry');
 */
export function trackEvent(
  category: string,
  action: string,
  label?: string,
  value?: number
) {
  if (!GA_MEASUREMENT_ID) return;

  try {
    ReactGA.event({
      category,
      action,
      label,
      value,
    });
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error);
  }
}

/**
 * Track booking conversion
 * Fires when user completes booking and lands on success page
 * 
 * This sends two events:
 * 1. Standard 'purchase' event (for GA4 ecommerce)
 * 2. Custom 'booking_completed' event (for custom reports)
 * 
 * @param bookingReference - Unique booking reference (e.g., 'BK-A1-2025-0042')
 * @param totalAmount - Total booking value in GBP
 * @param services - Array of service names booked
 * 
 * @example
 * trackBookingConversion('BK-A1-2025-0042', 149.99, ['MOT Test', 'Full Service']);
 */
export function trackBookingConversion(
  bookingReference: string,
  totalAmount: number,
  services: string[]
) {
  if (!GA_MEASUREMENT_ID) return;

  try {
    // Standard ecommerce purchase event
    ReactGA.event('purchase', {
      transaction_id: bookingReference,
      value: totalAmount,
      currency: 'GBP',
      items: services.map((service, index) => ({
        item_id: `service_${index}`,
        item_name: service,
      })),
    });

    // Custom booking_completed event for additional tracking
    ReactGA.event('booking_completed', {
      booking_reference: bookingReference,
      total_value: totalAmount,
      service_count: services.length,
    });

    console.log('[Analytics] Booking conversion tracked:', bookingReference);
  } catch (error) {
    console.error('[Analytics] Failed to track booking conversion:', error);
  }
}

/**
 * Track funnel step progress
 * Monitors user progression through booking wizard
 * 
 * Steps:
 * 1. Service Selection
 * 2. Pricing
 * 3. Date & Time
 * 4. Confirmation
 * 
 * @param step - Funnel step number (1-4)
 * @param stepName - Human-readable step name
 * 
 * @example
 * trackFunnelStep(1, 'Service Selection');
 * trackFunnelStep(2, 'Pricing');
 */
export function trackFunnelStep(step: number, stepName: string) {
  if (!GA_MEASUREMENT_ID) return;

  try {
    ReactGA.event('booking_funnel_step', {
      step_number: step,
      step_name: stepName,
    });
  } catch (error) {
    console.error('[Analytics] Failed to track funnel step:', error);
  }
}

/**
 * Track user registration
 * 
 * @param method - Registration method ('email' or 'inline_booking')
 * 
 * @example
 * trackRegistration('email');  // From RegisterPage
 * trackRegistration('inline_booking');  // From booking wizard
 */
export function trackRegistration(method: 'email' | 'inline_booking') {
  if (!GA_MEASUREMENT_ID) return;

  try {
    ReactGA.event('sign_up', {
      method,
    });

    console.log('[Analytics] Registration tracked:', method);
  } catch (error) {
    console.error('[Analytics] Failed to track registration:', error);
  }
}

/**
 * Track DVLA vehicle lookup
 * Monitor API usage for vehicle lookups
 * 
 * @param success - Whether the lookup succeeded
 * @param registration - Optional vehicle registration (anonymized in GA4)
 * 
 * @example
 * trackVehicleLookup(true);   // Successful lookup
 * trackVehicleLookup(false);  // Failed lookup
 */
export function trackVehicleLookup(success: boolean, registration?: string) {
  if (!GA_MEASUREMENT_ID) return;

  try {
    ReactGA.event('vehicle_lookup', {
      lookup_success: success,
      // Don't send actual registration for privacy
      has_registration: !!registration,
    });
  } catch (error) {
    console.error('[Analytics] Failed to track vehicle lookup:', error);
  }
}

/**
 * Track document download
 * Monitor invoice/quote PDF downloads
 * 
 * @param documentType - Type of document ('invoice', 'quote', 'receipt')
 * @param documentNumber - Document number (e.g., 'INV-2025-0042')
 * 
 * @example
 * trackDocumentDownload('invoice', 'INV-2025-0042');
 */
export function trackDocumentDownload(
  documentType: 'invoice' | 'quote' | 'receipt',
  documentNumber: string
) {
  if (!GA_MEASUREMENT_ID) return;

  try {
    ReactGA.event('document_download', {
      document_type: documentType,
      document_number: documentNumber,
    });
  } catch (error) {
    console.error('[Analytics] Failed to track document download:', error);
  }
}

/**
 * Track service selection in booking wizard
 * Fires when user adds/removes service from cart
 * 
 * @param serviceName - Name of the service
 * @param action - Whether service was added or removed
 * @param price - Service price
 * 
 * @example
 * trackServiceSelection('MOT Test', 'add', 54.85);
 */
export function trackServiceSelection(
  serviceName: string,
  action: 'add' | 'remove',
  price: number
) {
  if (!GA_MEASUREMENT_ID) return;

  try {
    ReactGA.event('service_selected', {
      service_name: serviceName,
      action,
      price,
    });
  } catch (error) {
    console.error('[Analytics] Failed to track service selection:', error);
  }
}
