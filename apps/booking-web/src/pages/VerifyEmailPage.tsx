import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiPost } from "../lib/api";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setError('Verification token is missing.');
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        setStatus('loading');
        setError('');
        setMessage('');
        await apiPost('/auth/verify-email', { token });
        if (!cancelled) {
          setStatus('success');
          setMessage('Your email has been verified. You can now log in and confirm your booking.');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setError((err as Error).message);
        }
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold text-brand-black">Verify Email</h1>
      <p className="text-slate-600">
        Follow the link sent to your inbox to activate your account. This page confirms the verification automatically.
      </p>

      {status === 'loading' ? (
        <p className="text-sm text-slate-500">Verifying your email…</p>
      ) : null}

      {status === 'success' ? (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p>{message}</p>
          <p className="mt-2">
            <Link to="/login" className="font-semibold text-brand-orange underline">
              Continue to login
            </Link>
          </p>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p>{error || 'Verification failed. Please check your link or request a new one.'}</p>
          <p className="mt-2">
            Need another email?{' '}
            <Link to="/register" className="font-semibold text-brand-orange underline">
              Register again
            </Link>
            .
          </p>
        </div>
      ) : null}
    </section>
  );
}
