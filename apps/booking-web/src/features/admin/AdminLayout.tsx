import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiGet } from '../../lib/api';
import { clearAuthToken, getToken } from '../../lib/auth';

interface CurrentUser {
  id: number;
  email: string;
  role: string;
  emailVerified: boolean;
}

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'forbidden'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate('/login', { state: { from: location.pathname } });
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
  }, [navigate, location.pathname]);

  const handleLogout = () => {
    clearAuthToken();
    toast.success('You have been logged out.');
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/admin/overview') {
      return location.pathname === '/admin' || location.pathname === '/admin/overview';
    }
    return location.pathname.startsWith(path);
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 text-sm text-slate-300">
          Checking admin access...
        </div>
      </div>
    );
  }

  if (status === 'forbidden') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md space-y-4">
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
            <p>{error ?? 'You need an administrator account to access this page.'}</p>
            <button
              type="button"
              onClick={() => navigate('/login', { state: { from: location.pathname } })}
              className="mt-3 inline-flex items-center justify-center rounded-full bg-brand-orange px-4 py-2 text-xs font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400"
            >
              Go to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white md:text-2xl">Admin Dashboard</h1>
              {user && (
                <p className="text-xs text-slate-400">
                  {user.email} <span className="text-brand-orange">({user.role})</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-brand-orange hover:text-brand-orange md:px-4 md:py-2"
            >
              Logout
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="mt-4 hidden md:block">
            <ul className="flex gap-2">
              <li>
                <Link
                  to="/admin/overview"
                  className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isActive('/admin/overview')
                      ? 'bg-brand-orange text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  aria-current={isActive('/admin/overview') ? 'page' : undefined}
                >
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/bookings"
                  className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isActive('/admin/bookings')
                      ? 'bg-brand-orange text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  aria-current={isActive('/admin/bookings') ? 'page' : undefined}
                >
                  Bookings
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/users"
                  className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isActive('/admin/users')
                      ? 'bg-brand-orange text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  aria-current={isActive('/admin/users') ? 'page' : undefined}
                >
                  Users
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/financial"
                  className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isActive('/admin/financial')
                      ? 'bg-brand-orange text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  aria-current={isActive('/admin/financial') ? 'page' : undefined}
                >
                  Financial
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/settings"
                  className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isActive('/admin/settings')
                      ? 'bg-brand-orange text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  aria-current={isActive('/admin/settings') ? 'page' : undefined}
                >
                  Settings
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-900/95 backdrop-blur md:hidden">
        <ul className="flex items-center justify-around">
          <li className="flex-1">
            <Link
              to="/admin/overview"
              className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition ${
                isActive('/admin/overview') ? 'text-brand-orange' : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-current={isActive('/admin/overview') ? 'page' : undefined}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Overview</span>
            </Link>
          </li>
          <li className="flex-1">
            <Link
              to="/admin/bookings"
              className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition ${
                isActive('/admin/bookings') ? 'text-brand-orange' : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-current={isActive('/admin/bookings') ? 'page' : undefined}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Bookings</span>
            </Link>
          </li>
          <li className="flex-1">
            <Link
              to="/admin/users"
              className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition ${
                isActive('/admin/users') ? 'text-brand-orange' : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-current={isActive('/admin/users') ? 'page' : undefined}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Users</span>
            </Link>
          </li>
          <li className="flex-1">
            <Link
              to="/admin/financial"
              className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition ${
                isActive('/admin/financial') ? 'text-brand-orange' : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-current={isActive('/admin/financial') ? 'page' : undefined}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.343-4 3s1.79 3 4 3 4 1.343 4 3-1.79 3-4 3m0-12v2m0 10v2m8-10a8 8 0 11-16 0 8 8 0 0116 0z" />
              </svg>
              <span>Financial</span>
            </Link>
          </li>
          <li className="flex-1">
            <Link
              to="/admin/settings"
              className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition ${
                isActive('/admin/settings') ? 'text-brand-orange' : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-current={isActive('/admin/settings') ? 'page' : undefined}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
