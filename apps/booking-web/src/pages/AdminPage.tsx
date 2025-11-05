import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../lib/api';
import { clearAuthToken, getToken } from '../lib/auth';
import { CalendarManager, CatalogManager, RecipientsManager, SettingsManager } from '../features/admin';

interface CurrentUser {
  id: number;
  email: string;
  role: string;
  emailVerified: boolean;
}

export function AdminPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'forbidden'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate('/login', { state: { from: '/admin' } });
      return;
    }

    let cancelled = false;
    const checkAccess = async () => {
      try {
        setStatus('loading');
        setError(null);
        const response = await apiGet<{ user: CurrentUser }>('/auth/me');
        if (cancelled) return;
        setUser(response.user);
        if (response.user.role === 'ADMIN' || response.user.role === 'STAFF') {
          setStatus('ready');
        } else {
          setStatus('forbidden');
        }
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message ?? 'Unable to load admin area.');
        setStatus('forbidden');
      }
    };

    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const navTarget = useMemo(() => {
    if (!user) return 'login';
    return user.role === 'ADMIN' || user.role === 'STAFF' ? 'ready' : 'forbidden';
  }, [user]);

  const handleLogout = () => {
    clearAuthToken();
    toast.success('You have been logged out.');
    navigate('/login');
  };

  if (status === 'loading') {
    return (
      <div className="space-y-6 px-4 py-8">
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 text-sm text-slate-300">Checking admin access.</div>
      </div>
    );
  }

  if (status === 'forbidden' || navTarget === 'forbidden') {
    return (
      <div className="space-y-4 px-4 py-8">
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
          <p>{error ?? 'You need an administrator account to access this page.'}</p>
          <button
            type="button"
            onClick={() => navigate('/login', { state: { from: '/admin' } })}
            className="mt-3 inline-flex items-center justify-center rounded-full bg-brand-orange px-4 py-2 text-xs font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 px-4 py-8">
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
            {user ? <p className="text-xs text-slate-300">Signed in as {user.email} ({user.role})</p> : null}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:border-brand-orange hover:text-brand-orange"
          >
            Logout
          </button>
        </div>
      </section>

      <CatalogManager />
      <CalendarManager />
      <RecipientsManager />
      <SettingsManager />
    </div>
  );
}

export default AdminPage;

