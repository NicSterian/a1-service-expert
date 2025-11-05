import { useEffect, useState } from 'react';
import { apiGet, apiPatch } from '../../../lib/api';
import type { AdminBookingResponse, BookingStatus, PaymentStatus } from './AdminBookingDetailPage';

export function useAdminBooking(bookingId: string | undefined) {
  const [booking, setBooking] = useState<AdminBookingResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!bookingId) return;
    try {
      setStatus('loading');
      setError(null);
      const data = await apiGet<AdminBookingResponse>(`/admin/bookings/${bookingId}`);
      setBooking(data);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError((err as Error).message ?? 'Failed to load booking');
    }
  };

  const updateStatus = async (status: BookingStatus) => {
    if (!bookingId) return null;
    const data = await apiPatch<AdminBookingResponse>(`/admin/bookings/${bookingId}/status`, { status });
    setBooking(data);
    return data;
  };

  const updatePaymentStatus = async (paymentStatus: PaymentStatus) => {
    if (!bookingId) return null;
    const data = await apiPatch<AdminBookingResponse>(`/admin/bookings/${bookingId}/payment-status`, { paymentStatus });
    setBooking(data);
    return data;
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  return { booking, setBooking, status, error, refreshBooking: load, updateStatus, updatePaymentStatus };
}
