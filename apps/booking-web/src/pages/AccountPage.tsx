import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet } from '../lib/api';
import { clearAuthToken, getToken } from '../lib/auth';

interface MeResponse {
  user: {
    id: number;
    email: string;
    role: string;
    emailVerified: boolean;
  };
}

interface BookingDocument {
  id: number;
  type: string;
  number: string;
  status: string;
  totalAmountPence: number;
  vatAmountPence: number;
  pdfUrl?: string | null;
  validUntil?: string | null;
}

interface BookingSummary {
  id: number;
  status: string;
  slotDate: string;
  slotTime: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string | null;
  engineTierName: string | null;
  totalAmountPence: number;
  holdId?: string | null;
  notes?: string | null;
  documents: BookingDocument[];
}

export function AccountPage() {
  const navigate = useNavigate();
  const [profileStatus, setProfileStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [bookingsStatus, setBookingsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [user, setUser] = useState<MeResponse['user'] | null>(null);
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const token = getToken();

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
      }),
    [],
  );

  useEffect(() => {
    if (!token) {
      setProfileStatus('idle');
      setBookingsStatus('idle');
      setUser(null);
      setBookings([]);
      return;
    }

    let cancelled = false;

    const fetchMe = async () => {
      try {
        setProfileStatus('loading');
        setProfileError(null);
        const response = await apiGet<MeResponse>('/auth/me');
        if (!cancelled) {
          setUser(response.user);
          setProfileStatus('success');
        }
      } catch (err) {
        if (!cancelled) {
          setProfileStatus('error');
          setProfileError((err as Error).message);
        }
      }
    };

    fetchMe();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    let cancelled = false;

    const fetchBookings = async () => {
      try {
        setBookingsStatus('loading');
        setBookingsError(null);
        const data = await apiGet<BookingSummary[]>('/bookings/mine');
        if (!cancelled) {
          setBookings(data);
          setBookingsStatus('success');
        }
      } catch (err) {
        if (!cancelled) {
          setBookingsStatus('error');
          setBookingsError((err as Error).message);
        }
      }
    };

    fetchBookings();

    return () => {
      cancelled = true;
    };
  }, [token, user]);

  const handleLogout = () => {
    clearAuthToken();
    toast.success('You have been logged out.');
    navigate('/');
  };

  if (!token) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl bg-slate-900 px-6 py-10 text-white shadow-lg">
          <h1 className="text-3xl font-semibold">My Account</h1>
          <p className="mt-2 text-sm text-slate-200">Log in to view your profile, bookings, and documents.</p>
          <Link
            to="/login"
            state={{ from: '/account' }}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-brand-orange px-5 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-orange-400"
          >
            Go to login
          </Link>
        </div>
      </section>
    );
  }

  const renderStatusBadge = (status: string) => {
    const normalized = status.toUpperCase();
    const isConfirmed = normalized === 'CONFIRMED';
    const isDraft = normalized === 'DRAFT' || normalized === 'HELD';
    const badgeClass = isConfirmed
      ? 'bg-emerald-100 text-emerald-700'
      : isDraft
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-200 text-slate-700';

    const baseClass = 'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold';
    return <span className={`${baseClass} ${badgeClass}`}>{normalized}</span>;
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const formatTime = (time: string) => time.slice(0, 5);

  const formatCurrency = (amountPence: number) => currencyFormatter.format(amountPence / 100);

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
        <div className="relative grid gap-10 p-8 sm:grid-cols-[1.2fr_0.8fr] sm:p-12">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-orange">My Account</p>
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Welcome back{user ? `, ${user.email.split('@')[0]}` : ''}.
            </h1>
            <p className="max-w-xl text-sm text-slate-200">
              Review your upcoming visits, download invoices and quotes, and keep your contact details up to date.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-200">
              {user?.emailVerified ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-semibold text-white">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> Email verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100/10 px-3 py-1 font-semibold text-amber-100">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Verification required
                </span>
              )}
              <Link
                to="/online-booking"
                className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-4 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-orange-400"
              >
                Book another visit
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
              </Link>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-100 backdrop-blur">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-brand-orange">Profile snapshot</p>
              <p className="mt-3 text-lg font-semibold">{user?.email ?? 'Loading'}</p>
              <p className="text-xs text-slate-300">Role: {user?.role ?? '-'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:border-brand-orange hover:text-brand-orange"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-brand-black">Booking history</h2>
          {bookingsStatus === 'loading' ? (
            <p className="text-sm text-slate-500">Loading bookings...</p>
          ) : bookingsStatus === 'error' ? (
            <p className="text-sm text-red-600">{bookingsError ?? 'Unable to load bookings right now.'}</p>
          ) : bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              <p>No bookings yet. Once you schedule your first visit, it will appear here with download links.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {bookings.map((booking) => (
                <li key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-brand-black">
                        {booking.serviceName ?? 'Service'}
                        {booking.engineTierName ? ` - ${booking.engineTierName}` : ''}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(booking.slotDate)} at {formatTime(booking.slotTime)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {renderStatusBadge(booking.status)}
                      <span className="text-sm font-semibold text-brand-black">
                        {formatCurrency(booking.totalAmountPence)}
                      </span>
                    </div>
                  </div>
                  {booking.notes ? (
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <span className="font-semibold text-brand-black">Customer notes:</span> {booking.notes}
                    </p>
                  ) : null}
                  {booking.documents.length > 0 ? (
                    <div className="mt-4 space-y-2 text-xs">
                      <p className="font-semibold text-brand-black">Documents</p>
                      <div className="flex flex-wrap gap-2">
                        {booking.documents.map((doc) => {
                          const docClasses = doc.pdfUrl
                            ? 'border-brand-orange text-brand-orange hover:-translate-y-0.5 hover:bg-orange-50'
                            : 'cursor-not-allowed border-slate-200 text-slate-400';
                          return (
                            <a
                              key={doc.id}
                              href={doc.pdfUrl ?? undefined}
                              target="_blank"
                              rel="noreferrer"
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-medium transition ${docClasses}`}
                            >
                              {doc.type}
                              <span className="text-[10px] text-slate-400">{doc.number}</span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm text-sm text-slate-600">
          <h2 className="text-xl font-semibold text-brand-black">Contact details</h2>
          {profileStatus === 'loading' ? (
            <p className="text-sm text-slate-500">Loading profile...</p>
          ) : profileStatus === 'error' ? (
            <p className="text-sm text-red-600">{profileError ?? 'Unable to load your profile right now.'}</p>
          ) : user ? (
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
                <dd className="text-sm text-brand-black">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</dt>
                <dd className="text-sm text-brand-black">{user.role}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Verification</dt>
                <dd className="text-sm text-brand-black">{user.emailVerified ? 'Verified' : 'Pending verification'}</dd>
              </div>
            </dl>
          ) : null}
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
            <p>Need to update your contact details? Let us know when you confirm your next booking or call the workshop.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
