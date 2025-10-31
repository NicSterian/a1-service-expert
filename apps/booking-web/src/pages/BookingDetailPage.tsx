import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiGet } from '../lib/api';
import { getToken } from '../lib/auth';

type BookingStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'EXPIRED';

type BookingDocument = {
  id: number;
  type: string;
  number: string;
  status: string;
  totalAmountPence: number;
  vatAmountPence: number;
  pdfUrl: string | null;
  validUntil: string | null;
};

type BookingServiceLine = {
  id: number;
  name: string;
  description: string | null;
  pricingMode: string | null;
  serviceCode: string | null;
  engineTier: {
    id: number;
    name: string;
    code: string | null;
    sortOrder: number;
  } | null;
  unitPricePence: number;
};

type BookingDetailResponse = {
  id: number;
  status: BookingStatus;
  slotDate: string;
  slotTime: string;
  createdAt: string;
  updatedAt: string;
  holdId: string | null;
  acceptedTermsAt: string | null;
  notes: string | null;
  totals: {
    servicesAmountPence: number;
    invoiceAmountPence: number | null;
    invoiceVatAmountPence: number | null;
  };
  customer: {
    title: string | null;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    email: string;
    mobileNumber: string | null;
    landlineNumber: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    addressLine3: string | null;
    city: string | null;
    county: string | null;
    postcode: string | null;
  };
  vehicle: {
    registration: string;
    make: string | null;
    model: string | null;
    engineSizeCc: number | null;
  };
  services: BookingServiceLine[];
  documents: BookingDocument[];
};

export function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingDetailResponse | null>(null);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
      }),
    [],
  );

  useEffect(() => {
    if (!bookingId) {
      navigate('/account', { replace: true });
      return;
    }

    if (!getToken()) {
      navigate('/login', { replace: true, state: { from: location.pathname } });
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setStatus('loading');
        setError(null);
        const data = await apiGet<BookingDetailResponse>(`/bookings/${bookingId}`);
        if (!cancelled) {
          setBooking(data);
          setStatus('success');
        }
      } catch (err) {
        if (!cancelled) {
          const message = (err as Error).message ?? 'Unable to load booking.';
          setError(message);
          setStatus('error');
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [bookingId, navigate, location.pathname]);

  const formatDate = (value: string) => {
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
  };

  const formatTime = (value: string) => value;

  const formatCurrency = (value: number | null | undefined) => {
    if (typeof value !== 'number') {
      return 'N/A';
    }
    return currencyFormatter.format(value / 100);
  };

  const renderStatusBadge = (statusValue: BookingStatus) => {
    const styles: Record<BookingStatus, string> = {
      CONFIRMED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      PENDING: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      DRAFT: 'bg-slate-600/30 text-slate-300 border-slate-500/30',
      CANCELLED: 'bg-red-500/10 text-red-300 border-red-500/30',
      COMPLETED: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
      EXPIRED: 'bg-slate-700/40 text-slate-400 border-slate-600/40',
    };
    const badgeStyles = styles[statusValue] ?? 'bg-slate-700 text-slate-300 border-slate-600';
    const label = statusValue.charAt(0) + statusValue.slice(1).toLowerCase();

    return (
      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${badgeStyles}`}>
        {label}
      </span>
    );
  };

  if (status === 'loading') {
    return (
      <div className="space-y-8">
        <div className="animate-pulse rounded-3xl border border-slate-700 bg-slate-900 p-8">
          <div className="h-4 w-32 rounded bg-slate-800" />
          <div className="mt-4 h-8 w-3/4 rounded bg-slate-800" />
          <div className="mt-6 h-16 rounded bg-slate-800" />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-sm text-red-200">
          <p className="font-semibold">We couldn't load that booking.</p>
          <p className="mt-1">{error}</p>
          <Link to="/account" className="mt-4 inline-flex items-center justify-center rounded-full border border-white/30 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:border-brand-orange hover:text-brand-orange">
            Back to account
          </Link>
        </div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  const invoiceDocument = booking.documents.find((doc) => doc.type === 'INVOICE') ?? null;
  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-brand-orange">Booking detail</p>
            <h1 className="text-3xl font-semibold text-white">Reference #{invoiceDocument?.number ?? booking.id}</h1>
            <p className="text-sm text-slate-200">
              {formatDate(booking.slotDate)} - {formatTime(booking.slotTime)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {renderStatusBadge(booking.status)}
              <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white">
                Total {formatCurrency(booking.totals.invoiceAmountPence ?? booking.totals.servicesAmountPence)}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm text-slate-300">
            <Link
              to="/account"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:border-brand-orange hover:text-brand-orange"
            >
              Back to account
            </Link>
            <Link
              to="/online-booking"
              className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-4 py-2 text-xs font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-orange-400"
            >
              Book another visit
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-inner">
          <h2 className="text-xl font-semibold text-white">Services & totals</h2>
          <ul className="space-y-3 text-sm text-slate-300">
            {booking.services.map((service) => (
              <li key={service.id} className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{service.name}</p>
                    {service.serviceCode ? (
                      <p className="text-[11px] text-slate-400">Code: {service.serviceCode}</p>
                    ) : null}
                    {service.engineTier ? (
                      <p className="text-xs text-slate-400">{service.engineTier.name}</p>
                    ) : null}
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {formatCurrency(service.unitPricePence)}
                  </span>
                </div>
                {service.description ? (
                  <p className="mt-2 text-xs text-slate-300">{service.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-300">
            <p className="flex justify-between">
              <span>Service total</span>
              <span className="font-semibold text-white">
                {formatCurrency(booking.totals.servicesAmountPence)}
              </span>
            </p>
            <p className="flex justify-between text-xs text-slate-400">
              <span>Invoice total</span>
              <span>{formatCurrency(booking.totals.invoiceAmountPence ?? booking.totals.servicesAmountPence)}</span>
            </p>
            <p className="flex justify-between text-xs text-slate-400">
              <span>VAT</span>
              <span>{formatCurrency(booking.totals.invoiceVatAmountPence ?? 0)}</span>
            </p>
          </div>
          {booking.notes ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 text-xs text-slate-300">
              <p className="font-semibold text-white">Notes for the workshop</p>
              <p className="mt-1">{booking.notes}</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-inner text-sm text-slate-300">
          <h2 className="text-xl font-semibold text-white">Vehicle & contact</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vehicle</dt>
              <dd className="text-sm text-white">
                {booking.vehicle.registration}
                {booking.vehicle.make || booking.vehicle.model
                  ? ` - ${[booking.vehicle.make, booking.vehicle.model].filter(Boolean).join(' ')}`
                  : ''}
              </dd>
            </div>
            {booking.vehicle.engineSizeCc ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Engine size</dt>
                <dd className="text-sm text-white">{booking.vehicle.engineSizeCc} cc</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</dt>
              <dd className="text-sm text-white">
                {[booking.customer.title, booking.customer.firstName, booking.customer.lastName]
                  .filter(Boolean)
                  .join(' ') || booking.customer.email}
              </dd>
            </div>
            {booking.customer.companyName ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Company</dt>
                <dd className="text-sm text-white">{booking.customer.companyName}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contact</dt>
              <dd className="space-y-1 text-sm text-slate-300">
                <p>{booking.customer.email}</p>
                {booking.customer.mobileNumber ? <p>{booking.customer.mobileNumber}</p> : null}
                {booking.customer.landlineNumber ? <p>{booking.customer.landlineNumber}</p> : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Address</dt>
              <dd className="space-y-1 text-sm text-slate-300">
                {[booking.customer.addressLine1, booking.customer.addressLine2, booking.customer.addressLine3]
                  .filter(Boolean)
                  .map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                {[booking.customer.city, booking.customer.county, booking.customer.postcode]
                  .filter(Boolean)
                  .join(', ')}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-inner text-sm text-slate-300">
        <h2 className="text-xl font-semibold text-white">Documents</h2>
        {booking.documents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-xs text-slate-400">
            <p>Documents will appear here once our workshop uploads them.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {booking.documents.map((doc) => {
              const downloadReady = Boolean(doc.pdfUrl);
              return (
                <div key={doc.id} className="rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-300 shadow-sm">
                  <p className="text-sm font-semibold text-white">{doc.type}</p>
                  <p className="text-xs text-slate-400">Number: {doc.number}</p>
                  <p className="text-xs text-slate-400">Status: {doc.status}</p>
                  <p className="text-xs text-slate-400">
                    Total: {formatCurrency(doc.totalAmountPence)} - VAT: {formatCurrency(doc.vatAmountPence)}
                  </p>
                  {doc.validUntil ? (
                    <p className="text-xs text-slate-400">Valid until {formatDate(doc.validUntil)}</p>
                  ) : null}
                  {downloadReady ? (
                    <a href={doc.pdfUrl ?? undefined} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-brand-orange underline">
                      Download PDF
                    </a>
                  ) : (
                    <p className="mt-3 text-xs text-slate-400">PDF will be available shortly.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default BookingDetailPage;










