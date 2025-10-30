import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AUTH_EVENT_NAME, clearAuthToken, getAuthToken } from './lib/auth';
import { apiGet } from './lib/api';
import HeaderLogo from './components/HeaderLogo';
import Footer from './components/Footer';
import BackToTop from './components/BackToTop';

interface PublicUser {
  id: number;
  email: string;
  role: string;
  emailVerified: boolean;
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
  profileUpdatedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  const [user, setUser] = useState<PublicUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

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
        const response = await apiGet<{ user: PublicUser }>('/auth/me');
        if (!cancelled) {
          setUser(response.user);
        }
      } catch (error) {
        if (!cancelled) {
          setUser(null);
          // If token is invalid or expired, clear it
          const errorMsg = String((error as Error)?.message ?? '');
          if (errorMsg.toLowerCase().includes('unauthorized') || errorMsg.toLowerCase().includes('invalid token')) {
            clearAuthToken();
            setIsLoggedIn(false);
          }
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
    setProfileMenuOpen(false);
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

    return links;
  }, []);

  const isStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = useCallback(() => {
    clearAuthToken();
    setIsLoggedIn(false);
    setUser(null);
    const shouldStayOnAdmin = location.pathname.startsWith('/admin');
    if (shouldStayOnAdmin) {
      navigate('/login', { replace: true });
    }
    toast.success('You have been logged out.');
    setProfileMenuOpen(false);
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (!profileMenuOpen) {
      return;
    }

    const handleClickAway = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickAway);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleClickAway);
      document.removeEventListener('keydown', handleKey);
    };
  }, [profileMenuOpen]);

  const userInitial = user?.firstName?.[0]?.toUpperCase() ?? user?.lastName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?';
  const userDisplayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`.trim()
    : user?.email ?? 'User';

  const renderNavLink = (link: NavLinkItem, variant: 'desktop' | 'mobile') => {
    const isActive = location.pathname === link.to;

    if (variant === 'mobile') {
      return (
        <Link
          key={link.to}
          to={link.to}
          className={`flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${isActive ? 'bg-white/10 text-brand-orange' : 'text-white hover:bg-white/10 hover:text-brand-orange'}`}
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
            <HeaderLogo variant="mobile" />
            <div className="flex items-center gap-3 sm:hidden">
              <a
                href="tel:07394433889"
                className="inline-flex items-center justify-center rounded-full border border-brand-orange px-3 py-2 text-xs font-semibold text-brand-orange transition hover:bg-brand-orange hover:text-white"
              >
                Call
              </a>
              <a
                href="https://wa.me/447394433889"
                target="_blank"
                rel="noreferrer"
                aria-label="Chat on WhatsApp"
                title="Chat on WhatsApp"
                className="inline-flex items-center justify-center gap-1 rounded-full border border-brand-orange px-3 py-2 text-xs font-semibold text-brand-orange transition hover:bg-brand-orange hover:text-white"
              >
                <span aria-hidden className="inline-flex"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M20.52 3.48A11.94 11.94 0 0 0 12.06 0C5.47 0 .1 5.37.1 12c0 2.12.56 4.14 1.62 5.94L0 24l6.2-1.6A11.86 11.86 0 0 0 12.06 24c6.58 0 11.94-5.37 11.94-12 0-3.2-1.25-6.2-3.48-8.52Zm-8.46 18.5c-1.86 0-3.63-.5-5.2-1.47l-.37-.22-3.68.95.98-3.58-.24-.37A9.65 9.65 0 0 1 2.3 12c0-5.38 4.38-9.76 9.76-9.76 2.6 0 5.06 1 6.9 2.83a9.66 9.66 0 0 1 2.86 6.93c0 5.38-4.38 9.76-9.76 9.76Zm5.63-7.3c-.3-.15-1.78-.88-2.06-.98-.28-.1-.49-.15-.7.15-.2.3-.8.98-.98 1.18-.2.2-.36.23-.66.08-.3-.15-1.25-.46-2.38-1.46-.88-.78-1.48-1.74-1.66-2.04-.18-.3 0-.47.14-.62.14-.14.3-.36.46-.54.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.54-.08-.15-.7-1.68-.96-2.3-.25-.6-.5-.5-.7-.51h-.6c-.2 0-.54.07-.82.38-.28.3-1.08 1.06-1.08 2.58 0 1.5 1.1 2.94 1.26 3.14.15.2 2.12 3.24 5.14 4.54.72.3 1.28.48 1.72.62.72.23 1.38.2 1.9.12.58-.08 1.78-.72 2.03-1.4.26-.7.26-1.3.2-1.4-.08-.12-.28-.2-.58-.35Z"/></svg></span>
                WhatsApp
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
          <HeaderLogo variant="desktop" />
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
              <a
                href="https://wa.me/447394433889"
                target="_blank"
                rel="noreferrer"
                aria-label="Chat on WhatsApp"
                title="Chat on WhatsApp"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-orange px-4 py-2 text-sm font-semibold text-brand-orange transition hover:bg-brand-orange hover:text-white"
              >
                <span aria-hidden className="inline-flex"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M20.52 3.48A11.94 11.94 0 0 0 12.06 0C5.47 0 .1 5.37.1 12c0 2.12.56 4.14 1.62 5.94L0 24l6.2-1.6A11.86 11.86 0 0 0 12.06 24c6.58 0 11.94-5.37 11.94-12 0-3.2-1.25-6.2-3.48-8.52Zm-8.46 18.5c-1.86 0-3.63-.5-5.2-1.47l-.37-.22-3.68.95.98-3.58-.24-.37A9.65 9.65 0 0 1 2.3 12c0-5.38 4.38-9.76 9.76-9.76 2.6 0 5.06 1 6.9 2.83a9.66 9.66 0 0 1 2.86 6.93c0 5.38-4.38 9.76-9.76 9.76Zm5.63-7.3c-.3-.15-1.78-.88-2.06-.98-.28-.1-.49-.15-.7.15-.2.3-.8.98-.98 1.18-.2.2-.36.23-.66.08-.3-.15-1.25-.46-2.38-1.46-.88-.78-1.48-1.74-1.66-2.04-.18-.3 0-.47.14-.62.14-.14.3-.36.46-.54.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.54-.08-.15-.7-1.68-.96-2.3-.25-.6-.5-.5-.7-.51h-.6c-.2 0-.54.07-.82.38-.28.3-1.08 1.06-1.08 2.58 0 1.5 1.1 2.94 1.26 3.14.15.2 2.12 3.24 5.14 4.54.72.3 1.28.48 1.72.62.72.23 1.38.2 1.9.12.58-.08 1.78-.72 2.03-1.4.26-.7.26-1.3.2-1.4-.08-.12-.28-.2-.58-.35Z"/></svg></span>
                WhatsApp
              </a>
              {isLoggedIn ? (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:border-brand-orange hover:text-brand-orange"
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="menu"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-orange/90 text-xs font-bold text-slate-900">
                      {userInitial}
                    </span>
                    <span className="hidden md:inline">{userDisplayName}</span>
                    <span aria-hidden className={`transition ${profileMenuOpen ? 'rotate-180' : ''}`}>
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                        <path d="M12 15.5a1 1 0 0 1-.64-.23l-6-5a1 1 0 1 1 1.28-1.54L12 13.27l5.36-4.54a1 1 0 0 1 1.28 1.54l-6 5a1 1 0 0 1-.64.23Z" />
                      </svg>
                    </span>
                  </button>
                  {profileMenuOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-700 shadow-xl"
                    >
                      <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Signed in as
                      </p>
                      <p className="px-3 pb-2 text-sm font-medium text-slate-600">{user?.email}</p>
                      <div className="my-1 h-px bg-slate-100" />
                      <Link
                        to="/account"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-brand-black"
                      >
                        Account overview
                      </Link>
                      {isStaff ? (
                        <Link
                          to="/admin"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-brand-black"
                        >
                          Admin dashboard
                        </Link>
                      ) : null}
                      {isAdmin ? (
                        <Link
                          to="/dev"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-brand-black"
                        >
                          Dev tools
                        </Link>
                      ) : null}
                      <div className="my-1 h-px bg-slate-100" />
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-semibold text-brand-orange transition hover:bg-orange-50"
                      >
                        Sign out
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:border-brand-orange hover:text-brand-orange"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center rounded-full border border-brand-orange px-4 py-2 text-xs font-semibold text-brand-orange transition hover:bg-brand-orange hover:text-white"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
          {mobileMenuOpen ? (
            <div id="main-navigation" className="mt-3 flex flex-col items-center gap-2 sm:hidden">
              <nav className="flex w-full flex-col items-center gap-2 text-sm font-medium">
                {navLinks.map((link) => renderNavLink(link, 'mobile'))}
              </nav>
              <div className="mt-4 flex w-full flex-col items-center gap-2 px-2 text-sm">
                {isLoggedIn ? (
                  <>
                    <Link
                      to="/account"
                      className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-center font-semibold text-white transition hover:border-brand-orange hover:text-brand-orange"
                    >
                      Account overview
                    </Link>
                    {isStaff ? (
                      <Link
                        to="/admin"
                        className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-center font-semibold text-white transition hover:border-brand-orange hover:text-brand-orange"
                      >
                        Admin dashboard
                      </Link>
                    ) : null}
                    {isAdmin ? (
                      <Link
                        to="/dev"
                        className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-center font-semibold text-white transition hover:border-brand-orange hover:text-brand-orange"
                      >
                        Dev tools
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full rounded-lg border border-white/20 px-4 py-2 text-center font-semibold text-white transition hover:border-brand-orange hover:text-brand-orange"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="w-full rounded-lg border border-white/20 px-4 py-2 text-center font-semibold text-white transition hover:border-brand-orange hover:text-brand-orange"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="w-full rounded-lg border border-brand-orange px-4 py-2 text-center font-semibold text-brand-orange transition hover:bg-brand-orange hover:text-white"
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto w-full flex-1 max-w-5xl px-4 py-10">
        <Outlet context={{ currentUser: user }} />
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}

export default App;




