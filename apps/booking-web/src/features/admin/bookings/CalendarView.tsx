import { useCallback, useEffect, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import { DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiGet } from '../../../lib/api';
import { BookingSourceBadge } from './BookingSourceBadge';
import { AdminBookingResponse, BookingStatus, BookingSource } from '../pages/AdminBookingDetailPage';

type CalendarBooking = {
  id: number;
  customerName: string;
  customerEmail: string;
  vehicleRegistration: string;
  slotDate: string;
  slotTime: string;
  status: BookingStatus;
  source: BookingSource;
  serviceName: string | null;
};

type CalendarBookingsResponse = {
  bookings: CalendarBooking[];
};

type CalendarRange = {
  start: string;
  end: string;
};

const SOURCE_COLOR: Record<BookingSource, string> = {
  ONLINE: 'rgba(52, 211, 153, 0.85)',
  MANUAL: 'rgba(96, 165, 250, 0.85)',
};

const BORDER_COLOR: Record<BookingSource, string> = {
  ONLINE: 'rgba(16, 185, 129, 1)',
  MANUAL: 'rgba(37, 99, 235, 1)',
};

const STATUS_SHORT: Record<BookingStatus, string> = {
  DRAFT: 'Draft',
  HELD: 'Held',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
};

function toDateInputValue(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().split('T')[0] ?? '';
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function formatDate(value: string | null) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(value: string | null) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CalendarView() {
  const [range, setRange] = useState<CalendarRange | null>(null);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<AdminBookingResponse | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 2,
      }),
    [],
  );

  const loadBookings = useCallback(async (dateRange: CalendarRange) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('pageSize', '500');
      params.set('sort', 'slot');
      params.set('order', 'asc');
      params.set('from', dateRange.start);
      params.set('to', dateRange.end);

      const data = await apiGet<CalendarBookingsResponse>(`/admin/bookings?${params.toString()}`);

      const mappedEvents: EventInput[] = data.bookings.map((booking) => {
        const datePart = booking.slotDate.split('T')[0] ?? booking.slotDate;
        const start = new Date(`${datePart}T${booking.slotTime || '09:00'}`);
        const end = addMinutes(start, 60);
        const title = booking.serviceName
          ? `${booking.customerName} - ${booking.serviceName}`
          : booking.customerName;
        return {
          id: booking.id.toString(),
          title,
          start,
          end,
          allDay: false,
          backgroundColor: SOURCE_COLOR[booking.source],
          borderColor: BORDER_COLOR[booking.source],
          textColor: '#0f172a',
          extendedProps: {
            bookingId: booking.id,
            customerEmail: booking.customerEmail,
            vehicleRegistration: booking.vehicleRegistration,
            slotTime: booking.slotTime,
            serviceName: booking.serviceName,
            source: booking.source,
            status: booking.status,
          },
        };
      });

      setEvents(mappedEvents);
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load bookings for calendar.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!range) return;
    loadBookings(range);
  }, [range, loadBookings]);

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    const startStr = toDateInputValue(arg.start);
    const inclusiveEnd = new Date(arg.end);
    inclusiveEnd.setDate(inclusiveEnd.getDate() - 1);
    const endStr = toDateInputValue(inclusiveEnd);
    setRange({ start: startStr, end: endStr });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedBookingId(null);
    setSelectedBooking(null);
    setDrawerError(null);
  }, []);

  const handleEventClick = useCallback(async (info: EventClickArg) => {
    info.jsEvent.preventDefault();
    const bookingId = Number(info.event.id);
    if (!Number.isFinite(bookingId)) {
      toast.error('Unknown booking selected');
      return;
    }

    setDrawerOpen(true);
    setSelectedBookingId(bookingId);
    setSelectedBooking(null);
    setDrawerError(null);
    setDrawerLoading(true);

    try {
      const data = await apiGet<AdminBookingResponse>(`/admin/bookings/${bookingId}`);
      setSelectedBooking(data);
    } catch (err) {
      setDrawerError((err as Error).message ?? 'Failed to load booking details');
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  const refreshCalendar = useCallback(async () => {
    if (!range) return;
    await loadBookings(range);
    toast.success('Calendar refreshed');
  }, [loadBookings, range]);

  const totalEvents = events.length;

  return (
    <div className="relative rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-lg font-semibold text-white">Calendar</div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {loading ? 'Loading events...' : `${totalEvents} booking${totalEvents === 1 ? '' : 's'} in view`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-1 text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Online
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-400/20 px-2 py-1 text-blue-200">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              Manual
            </span>
          </div>
          <button
            onClick={refreshCalendar}
            className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-orange-500 hover:text-orange-300"
            type="button"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className={loading ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          height="auto"
          events={events}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          nowIndicator
          buttonText={{ today: 'Today', month: 'Month', week: 'Week', day: 'Day' }}
          displayEventTime
          selectable={false}
          eventDisplay="block"
          eventClassNames={() => ['border-none', 'rounded-md', 'shadow']}
        />
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={closeDrawer} />
          <div className="relative ml-auto flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Booking #{selectedBookingId ?? ''}
                </span>
                {selectedBooking && (
                  <span className="text-sm font-semibold text-white">
                    {formatDate(selectedBooking.slotDate)} at {selectedBooking.slotTime}
                  </span>
                )}
              </div>
              <button
                onClick={closeDrawer}
                className="rounded-full border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-orange-500 hover:text-orange-300"
                type="button"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {drawerLoading ? (
                <div className="py-12 text-center text-sm text-slate-400">Loading booking...</div>
              ) : drawerError ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                  <p>{drawerError}</p>
                  <button
                    onClick={() => {
                      if (!selectedBookingId) return;
                      setDrawerLoading(true);
                      setDrawerError(null);
                      apiGet<AdminBookingResponse>(`/admin/bookings/${selectedBookingId}`)
                        .then((data) => setSelectedBooking(data))
                        .catch((err) =>
                          setDrawerError((err as Error).message ?? 'Failed to load booking details'),
                        )
                        .finally(() => setDrawerLoading(false));
                    }}
                    className="mt-3 rounded-full border border-red-200/40 px-3 py-1 text-xs font-semibold text-red-100 transition hover:border-orange-500 hover:text-orange-300"
                    type="button"
                  >
                    Retry
                  </button>
                </div>
              ) : selectedBooking ? (
                <div className="space-y-4 text-sm text-slate-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <BookingSourceBadge source={selectedBooking.source} />
                    <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300">
                      {STATUS_SHORT[selectedBooking.status]}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Customer</div>
                    <div className="font-semibold text-white">{selectedBooking.customer.name}</div>
                    <div className="text-xs text-slate-400">{selectedBooking.customer.email}</div>
                    {selectedBooking.customer.phone && (
                      <div className="text-xs text-slate-400">Phone: {selectedBooking.customer.phone}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Vehicle</div>
                    <div>{selectedBooking.vehicle.registration}</div>
                    <div className="text-xs text-slate-400">
                      {[selectedBooking.vehicle.make, selectedBooking.vehicle.model].filter(Boolean).join(' - ') ||
                        'No vehicle details'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Services</div>
                    {selectedBooking.services.length === 0 ? (
                      <div className="text-xs text-slate-400">No services recorded.</div>
                    ) : (
                      selectedBooking.services.map((service) => (
                        <div key={service.id} className="text-xs text-slate-300">
                          <span className="font-semibold text-white">{service.serviceName ?? 'Service'}</span>
                          {service.engineTierName && <span> - {service.engineTierName}</span>}
                        </div>
                      ))
                    )}
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Totals</div>
                    <div>Services: {currencyFormatter.format(selectedBooking.totals.servicesAmountPence / 100)}</div>
                    {selectedBooking.totals.invoiceAmountPence !== null && (
                      <div className="text-xs text-slate-400">
                        Invoice: {currencyFormatter.format(selectedBooking.totals.invoiceAmountPence / 100)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/admin/bookings/${selectedBooking.id}`}
                      className="flex-1 rounded-full bg-orange-500 px-4 py-2 text-center text-xs font-semibold text-black transition hover:bg-orange-400"
                    >
                      Open booking
                    </Link>
                    <button
                      onClick={closeDrawer}
                      className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-orange-500 hover:text-orange-300"
                      type="button"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-slate-400">Select a booking to view details.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
