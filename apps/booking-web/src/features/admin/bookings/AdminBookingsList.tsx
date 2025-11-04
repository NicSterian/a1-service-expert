import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../../lib/api';
import { BookingSourceBadge } from './BookingSourceBadge';
import toast from 'react-hot-toast';

type AdminBookingsListProps = {
  mode: 'UPCOMING' | 'PAST' | 'DELETED';
};

type BookingSource = 'ONLINE' | 'MANUAL';

type BookingStatus =
  | 'DRAFT'
  | 'HELD'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

type AdminBookingListItem = {
  id: number;
  customerName: string;
  customerEmail: string;
  vehicleRegistration: string;
  slotDate: string;
  slotTime: string;
  status: BookingStatus;
  source: BookingSource;
  createdAt: string;
  serviceId: number | null;
  serviceName: string | null;
  engineTierId: number | null;
  engineTierName: string | null;
  totalAmountPence: number | null;
};

type AdminBookingListResponse = {
  bookings: AdminBookingListItem[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

type Service = {
  id: number;
  name: string;
  isActive: boolean;
};

type EngineTier = {
  id: number;
  name: string;
};

type DatePreset = 'TODAY' | '7_DAYS' | '30_DAYS' | 'CUSTOM';

type SortBy = 'slot' | 'created' | 'customer';
type SortOrder = 'asc' | 'desc';

const UPCOMING_STATUS_DEFAULT = 'DRAFT,HELD,CONFIRMED';
const PAST_STATUS_DEFAULT = 'COMPLETED,CANCELLED,NO_SHOW';

const STATUS_LABELS: Record<BookingStatus, string> = {
  DRAFT: 'Draft',
  HELD: 'Held',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
};

export function AdminBookingsList({ mode }: AdminBookingsListProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [engineTiers, setEngineTiers] = useState<EngineTier[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [bookings, setBookings] = useState<AdminBookingListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [datePreset, setDatePreset] = useState<DatePreset>('TODAY');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [statusFilter, setStatusFilter] = useState(
    mode === 'UPCOMING' ? 'ACTIVE' : 'HISTORIC',
  );
  const [sourceFilter, setSourceFilter] = useState<'ALL' | BookingSource>('ALL');
  const [serviceFilter, setServiceFilter] = useState<'ALL' | number>('ALL');
  const [engineTierFilter, setEngineTierFilter] = useState<'ALL' | number>('ALL');
  const [sortBy, setSortBy] = useState<SortBy>('slot');
  const [sortOrder, setSortOrder] = useState<SortOrder>(mode === 'UPCOMING' ? 'asc' : 'desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        setDebouncedSearch(searchTerm.trim());
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false;
    const loadMeta = async () => {
      try {
        setLoadingMeta(true);
        setMetaError(null);
        const [servicesResponse, tiersResponse] = await Promise.all([
          apiGet<Service[]>('/catalog/services'),
          apiGet<EngineTier[]>('/admin/engine-tiers'),
        ]);
        if (!cancelled) {
          setServices(servicesResponse.filter((service) => service.isActive));
          setEngineTiers(tiersResponse);
        }
      } catch (err) {
        if (!cancelled) {
          setMetaError((err as Error).message ?? 'Failed to load filters.');
        }
      } finally {
        if (!cancelled) {
          setLoadingMeta(false);
        }
      }
    };
    loadMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  const { fromDate, toDate } = useMemo(() => {
    if (mode === 'DELETED') {
      return { fromDate: undefined, toDate: undefined };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const format = (date: Date) => date.toISOString().split('T')[0];
    const addDays = (date: Date, days: number) => {
      const next = new Date(date);
      next.setDate(next.getDate() + days);
      return next;
    };

    if (datePreset === 'CUSTOM') {
      return {
        fromDate: customFrom || undefined,
        toDate: customTo || undefined,
      };
    }

    if (mode === 'UPCOMING') {
      if (datePreset === 'TODAY') {
        // Limit to strictly today for clarity
        return { fromDate: format(today), toDate: format(today) };
      }
      if (datePreset === '7_DAYS') {
        return { fromDate: format(today), toDate: format(addDays(today, 7)) };
      }
      return { fromDate: format(today), toDate: format(addDays(today, 30)) };
    }

    // PAST
    if (datePreset === 'TODAY') {
      return { fromDate: format(today), toDate: format(today) };
    }
    if (datePreset === '7_DAYS') {
      return { fromDate: format(addDays(today, -6)), toDate: format(today) };
    }
    return { fromDate: format(addDays(today, -29)), toDate: format(today) };
  }, [customFrom, customTo, datePreset, mode]);

  useEffect(() => {
    let cancelled = false;
    const loadBookings = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('pageSize', '50');
        params.set('sort', sortBy);
        params.set('order', sortOrder);
        if (mode === 'DELETED') params.set('deleted', 'true');

        if (fromDate) {
          params.set('from', fromDate);
        }
        if (toDate) {
          params.set('to', toDate);
        }

        const statusParam =
          statusFilter === 'ACTIVE'
            ? UPCOMING_STATUS_DEFAULT
            : statusFilter === 'HISTORIC'
            ? PAST_STATUS_DEFAULT
            : statusFilter === 'ALL'
            ? undefined
            : statusFilter;

        if (statusParam && mode !== 'DELETED') {
          params.set('status', statusParam);
        }

        if (sourceFilter !== 'ALL' && mode !== 'DELETED') {
          params.set('source', sourceFilter);
        }

        if (serviceFilter !== 'ALL' && mode !== 'DELETED') {
          params.set('serviceId', String(serviceFilter));
        }

        if (engineTierFilter !== 'ALL' && mode !== 'DELETED') {
          params.set('engineTierId', String(engineTierFilter));
        }

        if (debouncedSearch.length > 0) {
          params.set('q', debouncedSearch);
        }

        const response = await apiGet<AdminBookingListResponse>(`/admin/bookings?${params.toString()}`);
        if (!cancelled) {
          setBookings(response.bookings);
          setTotal(response.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message ?? 'Failed to load bookings.');
          setBookings([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    loadBookings();
    return () => {
      cancelled = true;
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [
    sourceFilter,
    statusFilter,
    toDate,
    serviceFilter,
    reloadKey,
  ]);

  const statusOptions = useMemo(() => {
    const base = [
      { value: 'ALL', label: 'All statuses' },
      { value: 'DRAFT', label: 'Draft' },
      { value: 'HELD', label: 'Held' },
      { value: 'CONFIRMED', label: 'Confirmed' },
      { value: 'COMPLETED', label: 'Completed' },
      { value: 'CANCELLED', label: 'Cancelled' },
      { value: 'NO_SHOW', label: 'No Show' },
    ];

    if (mode === 'UPCOMING') {
      return [{ value: 'ACTIVE', label: 'Active (Draft/Held/Confirmed)' }, ...base];
    }

    return [{ value: 'HISTORIC', label: 'Historic (Completed/Cancelled/No Show)' }, ...base];
  }, [mode]);

  const presetOptions = useMemo<Array<{ value: DatePreset; label: string }>>(() => {
    if (mode === 'DELETED') return [];
    if (mode === 'UPCOMING') {
      return [
        { value: 'TODAY', label: 'Today' },
        { value: '7_DAYS', label: 'Next 7 days' },
        { value: '30_DAYS', label: 'Next 30 days' },
        { value: 'CUSTOM', label: 'Custom range' },
      ];
    }

    return [
      { value: 'TODAY', label: 'Today' },
      { value: '7_DAYS', label: 'Last 7 days' },
      { value: '30_DAYS', label: 'Last 30 days' },
      { value: 'CUSTOM', label: 'Custom range' },
    ];
  }, [mode]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 2,
      }),
    [],
  );

  const filteredEngineTiers = useMemo(() => {
    if (serviceFilter === 'ALL') {
      return engineTiers;
    }
    return engineTiers;
  }, [engineTiers, serviceFilter]);

  const showCustomDates = datePreset === 'CUSTOM';

  const heading = mode === 'UPCOMING' ? 'Upcoming Bookings' : mode === 'PAST' ? 'Past Bookings' : 'Deleted Bookings';
  const bookingCountLabel = `${total} booking${total === 1 ? '' : 's'}`;

  const handleRestore = async (id: number) => {
    const ok = window.confirm('Restore this booking? It will appear back in the main lists.');
    if (!ok) return;
    try {
      await apiGet(`/admin/bookings/${id}/restore`, { method: 'PATCH' });
      toast.success('Booking restored');
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to restore booking');
    }
  };

  const handleHardDelete = async (id: number) => {
    const ok = window.confirm(
      'Permanently delete this booking and its records? This cannot be undone.',
    );
    if (!ok) return;
    try {
      await apiGet(`/admin/bookings/${id}/hard-delete`, { method: 'POST' });
      toast.success('Booking permanently deleted');
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to delete booking');
    }
  };

  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{heading}</h3>
          <p className="text-xs uppercase tracking-wide text-slate-500">{bookingCountLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search name, email, VRM, ID..."
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 md:w-64"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Sort</label>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortBy)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            >
              <option value="slot">Slot time</option>
              <option value="created">Created date</option>
              <option value="customer">Customer name</option>
            </select>
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as SortOrder)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Date range</label>
          <select
            value={datePreset}
            onChange={(event) => setDatePreset(event.target.value as DatePreset)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          >
            {presetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {showCustomDates && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                placeholder="From"
              />
              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                placeholder="To"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Source</label>
          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value as 'ALL' | BookingSource)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          >
            <option value="ALL">All sources</option>
            <option value="ONLINE">Online</option>
            <option value="MANUAL">Manual</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Service</label>
          <select
            value={serviceFilter === 'ALL' ? 'ALL' : String(serviceFilter)}
            onChange={(event) => {
              const value = event.target.value;
              setServiceFilter(value === 'ALL' ? 'ALL' : Number(value));
            }}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          >
            <option value="ALL">All services</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 lg:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Engine tier</label>
          <select
            value={engineTierFilter === 'ALL' ? 'ALL' : String(engineTierFilter)}
            onChange={(event) => {
              const value = event.target.value;
              setEngineTierFilter(value === 'ALL' ? 'ALL' : Number(value));
            }}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          >
            <option value="ALL">All engine tiers</option>
            {filteredEngineTiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingMeta && (
        <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800 p-4 text-sm text-slate-300">
          Loading filters...
        </div>
      )}

      {metaError && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {metaError}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-slate-400">Loading bookings...</div>
      ) : error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      ) : bookings.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-400">No bookings match the current filters.</div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const slotDate = new Date(booking.slotDate);
            const slotLabel = slotDate.toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const createdLabel = new Date(booking.createdAt).toLocaleString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            const totalLabel =
              typeof booking.totalAmountPence === 'number'
                ? currencyFormatter.format(booking.totalAmountPence / 100)
                : '—';

            return (
              <Link
                key={booking.id}
                to={`/admin/bookings/${booking.id}`}
                className="group block rounded-xl border border-slate-700 bg-slate-800 p-4 transition hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/10"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Booking #{booking.id}
                      </span>
                      <BookingSourceBadge source={booking.source} />
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          booking.status === 'CONFIRMED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : booking.status === 'HELD'
                            ? 'bg-yellow-500/20 text-yellow-200'
                            : booking.status === 'DRAFT'
                            ? 'bg-slate-500/20 text-slate-200'
                            : booking.status === 'CANCELLED'
                            ? 'bg-red-500/20 text-red-200'
                            : booking.status === 'COMPLETED'
                            ? 'bg-blue-500/20 text-blue-200'
                            : booking.status === 'NO_SHOW'
                            ? 'bg-amber-700/20 text-amber-200'
                            : 'bg-slate-600/20 text-slate-200'
                        }`}
                      >
                        {STATUS_LABELS[booking.status]}
                      </span>
                    </div>

                    <div className="text-sm text-white">
                      <span className="font-medium">{booking.customerName}</span>
                      <span className="text-slate-400"> • {booking.customerEmail || 'no email'}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      VRM: {booking.vehicleRegistration || 'n/a'} • {slotLabel} at {booking.slotTime}
                    </div>

                    <div className="mt-1 grid grid-cols-1 gap-2 text-xs text-slate-300 sm:grid-cols-3">
                      <div>
                        <span className="block text-slate-500">Service</span>
                        <span>{booking.serviceName ?? '—'}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500">Engine tier</span>
                        <span>{booking.engineTierName ?? '—'}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500">Total</span>
                        <span>{totalLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2 text-xs text-slate-400 md:items-end">
                    <span>Created {createdLabel}</span>
                    {mode !== 'DELETED' ? (
                      <span className="rounded-full border border-slate-600 px-3 py-1 text-[11px] uppercase tracking-wide text-slate-300 transition group-hover:border-orange-500 group-hover:text-orange-300">
                        View booking
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRestore(booking.id);
                          }}
                          className="rounded-full border border-emerald-500 px-3 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/10"
                          type="button"
                        >
                          Restore
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleHardDelete(booking.id);
                          }}
                          className="rounded-full border border-red-500 px-3 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500/10"
                          type="button"
                        >
                          Delete Permanently
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
/**
 * AdminBookingsList
 *
 * Purpose
 * - Filterable/searchable list of bookings for operational overview.
 *
 * Refactor Ideas
 * - Extract filter state into useBookingsFilters hook.
 * - Extract ListItem component for row rendering.
 */
