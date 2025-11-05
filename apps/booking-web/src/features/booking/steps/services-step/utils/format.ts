// Utilities for ServicesStep formatting (pure)
const priceFormatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
export function formatPrice(pence: number | undefined) {
  if (typeof pence !== 'number' || Number.isNaN(pence)) return 'Contact us';
  return priceFormatter.format(pence / 100);
}

export function useNewBookingUIFlag() {
  const env = ((import.meta as unknown) as { env?: Record<string, unknown> }).env ?? {};
  const raw = (env.USE_NEW_BOOKING_UI ?? env.VITE_USE_NEW_BOOKING_UI ?? 'true');
  const val = String(raw).trim().toLowerCase();
  return !(val === 'false' || val === '0' || val === '');
}

