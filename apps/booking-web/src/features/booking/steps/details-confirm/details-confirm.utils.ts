import { format } from 'date-fns';
import type { BookingDraft } from '../../types';
import type { AccountUser, ProfileFormValues } from './details-confirm.schemas';

const currencyFormatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
export const formatCurrency = (value?: number) => (typeof value !== 'number' ? 'N/A' : currencyFormatter.format(value / 100));

export const computeHoldRemaining = (expiresAt?: string) => {
  if (!expiresAt) return 0;
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return 0;
  return Math.max(0, expiry - Date.now());
};

export const formatHoldCountdown = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const normaliseTitle = (value: string | null | undefined): ProfileFormValues['title'] => {
  if (!value) return 'MR';
  const upper = value.toUpperCase();
  return ['MR', 'MRS', 'MISS', 'MS'].includes(upper) ? (upper as ProfileFormValues['title']) : 'MR';
};

export const trimOrUndefined = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const uppercasePostcode = (value: string) => value.trim().toUpperCase().replace(/\s+/g, ' ');

export const extractAppointmentDisplay = (date?: string, time?: string) => {
  if (!date || !time) return null;
  const iso = `${date}T${time}:00`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return { dateLabel: format(parsed, 'EEEE d MMMM yyyy'), timeLabel: format(parsed, 'HH:mm') };
};

export const buildProfileDefaults = (draft: BookingDraft, user: AccountUser | null): ProfileFormValues => ({
  title: normaliseTitle(draft.customer?.title ?? user?.title),
  firstName: draft.customer?.firstName ?? user?.firstName ?? '',
  lastName: draft.customer?.lastName ?? user?.lastName ?? '',
  companyName: draft.customer?.companyName ?? user?.companyName ?? undefined,
  mobileNumber: draft.customer?.mobileNumber ?? user?.mobileNumber ?? '',
  landlineNumber: draft.customer?.landlineNumber ?? user?.landlineNumber ?? undefined,
  addressLine1: draft.customer?.addressLine1 ?? user?.addressLine1 ?? '',
  addressLine2: draft.customer?.addressLine2 ?? user?.addressLine2 ?? undefined,
  addressLine3: draft.customer?.addressLine3 ?? user?.addressLine3 ?? undefined,
  city: draft.customer?.city ?? user?.city ?? '',
  county: draft.customer?.county ?? user?.county ?? '',
  postcode: draft.customer?.postcode ?? user?.postcode ?? '',
  marketingOptIn: draft.customer?.marketingOptIn ?? user?.marketingOptIn ?? false,
  notes: draft.customer?.notes ?? draft.bookingNotes ?? user?.notes ?? undefined,
  acceptedTerms: draft.customer?.acceptedTerms ?? false,
});

export const buildCustomerPayload = (profile: ProfileFormValues, email: string) => ({
  title: profile.title,
  firstName: profile.firstName.trim(),
  lastName: profile.lastName.trim(),
  companyName: trimOrUndefined(profile.companyName),
  email: email.trim(),
  mobileNumber: profile.mobileNumber.trim(),
  landlineNumber: trimOrUndefined(profile.landlineNumber),
  addressLine1: profile.addressLine1.trim(),
  addressLine2: trimOrUndefined(profile.addressLine2),
  addressLine3: trimOrUndefined(profile.addressLine3),
  city: profile.city.trim(),
  county: trimOrUndefined(profile.county),
  postcode: uppercasePostcode(profile.postcode),
  marketingOptIn: profile.marketingOptIn ?? false,
  acceptedTerms: profile.acceptedTerms,
  name: `${profile.title ? `${profile.title} ` : ''}${profile.firstName.trim()} ${profile.lastName.trim()}`.replace(/\s+/g, ' ').trim(),
  phone: profile.mobileNumber.trim(),
  notes: trimOrUndefined(profile.notes),
});

export function extractBookingId(response: unknown): string {
  if (response && typeof response === 'object') {
    const r = response as { bookingId?: unknown; id?: unknown };
    if (typeof r.bookingId === 'number' || typeof r.bookingId === 'string') return String(r.bookingId);
    if (typeof r.id === 'number' || typeof r.id === 'string') return String(r.id);
  }
  throw new Error('Booking identifier missing in response');
}
// Pure helpers used by DetailsConfirm step. No side effects.
