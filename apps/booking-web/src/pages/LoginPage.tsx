import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiPost } from '../lib/api';
import { clearAuthToken, getAuthToken, setAuthToken } from '../lib/auth';

type LoginResponse = {
  token: string;
  user: {
    email: string;
    role: string;
  };
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectFrom = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const alreadyLoggedIn = Boolean(getAuthToken());

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      const loader = toast.loading('Signing you in…');
      const response = await apiPost<LoginResponse>('/auth/login', {
        email,
        password,
      });
      setAuthToken(response.token);
      toast.dismiss(loader);
      toast.success('Welcome back!');
      setEmail('');
      setPassword('');

      const target = (() => {
        if (response.user.role === 'ADMIN' || response.user.role === 'STAFF') {
          return '/admin';
        }
        if (redirectFrom) {
          return redirectFrom;
        }
        return '/account';
      })();

      navigate(target, { replace: true });
    } catch (err) {
      toast.error((err as Error).message ?? 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    toast.success('Session cleared.');
  };

  return (
    <section className="max-w-md space-y-4">
      <h1 className="text-3xl font-semibold text-brand-black">Sign in</h1>
      <p className="text-slate-600">
        Log in to manage bookings, download documents, and continue the online booking journey.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-brand-orange px-3 py-2 text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-sm text-slate-600">
        Don’t have an account?{' '}
        <Link to="/register" className="font-semibold text-brand-orange underline">
          Register here
        </Link>
        .
      </p>

      {alreadyLoggedIn ? (
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs font-semibold text-slate-500 underline"
        >
          Clear existing session
        </button>
      ) : null}
    </section>
  );
}
