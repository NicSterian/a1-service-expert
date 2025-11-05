import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPatch } from '../lib/api';
import { clearAuthToken, getToken } from '../lib/auth';
interface MeResponse {
  user: {
    id: number;
    email: string;
    role: string;
    emailVerified: boolean;
  };
}
interface ProfileUser {
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  mobileNumber: string | null;
  landlineNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressLine3: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  marketingOptIn: boolean;
  notes: string | null;
  email: string;
  role: string;
  emailVerified: boolean;
}
interface ProfileResponse {
  user: ProfileUser;
}
interface BookingSummary {
  id: number;
  status: string;
  slotDate: string;
  slotTime: string;
  createdAt: string;
  serviceName: string | null;
  engineTierName: string | null;
  totalAmountPence: number;
  notes?: string | null;
}
export function AccountPage() {
  const navigate = useNavigate();
  const [profileStatus, setProfileStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [bookingsStatus, setBookingsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [user, setUser] = useState<MeResponse['user'] | null>(null);
  // removed unused state to satisfy lint rules
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [profileForm, setProfileForm] = useState({
    title: 'MR',
    firstName: '',
    lastName: '',
    companyName: '',
    mobileNumber: '',
    landlineNumber: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    city: '',
    county: '',
    postcode: '',
    marketingOptIn: false,
    notes: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    const fetchProfile = async () => {
      try {
        setProfileStatus('loading');
        setProfileError(null);
        const [me, profileResponse] = await Promise.all([
          apiGet<MeResponse>('/auth/me'),
          apiGet<ProfileResponse>('/account/profile'),
        ]);
        if (!cancelled) {
          setUser(me.user);
          setProfileForm({
            title: (profileResponse.user.title ?? 'MR'),
            firstName: profileResponse.user.firstName ?? '',
            lastName: profileResponse.user.lastName ?? '',
            companyName: profileResponse.user.companyName ?? '',
            mobileNumber: profileResponse.user.mobileNumber ?? '',
            landlineNumber: profileResponse.user.landlineNumber ?? '',
            addressLine1: profileResponse.user.addressLine1 ?? '',
            addressLine2: profileResponse.user.addressLine2 ?? '',
            addressLine3: profileResponse.user.addressLine3 ?? '',
            city: profileResponse.user.city ?? '',
            county: profileResponse.user.county ?? '',
            postcode: profileResponse.user.postcode ?? '',
            marketingOptIn: profileResponse.user.marketingOptIn ?? false,
            notes: profileResponse.user.notes ?? '',
          });
          setProfileStatus('success');
        }
      } catch (err) {
        if (!cancelled) {
          setProfileStatus('error');
          setProfileError((err as Error).message ?? 'Unable to load your profile right now.');
        }
      }
    };
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [token]);
  useEffect(() => {
    if (!token || !user) return;
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
          setBookingsError((err as Error).message ?? 'Unable to load bookings right now.');
        }
      }
    };
    fetchBookings();
    return () => {
      cancelled = true;
    };
  }, [token, user]);
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      navigate('/admin', { replace: true });
    }
  }, [navigate, user?.role]);
  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };
  const formatTime = (value: string) => value;
  const formatCurrency = (amountPence: number) => currencyFormatter.format(amountPence / 100);
  const handleLogout = () => {
    clearAuthToken();
    toast.success('You have been logged out.');
    navigate('/', { replace: true });
  };
  const handleProfileInput =
    (field: keyof typeof profileForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.type === 'checkbox' ? (event.target as HTMLInputElement).checked : event.target.value;
      setProfileForm((prev) => ({ ...prev, [field]: value }));
    };
  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      toast.error('Please sign in again to update your profile.');
      return;
    }
    const required: Array<keyof typeof profileForm> = ['firstName', 'lastName', 'mobileNumber', 'addressLine1', 'city', 'county', 'postcode'];
    for (const f of required) {
      if (!profileForm[f] || String(profileForm[f]).trim().length === 0) {
        toast.error('Please complete all required profile fields before saving.');
        return;
      }
    }
    try {
      setProfileSaving(true);
      await apiPatch('/account/profile', {
        title: profileForm.title,
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        companyName: profileForm.companyName || undefined,
        mobileNumber: profileForm.mobileNumber,
        landlineNumber: profileForm.landlineNumber || undefined,
        addressLine1: profileForm.addressLine1,
        addressLine2: profileForm.addressLine2 || undefined,
        addressLine3: profileForm.addressLine3 || undefined,
        city: profileForm.city,
        county: profileForm.county,
        postcode: profileForm.postcode.toUpperCase(),
        marketingOptIn: profileForm.marketingOptIn,
        notes: profileForm.notes || undefined,
      });
      toast.success('Profile updated successfully.');
    } catch (error) {
      toast.error((error as Error).message ?? 'Unable to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };
  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    try {
      setPasswordSaving(true);
      await apiPatch('/account/change-password', { currentPassword, newPassword });
      toast.success('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error((error as Error).message ?? 'Unable to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };
  const renderStatusBadge = (status: string) => {
    const normalized = status.toUpperCase();
    const styles: Record<string, string> = {
      CONFIRMED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      PENDING: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      CANCELLED: 'bg-red-500/10 text-red-300 border-red-500/30',
    };
    const badgeStyles = styles[normalized] ?? 'bg-slate-700 text-slate-300 border-slate-600';
    return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${badgeStyles}`}>{normalized.charAt(0) + normalized.slice(1).toLowerCase()}</span>;
  };
  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-lg">
        <div className="flex flex-col gap-8 xl:flex-row xl:gap-12">
          <div className="flex-1 space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-brand-orange">Account centre</p>
            <h1 className="text-3xl font-semibold text-white">Keep your visits and documents in one place.</h1>
            <p className="text-sm text-slate-200">Review upcoming and past bookings, update your contact details, and change your password without leaving the workshop flow.</p>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Link to="/online-booking" className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-4 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-orange-400">
                Book another visit
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" /></svg>
              </Link>
              <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:border-brand-orange hover:text-brand-orange">Sign out</button>
            </div>
          </div>
          <div className="flex w-full max-w-md flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-100 backdrop-blur">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-brand-orange">Signed in as</p>
              <p className="mt-3 text-lg font-semibold">{user?.email ?? 'Loading...'}</p>
              <p className="text-xs text-slate-300">Role: {user?.role ?? '-'}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-inner">
          <h2 className="text-xl font-semibold text-white">Booking history</h2>
          {bookingsStatus === 'loading' ? (
            <p className="text-sm text-slate-300">Loading bookings...</p>
          ) : bookingsStatus === 'error' ? (
            <p className="text-sm text-red-400">{bookingsError ?? 'Unable to load bookings right now.'}</p>
          ) : bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800 p-6 text-sm text-slate-300">
              <p>No bookings yet. Once you schedule your first visit, it will appear here.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {bookings.map((booking) => (
                <li key={booking.id} className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{booking.serviceName ?? 'Service'}{booking.engineTierName ? ` • ${booking.engineTierName}` : ''}</p>
                      <p className="text-xs text-slate-300">{formatDate(booking.slotDate)} at {formatTime(booking.slotTime)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {renderStatusBadge(booking.status)}
                      <span className="text-sm font-semibold text-white">{formatCurrency(booking.totalAmountPence)}</span>
                    </div>
                  </div>
                  {booking.notes ? (
                    <p className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-300"><span className="font-semibold text-white">Customer notes:</span> {booking.notes}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <Link to={`/account/bookings/${booking.id}`} className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 font-medium text-white transition hover:-translate-y-0.5 hover:border-orange-500 hover:text-orange-400">View details</Link>
                    <span className="text-slate-400">Booked on {formatDate(booking.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-4 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-inner text-sm text-slate-300">
          <h2 className="text-xl font-semibold text-white">Update your profile</h2>
          {profileStatus === 'loading' ? (
            <p className="text-sm text-slate-400">Loading profile...</p>
          ) : profileStatus === 'error' ? (
            <p className="text-sm text-red-400">{profileError ?? 'Unable to load your profile right now.'}</p>
          ) : (
            <form className="space-y-4 text-sm" onSubmit={handleProfileSubmit} noValidate>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-title">Title</label>
                  <select id="profile-title" value={profileForm.title} onChange={handleProfileInput('title')} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200">
                    <option value="MR">Mr</option>
                    <option value="MRS">Mrs</option>
                    <option value="MISS">Miss</option>
                    <option value="MS">Ms</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-company">Company (optional)</label>
                  <input id="profile-company" type="text" value={profileForm.companyName} onChange={handleProfileInput('companyName')} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-first">First name</label>
                  <input id="profile-first" type="text" required value={profileForm.firstName} onChange={handleProfileInput('firstName')} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-last">Last name</label>
                  <input id="profile-last" type="text" required value={profileForm.lastName} onChange={handleProfileInput('lastName')} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-mobile">Mobile number</label>
                  <input id="profile-mobile" type="tel" required value={profileForm.mobileNumber} onChange={handleProfileInput('mobileNumber')} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-landline">Landline (optional)</label>
                  <input id="profile-landline" type="tel" value={profileForm.landlineNumber} onChange={handleProfileInput('landlineNumber')} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-address1">Address line 1</label>
                  <input id="profile-address1" type="text" required value={profileForm.addressLine1} onChange={handleProfileInput('addressLine1')} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-address2">Address line 2</label>
                  <input id="profile-address2" type="text" value={profileForm.addressLine2} onChange={handleProfileInput('addressLine2')} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-address3">Address line 3</label>
                  <input id="profile-address3" type="text" value={profileForm.addressLine3} onChange={handleProfileInput('addressLine3')} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-city">City</label>
                  <input id="profile-city" type="text" required value={profileForm.city} onChange={handleProfileInput('city')} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-county">County</label>
                  <input id="profile-county" type="text" required value={profileForm.county} onChange={handleProfileInput('county')} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-postcode">Postcode</label>
                  <input id="profile-postcode" type="text" required value={profileForm.postcode} onChange={handleProfileInput('postcode')} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 uppercase" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-notes">Notes for the team (optional)</label>
                  <textarea id="profile-notes" rows={3} value={profileForm.notes} onChange={handleProfileInput('notes')} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200" />
                </div>
              </div>
              <label className="flex items-start gap-3 text-xs text-slate-300">
                <input type="checkbox" checked={profileForm.marketingOptIn} onChange={handleProfileInput('marketingOptIn')} className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800" />
                <span>I&apos;d like to receive occasional service reminders and offers. You can opt out at any time.</span>
              </label>
              <button type="submit" disabled={profileSaving} className="inline-flex items-center justify-center rounded-full bg-brand-orange px-4 py-2 text-xs font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-70">{profileSaving ? 'Saving...' : 'Save profile'}</button>
            </form>
          )}
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-4 text-xs text-slate-400">
            <p>Prefer to talk? Call 07394 433889 and we&apos;ll update your details while you&apos;re on the phone.</p>
          </div>
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-inner text-sm text-slate-300">
          <h2 className="text-xl font-semibold text-white">Change password</h2>
          <p className="text-xs text-slate-400">Pick a strong password you haven&apos;t used elsewhere. we&apos;ll ask for your current password before saving changes.</p>
          <form className="space-y-4" onSubmit={handlePasswordSubmit} noValidate>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="password-current">Current password</label>
              <input id="password-current" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="password-new">New password</label>
              <input id="password-new" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="password-confirm">Confirm new password</label>
              <input id="password-confirm" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200" />
            </div>
            <button type="submit" disabled={passwordSaving} className="inline-flex items-center justify-center rounded-full bg-brand-orange px-4 py-2 text-xs font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-70">{passwordSaving ? 'Updating...' : 'Update password'}</button>
          </form>
        </div>
        <div className="space-y-4 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-inner text-sm text-slate-300">
          <h2 className="text-xl font-semibold text-white">Need a hand?</h2>
          <p>If you spot anything that doesn&apos;t look right, just give us a call or mention it when you confirm your next booking and we&apos;ll fix it for you.</p>
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-4 text-xs text-slate-400">
            <p className="font-semibold text-white">Workshop contact</p>
            <p className="mt-1">Phone: 07394 433889</p>
            <p>Email: support@a1serviceexpert.com</p>
          </div>
          <Link to="/online-booking" className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-4 py-2 text-xs font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400">Start a booking</Link>
        </div>
      </section>
    </div>
  );
}
export default AccountPage;
