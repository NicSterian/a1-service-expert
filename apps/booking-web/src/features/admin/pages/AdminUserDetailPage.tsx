import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../../lib/api';
import { BookingSourceBadge } from '../bookings/BookingSourceBadge';

type BookingSource = 'ONLINE' | 'MANUAL';
type BookingStatus = 'DRAFT' | 'HELD' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

type UserSummary = {
  registeredAt: string;
  lastLoginAt: string | null;
  totalBookings: number;
  totalSpentPence: number;
  deletedAt: string | null;
};

type UserContact = {
  id: number;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  companyName: string | null;
  mobileNumber: string | null;
  landlineNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressLine3: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  deletedAt: string | null;
};

type UserBooking = {
  id: number;
  status: BookingStatus;
  source: BookingSource;
  slotDate: string;
  slotTime: string;
  createdAt: string;
  serviceNames: string[];
  totalAmountPence: number;
};

type UserDocument = {
  id: number;
  type: string;
  number: string;
  status: string;
  totalAmountPence: number;
  vatAmountPence: number;
  pdfUrl: string | null;
  createdAt: string;
  issuedAt: string | null;
};

type AdminUserDetailResponse = {
  user: UserContact;
  summary: UserSummary;
  bookings: UserBooking[];
  documents: UserDocument[];
};

export function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AdminUserDetailResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currency = useMemo(
    () => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }),
    [],
  );

  useEffect(() => {
    if (!userId) {
      navigate('/admin/users');
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setStatus('loading');
        const res = await apiGet<AdminUserDetailResponse>(`/admin/users/${userId}`);
        if (!cancelled) {
          setData(res);
          setStatus('idle');
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message ?? 'Failed to load user');
          setStatus('error');
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, navigate]);

  const [contactDraft, setContactDraft] = useState({
    title: '',
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    mobileNumber: '',
    landlineNumber: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    city: '',
    county: '',
    postcode: '',
  });

  useEffect(() => {
    if (!data) return;
    const u = data.user;
    setContactDraft({
      title: u.title ?? '',
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      companyName: u.companyName ?? '',
      email: u.email ?? '',
      mobileNumber: u.mobileNumber ?? '',
      landlineNumber: u.landlineNumber ?? '',
      addressLine1: u.addressLine1 ?? '',
      addressLine2: u.addressLine2 ?? '',
      addressLine3: u.addressLine3 ?? '',
      city: u.city ?? '',
      county: u.county ?? '',
      postcode: u.postcode ?? '',
    });
  }, [data]);

  const saveContact = async () => {
    if (!userId) return;
    try {
      setSaving(true);
      const res = await apiPatch<AdminUserDetailResponse>(`/admin/users/${userId}`, contactDraft);
      setData(res);
      toast.success('User updated');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!userId) return;
    try {
      await apiPost(`/admin/users/${userId}/send-password-reset`);
      toast.success('Password reset link initiated');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to send reset');
    }
  };

  const deactivateUser = async () => {
    if (!userId) return;
    const ok = window.confirm('Deactivate this user? They will be soft-deleted.');
    if (!ok) return;
    try {
      await apiDelete(`/admin/users/${userId}`);
      toast.success('User deactivated');
      navigate('/admin/users');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to deactivate user');
    }
  };

  const fmtDate = (value: string | null) => (value ? new Date(value).toLocaleString('en-GB') : '—');

  if (status === 'loading' && !data) {
    return <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-300">Loading…</div>;
  }
  if (status === 'error' || !data) {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
        {error ?? 'Not found'}
      </div>
    );
  }

  const { user, summary, bookings, documents } = data;
  const totalSpent = currency.format((summary.totalSpentPence ?? 0) / 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">User #{user.id}</h2>
          <p className="text-sm text-slate-400">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={sendPasswordReset} className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500 hover:text-orange-300">Send password reset</button>
          <button onClick={deactivateUser} className="rounded-full border border-red-500 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/10">Deactivate</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Summary</h3>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-200">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Registered</div>
              <div className="font-semibold text-white">{fmtDate(summary.registeredAt)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Last login</div>
              <div className="font-semibold text-white">{fmtDate(summary.lastLoginAt)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Bookings</div>
              <div className="font-semibold text-white">{summary.totalBookings}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Total spent</div>
              <div className="font-semibold text-white">{totalSpent}</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Contact info</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Title" value={contactDraft.title} onChange={(e) => setContactDraft({ ...contactDraft, title: e.target.value })} />
            <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Company" value={contactDraft.companyName} onChange={(e) => setContactDraft({ ...contactDraft, companyName: e.target.value })} />
            <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="First name" value={contactDraft.firstName} onChange={(e) => setContactDraft({ ...contactDraft, firstName: e.target.value })} />
            <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Last name" value={contactDraft.lastName} onChange={(e) => setContactDraft({ ...contactDraft, lastName: e.target.value })} />
            <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white sm:col-span-2" placeholder="Email" value={contactDraft.email} onChange={(e) => setContactDraft({ ...contactDraft, email: e.target.value })} />
            <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Mobile" value={contactDraft.mobileNumber} onChange={(e) => setContactDraft({ ...contactDraft, mobileNumber: e.target.value })} />
            <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Landline" value={contactDraft.landlineNumber} onChange={(e) => setContactDraft({ ...contactDraft, landlineNumber: e.target.value })} />
            <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white sm:col-span-2" placeholder="Address line 1" value={contactDraft.addressLine1} onChange={(e) => setContactDraft({ ...contactDraft, addressLine1: e.target.value })} />
            <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white sm:col-span-2" placeholder="Address line 2" value={contactDraft.addressLine2} onChange={(e) => setContactDraft({ ...contactDraft, addressLine2: e.target.value })} />
            <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white sm:col-span-2" placeholder="Address line 3" value={contactDraft.addressLine3} onChange={(e) => setContactDraft({ ...contactDraft, addressLine3: e.target.value })} />
            <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="City" value={contactDraft.city} onChange={(e) => setContactDraft({ ...contactDraft, city: e.target.value })} />
            <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="County" value={contactDraft.county} onChange={(e) => setContactDraft({ ...contactDraft, county: e.target.value })} />
            <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Postcode" value={contactDraft.postcode} onChange={(e) => setContactDraft({ ...contactDraft, postcode: e.target.value })} />
            <div className="sm:col-span-2">
              <button onClick={saveContact} disabled={saving} className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black hover:bg-orange-400 disabled:bg-orange-700/40">Save</button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Bookings</h3>
        <div className="mt-4 space-y-3 text-sm">
          {bookings.length === 0 ? (
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-slate-300">No bookings.</div>
          ) : (
            bookings.map((b) => {
              const slotDate = new Date(b.slotDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
              const total = currency.format((b.totalAmountPence ?? 0) / 100);
              return (
                <Link key={b.id} to={`/admin/bookings/${b.id}`} className="block rounded-xl border border-slate-700 bg-slate-800 p-4 hover:border-orange-500/60">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Booking #{b.id}</span>
                    <BookingSourceBadge source={b.source} />
                    <span className="text-xs text-slate-400">{slotDate} at {b.slotTime}</span>
                  </div>
                  <div className="mt-2 text-slate-200">{b.serviceNames.join(', ') || 'Service'}</div>
                  <div className="text-xs text-slate-400">Total {total}</div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Documents</h3>
        <div className="mt-4 space-y-3 text-sm">
          {documents.length === 0 ? (
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-slate-300">No documents.</div>
          ) : (
            documents.map((d) => (
              <div key={d.id} className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-800 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold text-white">{d.number}</div>
                  <div className="text-xs text-slate-400">{d.type} • {d.status} • {fmtDate(d.createdAt)}</div>
                  <div className="text-xs text-slate-400">Total {currency.format(d.totalAmountPence / 100)} (VAT {currency.format(d.vatAmountPence / 100)})</div>
                </div>
                <div className="text-xs text-orange-300">
                  {d.pdfUrl ? (
                    <a href={d.pdfUrl} className="underline underline-offset-4" target="_blank" rel="noreferrer">Download PDF</a>
                  ) : (
                    <span className="text-slate-500">PDF pending</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

