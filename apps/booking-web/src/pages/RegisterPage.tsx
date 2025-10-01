import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { RecaptchaWidget } from '../components/RecaptchaWidget';
import { apiPost } from '../lib/api';

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const recaptchaRequired = Boolean(recaptchaSiteKey);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (recaptchaRequired && !captchaToken) {
      toast.error('Please complete the reCAPTCHA before registering.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiPost<{ verificationToken?: string }>('/auth/register', {
        email,
        password,
        captchaToken: captchaToken ?? 'dev-captcha-token',
      });
      if (response.verificationToken) {
        toast.success('Registration successful. Check your inbox for the verification link.');
      } else {
        toast.success('Registration received. Please verify your email to continue.');
      }
      setEmail('');
      setPassword('');
      setCaptchaToken(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="max-w-md space-y-4">
      <h1 className="text-3xl font-semibold text-brand-black">Create an Account</h1>
      <p className="text-slate-600">
        Create your booking account to track appointments, manage vehicle details, and confirm services online. We
        require email verification to keep your information secure.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="register-email">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="register-password">
            Password
          </label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <RecaptchaWidget
          className="mt-3"
          fallbackLabel="I confirm I am not a robot"
          onChange={setCaptchaToken}
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-brand-orange px-3 py-2 text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Submitting…' : 'Register'}
        </button>
      </form>
    </section>
  );
}
