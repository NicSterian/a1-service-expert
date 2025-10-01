import { useEffect, useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AUTH_EVENT_NAME, clearAuthToken, getAuthToken } from './lib/auth';
import { apiGet } from './lib/api';

interface CurrentUser {
  email: string;
  role: string;
}

type NavLinkItem = {
  to: string;
  label: string;
  icon?: ReactNode;
  ariaLabel?: string;
};

const homeIcon = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path
      fill="currentColor"
      d="m12 3.172 8 6.4V21a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1V9.572l8-6.4Zm0-2.494a1 1 0 0 0-.616.212l-9 7.2A1 1 0 0 0 2 8.972V21a3 3 0 0 0 3 3h6a1 1 0 0 0 1-1v-5h2v5a1 1 0 0 0 1 1h6a3 3 0 0 0 3-3V8.972a1 1 0 0 0-.384-.782l-9-7.2A1 1 0 0 0 12 .678Z"
    />
  </svg>
);

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(getAuthToken()));
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleAuthChange = () => setIsLoggedIn(Boolean(getAuthToken()));
    window.addEventListener(AUTH_EVENT_NAME, handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener(AUTH_EVENT_NAME, handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      if (!isLoggedIn) {
        setUser(null);
        return;
      }

      try {
        const response = await apiGet<{ user: CurrentUser }>('/auth/me');
        if (!cancelled) {
          setUser(response.user);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      }
    };

    loadUser();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = useMemo<NavLinkItem[]>(() => {
    const links: NavLinkItem[] = [
      { to: '/', label: 'Home', icon: homeIcon, ariaLabel: 'Home' },
      { to: '/services', label: 'Services' },
      { to: '/online-booking', label: 'Book Online' },
      { to: '/air-con', label: 'Air Con' },
      { to: '/diagnostics', label: 'Diagnostics' },
      { to: '/contact', label: 'Contact Us' },
    ];

    if (isLoggedIn) {
      links.push({ to: '/account', label: 'My Account' });
      if (user?.role === 'ADMIN' || user?.role === 'STAFF') {
        links.push({ to: '/admin', label: 'Admin' });
      }
      links.push({ to: '/dev', label: 'Dev Tools' });
    } else {
      links.push({ to: '/login', label: 'Login' });
      links.push({ to: '/register', label: 'Register' });
    }

    return links;
  }, [isLoggedIn, user?.role]);

  const handleLogout = () => {
    clearAuthToken();
    setIsLoggedIn(false);
    setUser(null);
    const shouldStayOnAdmin = location.pathname.startsWith('/admin');
    if (shouldStayOnAdmin) {
      navigate('/login', { replace: true });
    }
    toast.success('You have been logged out.');
  };

  const renderNavLink = (link: NavLinkItem, variant: 'desktop' | 'mobile') => {
    const isActive = location.pathname === link.to;

    if (variant === 'mobile') {
      return (
        <Link
          key={link.to}
          to={link.to}
          className={`flex w-full items-center justify-end gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${isActive ? 'bg-white/10 text-brand-orange' : 'text-white hover:bg-white/10 hover:text-brand-orange'}`}
        >
          {link.icon ? (
            <span className="flex items-center gap-2">
              <span aria-hidden className="flex h-5 w-5 items-center justify-center">{link.icon}</span>
              <span>{link.label}</span>
            </span>
          ) : (
            link.label
          )}
        </Link>
      );
    }

    return (
      <Link
        key={link.to}
        to={link.to}
        className={`relative flex items-center justify-center rounded-full px-3 py-1 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${isActive ? 'text-brand-orange' : 'text-white hover:text-brand-orange'} after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-full after:origin-center after:scale-x-0 after:bg-brand-orange after:transition-transform after:duration-200 after:content-[''] ${isActive ? 'after:scale-x-100' : ''}`}
      >
        {link.icon ? (
          <>
            <span className="sr-only">{link.ariaLabel ?? link.label}</span>
            <span aria-hidden className="flex items-center justify-center">{link.icon}</span>
          </>
        ) : (
          link.label
        )}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-white to-slate-100 text-brand-black">
      <header className="border-b border-slate-800 bg-slate-900/95 text-white">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xs font-semibold uppercase tracking-[0.45em] text-white/80" aria-label="A1 Service Expert home"> A1 Service Expert </Link><div className="flex items-center gap-3 sm:hidden">
              <a
                href="tel:07394433889"
                className="inline-flex items-center justify-center rounded-full border border-brand-orange px-3 py-2 text-xs font-semibold text-brand-orange transition hover:bg-brand-orange hover:text-white"
              >
                Call
              </a>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-white/20 p-2 text-white transition hover:border-brand-orange hover:text-brand-orange"
                aria-expanded={mobileMenuOpen}
                aria-controls="main-navigation"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
              >
                <span className="sr-only">Toggle navigation</span>
                <span aria-hidden className="flex flex-col items-center justify-center gap-1">
                  <span className={`h-0.5 w-6 rounded-full bg-current transition ${mobileMenuOpen ? 'translate-y-1.5 rotate-45' : ''}`}></span>
                  <span className={`h-0.5 w-6 rounded-full bg-current transition ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
                  <span className={`h-0.5 w-6 rounded-full bg-current transition ${mobileMenuOpen ? '-translate-y-1.5 -rotate-45' : ''}`}></span>
                </span>
              </button>
            </div>
          </div>
          <div className="hidden items-center justify-between sm:flex">
            <nav className="flex items-center gap-4 text-sm font-medium">
              {navLinks.map((link) => renderNavLink(link, 'desktop'))}
            </nav>
            <div className="flex items-center gap-3">
              <a
                href="tel:07394433889"
                className="inline-flex items-center justify-center rounded-full border border-brand-orange px-4 py-2 text-sm font-semibold text-brand-orange transition hover:bg-brand-orange hover:text-white"
              >
                Call 07394 433889
              </a>
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:border-brand-orange hover:text-brand-orange"
                >
                  Logout
                </button>
              ) : null}
            </div>
          </div>
          {mobileMenuOpen ? (
            <div id="main-navigation" className="mt-3 flex flex-col items-end gap-2 sm:hidden">
              <nav className="flex w-full flex-col items-end gap-2 text-sm font-medium">
                {navLinks.map((link) => renderNavLink(link, 'mobile'))}
              </nav>
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:border-brand-orange hover:text-brand-orange"
                >
                  Logout
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto w-full flex-1 max-w-5xl px-4 py-10">
        <Outlet context={{ currentUser: user }} />
      </main>
      <footer className="bg-white py-6 text-xs text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} A1 Service Expert. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="transition hover:text-brand-orange">Terms</Link>
            <Link to="/privacy" className="transition hover:text-brand-orange">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;



