import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiGet, apiPatch, apiPost } from '../../../lib/api';
import { BookingSourceBadge } from '../bookings/BookingSourceBadge';

export type BookingSource = 'ONLINE' | 'MANUAL';

export type BookingStatus =
  | 'DRAFT'
  | 'HELD'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

// Payment status in Admin may temporarily carry 'DELETED' to represent soft-deleted state.
// Keep dropdown options limited (below) to UNPAID/PAID/PARTIAL/null.
export type PaymentStatus = 'UNPAID' | 'PAID' | 'PARTIAL' | 'DELETED' | null;

export type AdminBookingService = {
  id: number;
  serviceId: number;
  serviceName: string | null;
  serviceCode: string | null;
  pricingMode: string | null;
  engineTierId: number | null;
  engineTierName: string | null;
  unitPricePence: number;
};

type AdminBookingDocument = {
  id: number;
  type: string;
  status: string;
  number: string;
  totalAmountPence: number;
  vatAmountPence: number;
  pdfUrl: string | null;
  issuedAt: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminBookingResponse = {
  id: number;
  status: BookingStatus;
  source: BookingSource;
  paymentStatus: PaymentStatus;
  internalNotes: string | null;
  notes: string | null;
  slotDate: string;
  slotTime: string;
  createdAt: string;
  updatedAt: string;
  holdId: string | null;
  services: AdminBookingService[];
  customer: {
    name: string;
    email: string;
    phone: string | null;
    mobile: string | null;
    landline: string | null;
    company: string | null;
    title: string | null;
    firstName: string | null;
    lastName: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    addressLine3: string | null;
    city: string | null;
    county: string | null;
    postcode: string | null;
    wantsSmsReminder: boolean;
    profile: {
      id: number;
      email: string;
      firstName: string | null;
      lastName: string | null;
      mobileNumber: string | null;
      landlineNumber: string | null;
    } | null;
  };
  vehicle: {
    registration: string;
    make: string | null;
    model: string | null;
    engineSizeCc: number | null;
  };
  totals: {
    servicesAmountPence: number;
    invoiceAmountPence: number | null;
    invoiceVatAmountPence: number | null;
  };
  documents: AdminBookingDocument[];
  statusHistory: {
    status: BookingStatus;
    changedAt: string;
  }[];
};

const STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'HELD', label: 'Held' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No Show' },
];

const STATUS_BADGES: Record<BookingStatus, string> = {
  CONFIRMED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  HELD: 'bg-yellow-500/20 text-yellow-200 border-yellow-400/40',
  DRAFT: 'bg-slate-500/20 text-slate-200 border-slate-500/40',
  COMPLETED: 'bg-blue-500/20 text-blue-200 border-blue-400/40',
  CANCELLED: 'bg-red-500/20 text-red-200 border-red-400/40',
  NO_SHOW: 'bg-amber-700/20 text-amber-200 border-amber-500/40',
};

const PAYMENT_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: null, label: 'Not recorded' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIAL', label: 'Partial' },
];

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminBookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<AdminBookingResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusToUpdate, setStatusToUpdate] = useState<BookingStatus | null>(null);
  const [paymentStatusToUpdate, setPaymentStatusToUpdate] = useState<PaymentStatus>(null);
  const [internalNotesDraft, setInternalNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [servicePriceDrafts, setServicePriceDrafts] = useState<Record<number, string>>({});

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 2,
      }),
    [],
  );

  useEffect(() => {
    if (!bookingId) {
      navigate('/admin/bookings');
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setStatus('loading');
        setError(null);
        const data = await apiGet<AdminBookingResponse>(`/admin/bookings/${bookingId}`);
        if (!cancelled) {
          setBooking(data);
          setStatus('idle');
          setStatusToUpdate(data.status);
        setPaymentStatusToUpdate(data.paymentStatus ?? null);
        setInternalNotesDraft(data.internalNotes ?? '');
        setServicePriceDrafts(() =>
          Object.fromEntries(data.services.map((s) => [s.id, (s.unitPricePence / 100).toFixed(2)])),
        );
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setError((err as Error).message ?? 'Failed to load booking');
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [bookingId, navigate]);

  const refreshBooking = async () => {
    if (!bookingId) return;
    const data = await apiGet<AdminBookingResponse>(`/admin/bookings/${bookingId}`);
    setBooking(data);
    setStatusToUpdate(data.status);
    setPaymentStatusToUpdate(data.paymentStatus ?? null);
    setInternalNotesDraft(data.internalNotes ?? '');
  };

  const handleCreateInvoiceDraft = async () => {
    if (!bookingId || !booking) return;
    try {
      const draft = await apiPost<any>(`/admin/documents`, {
        bookingId: Number(bookingId),
        lines: booking.services.length > 0
          ? booking.services.map((s) => ({ description: s.serviceName || 'Service', quantity: 1, unitPricePence: s.unitPricePence }))
          : [{ description: 'Service', quantity: 1, unitPricePence: booking.totals.servicesAmountPence }],
        customer: { name: booking.customer.name, email: booking.customer.email },
      });
      toast.success('Draft invoice created');
      navigate(`/admin/financial?edit=${draft.id}`);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to create draft');
    }
  };

  const handleStatusUpdate = async () => {
    if (!bookingId || !statusToUpdate) return;
    try {
      setLoadingAction(true);
      const data = await apiPatch<AdminBookingResponse>(`/admin/bookings/${bookingId}/status`, {
        status: statusToUpdate,
      });
      setBooking(data);
      toast.success('Status updated');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to update status');
    } finally {
      setLoadingAction(false);
    }
  };

  const handlePaymentUpdate = async () => {
    if (!bookingId) return;
    try {
      setLoadingAction(true);
      const data = await apiPatch<AdminBookingResponse>(`/admin/bookings/${bookingId}/payment-status`, {
        paymentStatus: paymentStatusToUpdate,
      });
      setBooking(data);
      toast.success('Payment status updated');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to update payment status');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!bookingId) return;
    try {
      setSavingNotes(true);
      const data = await apiPatch<AdminBookingResponse>(`/admin/bookings/${bookingId}/internal-notes`, {
        internalNotes: internalNotesDraft,
      });
      setBooking(data);
      setInternalNotesDraft(data.internalNotes ?? '');
      toast.success('Internal notes updated');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to update internal notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleIssueInvoice = async () => {
    if (!bookingId) return;
    try {
      setLoadingAction(true);
      const data = await apiPost<AdminBookingResponse>(`/admin/bookings/${bookingId}/documents/invoice`);
      setBooking(data);
      toast.success('Invoice issued');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to issue invoice');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleEmailInvoice = async () => {
    if (!bookingId) return;
    try {
      setLoadingAction(true);
      const data = await apiPost<AdminBookingResponse>(`/admin/bookings/${bookingId}/documents/invoice/email`);
      setBooking(data);
      toast.success('Invoice email sent');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to email invoice');
    } finally {
      setLoadingAction(false);
    }
  };

  const parsePriceToPence = (value: string): number | null => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    if (!cleaned) return null;
    const num = Number(cleaned);
    if (!Number.isFinite(num) || num < 0) return null;
    return Math.round(num * 100);
  };

  const handleSaveServicePrice = async (serviceLineId: number) => {
    if (!bookingId) return;
    const raw = servicePriceDrafts[serviceLineId] ?? '';
    const pence = parsePriceToPence(raw);
    if (pence === null) {
      toast.error('Enter a valid price');
      return;
    }
    try {
      setLoadingAction(true);
      const data = await apiPatch<AdminBookingResponse>(
        `/admin/bookings/${bookingId}/services/${serviceLineId}`,
        { unitPricePence: pence },
      );
      setBooking(data);
      setServicePriceDrafts((prev) => ({ ...prev, [serviceLineId]: (pence / 100).toFixed(2) }));
      toast.success('Service price updated');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to update service price');
    } finally {
      setLoadingAction(false);
    }
  };

  const [customerDraft, setCustomerDraft] = useState({
    name: '',
    email: '',
    phone: '',
    mobile: '',
    landline: '',
    company: '',
    title: '',
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    city: '',
    county: '',
    postcode: '',
  });

  const [vehicleDraft, setVehicleDraft] = useState({
    registration: '',
    make: '',
    model: '',
    engineSizeCc: '' as string | number,
  });

  useEffect(() => {
    if (!booking) return;
    setCustomerDraft({
      name: booking.customer.name ?? '',
      email: booking.customer.email ?? '',
      phone: booking.customer.phone ?? '',
      mobile: booking.customer.mobile ?? '',
      landline: booking.customer.landline ?? '',
      company: booking.customer.company ?? '',
      title: booking.customer.title ?? '',
      firstName: booking.customer.firstName ?? '',
      lastName: booking.customer.lastName ?? '',
      addressLine1: booking.customer.addressLine1 ?? '',
      addressLine2: booking.customer.addressLine2 ?? '',
      addressLine3: booking.customer.addressLine3 ?? '',
      city: booking.customer.city ?? '',
      county: booking.customer.county ?? '',
      postcode: booking.customer.postcode ?? '',
    });
    setVehicleDraft({
      registration: booking.vehicle.registration ?? '',
      make: booking.vehicle.make ?? '',
      model: booking.vehicle.model ?? '',
      engineSizeCc: booking.vehicle.engineSizeCc ?? '',
    });
  }, [booking]);

  const handleSaveCustomer = async () => {
    if (!bookingId) return;
    try {
      setLoadingAction(true);
      const data = await apiPatch<AdminBookingResponse>(`/admin/bookings/${bookingId}/customer`, {
        ...customerDraft,
      });
      setBooking(data);
      setEditingCustomer(false);
      toast.success('Customer details updated');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to update customer');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSaveVehicle = async () => {
    if (!bookingId) return;
    try {
      setLoadingAction(true);
      const payload: any = {
        registration: String(vehicleDraft.registration || ''),
        make: String(vehicleDraft.make || ''),
        model: String(vehicleDraft.model || ''),
      };
      const cc = Number(vehicleDraft.engineSizeCc);
      if (!Number.isNaN(cc)) payload.engineSizeCc = cc;
      const data = await apiPatch<AdminBookingResponse>(`/admin/bookings/${bookingId}/vehicle`, payload);
      setBooking(data);
      setEditingVehicle(false);
      toast.success('Vehicle details updated');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to update vehicle');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!bookingId) return;
    const ok = window.confirm('Are you sure you want to delete this booking? It can be restored from Deleted.');
    if (!ok) return;
    try {
      setLoadingAction(true);
      const data = await apiPatch<AdminBookingResponse>(`/admin/bookings/${bookingId}/delete`);
      setBooking(data);
      toast.success('Booking moved to Deleted');
      navigate('/admin/bookings?tab=deleted');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to delete booking');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRestoreBooking = async () => {
    if (!bookingId) return;
    const ok = window.confirm('Restore this booking? It will reappear in the main lists.');
    if (!ok) return;
    try {
      setLoadingAction(true);
      const data = await apiPatch<AdminBookingResponse>(`/admin/bookings/${bookingId}/restore`);
      setBooking(data);
      toast.success('Booking restored');
      navigate('/admin/bookings?tab=upcoming');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to restore booking');
    } finally {
      setLoadingAction(false);
    }
  };

  const totalServices = booking ? currencyFormatter.format(booking.totals.servicesAmountPence / 100) : '—';
  const invoiceTotal =
    booking && booking.totals.invoiceAmountPence !== null
      ? currencyFormatter.format(booking.totals.invoiceAmountPence / 100)
      : '—';
  const invoiceVat =
    booking && booking.totals.invoiceVatAmountPence !== null
      ? currencyFormatter.format(booking.totals.invoiceVatAmountPence / 100)
      : '—';

  if (status === 'loading' && !booking) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <div className="h-4 w-24 rounded bg-slate-800" />
          <div className="mt-4 h-8 w-1/2 rounded bg-slate-800" />
          <div className="mt-6 h-16 rounded bg-slate-800" />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-sm text-red-200">
          <p className="font-semibold">Unable to load booking #{bookingId}</p>
          <p className="mt-2">{error}</p>
          <div className="mt-4">
            <button
              onClick={() => refreshBooking()}
              className="rounded-full border border-red-200/40 px-4 py-2 text-xs font-semibold text-red-100 transition hover:border-orange-500 hover:text-orange-300"
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  const slotLabel = `${formatDate(booking.slotDate)} at ${booking.slotTime}`;

  const hasInvoice = booking.documents.some((document) => document.type === 'INVOICE');
  const latestInvoice = booking.documents
    .filter((document) => document.type === 'INVOICE')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-slate-500">
              <span>Booking #{booking.id}</span>
              <BookingSourceBadge source={booking.source} />
              <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[11px] text-slate-300">
                Created {formatDateTime(booking.createdAt)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-2xl font-semibold text-white">{slotLabel}</span>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_BADGES[booking.status]}`}>
                {STATUS_OPTIONS.find((option) => option.value === booking.status)?.label ?? booking.status}
              </span>
              {booking.holdId && (
                <span className="rounded-full border border-yellow-500/40 px-3 py-1 text-xs font-semibold text-yellow-200">
                  Hold ID: {booking.holdId}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/bookings"
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-orange-500 hover:text-orange-300"
            >
              Back to list
            </Link>
            <button
              onClick={refreshBooking}
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-orange-500 hover:text-orange-300"
              type="button"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Customer</h3>
            <button
              onClick={() => setEditingCustomer((v) => !v)}
              className="rounded-full border border-slate-600 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:border-orange-500 hover:text-orange-300"
              type="button"
            >
              {editingCustomer ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {editingCustomer ? (
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Name" value={customerDraft.name} onChange={(e) => setCustomerDraft({ ...customerDraft, name: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Email" value={customerDraft.email} onChange={(e) => setCustomerDraft({ ...customerDraft, email: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Phone" value={customerDraft.phone} onChange={(e) => setCustomerDraft({ ...customerDraft, phone: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Mobile" value={customerDraft.mobile} onChange={(e) => setCustomerDraft({ ...customerDraft, mobile: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Landline" value={customerDraft.landline} onChange={(e) => setCustomerDraft({ ...customerDraft, landline: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Company" value={customerDraft.company} onChange={(e) => setCustomerDraft({ ...customerDraft, company: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Title" value={customerDraft.title} onChange={(e) => setCustomerDraft({ ...customerDraft, title: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="First name" value={customerDraft.firstName} onChange={(e) => setCustomerDraft({ ...customerDraft, firstName: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Last name" value={customerDraft.lastName} onChange={(e) => setCustomerDraft({ ...customerDraft, lastName: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Address line 1" value={customerDraft.addressLine1} onChange={(e) => setCustomerDraft({ ...customerDraft, addressLine1: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Address line 2" value={customerDraft.addressLine2} onChange={(e) => setCustomerDraft({ ...customerDraft, addressLine2: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Address line 3" value={customerDraft.addressLine3} onChange={(e) => setCustomerDraft({ ...customerDraft, addressLine3: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="City" value={customerDraft.city} onChange={(e) => setCustomerDraft({ ...customerDraft, city: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="County" value={customerDraft.county} onChange={(e) => setCustomerDraft({ ...customerDraft, county: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Postcode" value={customerDraft.postcode} onChange={(e) => setCustomerDraft({ ...customerDraft, postcode: e.target.value })} />
              <div className="sm:col-span-2">
                <button onClick={handleSaveCustomer} className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black hover:bg-orange-400">Save</button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-2 text-sm text-slate-200">
              <div>
                <span className="font-semibold text-white">{booking.customer.name}</span>
                <span className="text-slate-400"> • {booking.customer.email}</span>
              </div>
              <div className="text-slate-400">
                {booking.customer.phone && <span className="mr-4">Phone: {booking.customer.phone}</span>}
                {booking.customer.mobile && <span className="mr-4">Mobile: {booking.customer.mobile}</span>}
                {booking.customer.company && <span>Company: {booking.customer.company}</span>}
              </div>
              <div className="text-xs text-slate-400">
                {[booking.customer.addressLine1, booking.customer.addressLine2, booking.customer.addressLine3, booking.customer.city, booking.customer.county, booking.customer.postcode]
                  .filter(Boolean)
                  .join(', ')}
              </div>
              {booking.customer.profile && (
                <div className="text-xs text-slate-400">
                  Linked account #{booking.customer.profile.id} ({booking.customer.profile.email})
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Payment</h3>
          <div className="mt-4 space-y-3">
            <div className="text-sm text-slate-200">
              <div className="text-xs uppercase tracking-wide text-slate-500">Services total</div>
              <div className="text-lg font-semibold text-white">{totalServices}</div>
            </div>
            <div className="text-sm text-slate-200">
              <div className="text-xs uppercase tracking-wide text-slate-500">Invoice total</div>
              <div className="text-lg font-semibold text-white">{invoiceTotal}</div>
              <div className="text-xs text-slate-400">VAT {invoiceVat}</div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Payment status</label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={paymentStatusToUpdate === null ? 'null' : paymentStatusToUpdate}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPaymentStatusToUpdate(value === 'null' ? null : (value as PaymentStatus));
                  }}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                >
                  {PAYMENT_OPTIONS.map((option) => (
                    <option key={option.label} value={option.value ?? 'null'}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handlePaymentUpdate}
                  className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-700/40"
                  type="button"
                  disabled={loadingAction}
                >
                  Save
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCreateInvoiceDraft}
                className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-orange-500 hover:text-orange-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
                type="button"
                disabled={loadingAction}
              >
                Create invoice draft
              </button>
              <button
                onClick={handleIssueInvoice}
                className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-orange-500 hover:text-orange-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
                type="button"
                disabled={loadingAction}
              >
                Issue invoice
              </button>
              <button
                onClick={handleEmailInvoice}
                className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-orange-500 hover:text-orange-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
                type="button"
                disabled={loadingAction || !hasInvoice}
              >
                Email invoice
              </button>
            </div>
            {latestInvoice && (
              <div className="rounded-lg border border-slate-700/80 bg-slate-800/60 p-3 text-xs text-slate-300">
                Latest invoice:
                <div className="mt-1 font-semibold text-white">{latestInvoice.number}</div>
                <div>Issued {formatDateTime(latestInvoice.issuedAt)}</div>
                <div>
                  <a
                    href={latestInvoice.pdfUrl ?? undefined}
                    className="text-orange-300 underline underline-offset-4"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download PDF
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Status</h3>
            <span className="text-xs text-slate-400">Updated {formatDateTime(booking.updatedAt)}</span>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusToUpdate ?? booking.status}
                onChange={(event) => setStatusToUpdate(event.target.value as BookingStatus)}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleStatusUpdate}
                className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-700/40"
                type="button"
                disabled={loadingAction}
              >
                Update Status
              </button>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 text-xs text-slate-300">
              <div className="font-semibold uppercase tracking-wide text-slate-400">History</div>
              <ul className="mt-2 space-y-2">
                {booking.statusHistory.map((entry) => (
                  <li key={`${entry.status}-${entry.changedAt}`}>
                    <span className="font-semibold text-white">{entry.status}</span>
                    <span className="text-slate-400"> — {formatDateTime(entry.changedAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Internal Notes</h3>
          <div className="mt-4 space-y-3">
            <textarea
              value={internalNotesDraft}
              onChange={(event) => setInternalNotesDraft(event.target.value)}
              rows={6}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              placeholder="Add notes for staff..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveNotes}
                className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-700/40"
                type="button"
                disabled={savingNotes}
              >
                Save Notes
              </button>
              <button
                onClick={() => setInternalNotesDraft(booking.internalNotes ?? '')}
                className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-orange-500 hover:text-orange-300"
                type="button"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Services</h3>
          <div className="mt-4 space-y-3">
            {booking.services.length === 0 ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-300">
                No services recorded.
              </div>
            ) : (
              booking.services.map((service) => (
                <div
                  key={service.id}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-200"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">{service.serviceName ?? 'Service'}</span>
                    {service.engineTierName && (
                      <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300">
                        {service.engineTierName}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-400 sm:grid-cols-3">
                    <div>Code: {service.serviceCode ?? '—'}</div>
                    <div>Pricing: {service.pricingMode ?? '—'}</div>
                    <div className="flex items-center gap-2">
                      <span>Price:</span>
                      <input
                        value={servicePriceDrafts[service.id] ?? ''}
                        onChange={(e) =>
                          setServicePriceDrafts((prev) => ({ ...prev, [service.id]: e.target.value }))
                        }
                        className="w-24 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white"
                        placeholder="0.00"
                        inputMode="decimal"
                      />
                      <button
                        onClick={() => handleSaveServicePrice(service.id)}
                        className="rounded-full border border-slate-600 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:border-orange-500 hover:text-orange-300"
                        type="button"
                        disabled={loadingAction}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Vehicle</h3>
            <button
              onClick={() => setEditingVehicle((v) => !v)}
              className="rounded-full border border-slate-600 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:border-orange-500 hover:text-orange-300"
              type="button"
            >
              {editingVehicle ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {editingVehicle ? (
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Registration" value={vehicleDraft.registration} onChange={(e) => setVehicleDraft({ ...vehicleDraft, registration: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Make" value={vehicleDraft.make} onChange={(e) => setVehicleDraft({ ...vehicleDraft, make: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Model" value={vehicleDraft.model} onChange={(e) => setVehicleDraft({ ...vehicleDraft, model: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Engine size (cc)" value={vehicleDraft.engineSizeCc} onChange={(e) => setVehicleDraft({ ...vehicleDraft, engineSizeCc: e.target.value })} />
              <div className="sm:col-span-2">
                <button onClick={handleSaveVehicle} className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black hover:bg-orange-400">Save</button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-2 text-sm text-slate-200">
              <div className="text-lg font-semibold text-white">{booking.vehicle.registration}</div>
              <div className="text-slate-400">
                {[booking.vehicle.make, booking.vehicle.model].filter(Boolean).join(' • ') || 'No vehicle details'}
              </div>
              {typeof booking.vehicle.engineSizeCc === 'number' && (
                <div className="text-xs text-slate-400">Engine size: {booking.vehicle.engineSizeCc}cc</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Documents</h3>
        <div className="mt-4 space-y-3">
          {booking.documents.length === 0 ? (
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-300">
              No documents issued.
            </div>
          ) : (
            booking.documents.map((document) => (
              <div
                key={document.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-200 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-semibold text-white">{document.number}</div>
                  <div className="text-xs text-slate-400">
                    {document.type} • {document.status} • {formatDateTime(document.createdAt)}
                  </div>
                  <div className="text-xs text-slate-400">
                    Total {currencyFormatter.format(document.totalAmountPence / 100)} (VAT{' '}
                    {currencyFormatter.format(document.vatAmountPence / 100)})
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-orange-300">
                  {document.pdfUrl ? (
                    <a
                      href={document.pdfUrl}
                      className="underline underline-offset-4"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download PDF
                    </a>
                  ) : (
                    <span className="text-slate-500">PDF pending</span>
                  )}
                  {document.dueAt && <span className="text-slate-400">Due {formatDate(document.dueAt)}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-red-900 bg-red-950/40 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-red-300">Danger Zone</h3>
        {booking.paymentStatus === 'DELETED' ? (
          <div className="mt-2 space-y-3 text-sm">
            <p className="text-red-200">This booking is deleted. You can restore it to return it to the main lists.</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRestoreBooking}
                className="rounded-full border border-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed"
                type="button"
                disabled={loadingAction}
              >
                Restore Booking
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2 space-y-3 text-sm">
            <p className="text-red-200">Delete this booking. It will appear under the Deleted tab, where you can restore or delete permanently.</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSoftDelete}
                className="rounded-full border border-red-500 px-4 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed"
                type="button"
                disabled={loadingAction}
              >
                Delete Booking
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
