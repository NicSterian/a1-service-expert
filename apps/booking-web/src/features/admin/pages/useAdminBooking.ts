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

  const updateCustomer = async (payload: {
    name: string;
    email: string;
    phone: string;
    mobile: string;
    landline: string;
    company: string;
    title: string;
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2: string;
    addressLine3: string;
    city: string;
    county: string;
    postcode: string;
  }) => {
    if (!bookingId) return null;
    const data = await apiPatch<AdminBookingResponse>(`/admin/bookings/${bookingId}/customer`, payload);
    setBooking(data);
    return data;
  };

  const updateVehicle = async (payload: { registration: string; make: string; model: string; engineSizeCc?: number }) => {
    if (!bookingId) return null;
    const data = await apiPatch<AdminBookingResponse>(`/admin/bookings/${bookingId}/vehicle`, payload);
    setBooking(data);
    return data;
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  return { booking, setBooking, status, error, refreshBooking: load, updateStatus, updatePaymentStatus, updateCustomer, updateVehicle };
}
