import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { apiPost } from '../lib/api';
import contactBg from '../assets/images/contact-us-bg-image.jpg';

const openingHours = [
  { day: 'Monday', time: '09:00 - 18:00' },
  { day: 'Tuesday', time: '09:00 - 18:00' },
  { day: 'Wednesday', time: '09:00 - 18:00' },
  { day: 'Thursday', time: '09:00 - 18:00' },
  { day: 'Friday', time: '09:00 - 18:00' },
  { day: 'Saturday', time: '09:00 - 14:30' },
  { day: 'Sunday', time: 'Closed' },
];

export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; phone?: string; message?: string }>({});
  const [honeypot, setHoneypot] = useState('');

  const whatsappHref = useMemo(() => 'https://wa.me/447394433889', []);

  const handleChange = (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const errors: { name?: string; email?: string; phone?: string; message?: string } = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    const email = form.email.trim();
    if (!email) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email';
    if (!form.phone.trim()) errors.phone = 'Phone is required';
    const msg = form.message.trim();
    if (!msg) errors.message = 'Message is required';
    else if (msg.length < 10) errors.message = 'Message must be at least 10 characters';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (honeypot) {
      setStatus('success');
      return; // drop spam
    }

    if (!validate()) {
      setError('Please fix the highlighted fields.');
      return;
    }

    try {
      setStatus('submitting');
      setError(null);
      await apiPost('/contact', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
      });
      setStatus('success');
      setForm({ name: '', email: '', phone: '', message: '' });
      setFieldErrors({});
    } catch (err) {
      setStatus('error');
      setError((err as Error).message ?? 'Something went wrong. Please try again later.');
    }
  };

  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl text-white shadow-xl">
        <img
          src={contactBg}
          alt="Contact workshop"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/80" />
        <div className="relative space-y-6 p-8 sm:p-14">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-brand-orange">Contact</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">Get in touch with A1 Service Expert</h1>
          <p className="max-w-3xl text-base text-slate-200">
            We&apos;re ready to help with servicing, repairs, diagnostics, and bespoke fleet support. Book online, give us a
            call, or drop a message using the form below and we&apos;ll respond promptly.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="tel:07394433889"
              className="inline-flex h-11 items-center justify-center rounded-full bg-brand-orange px-6 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              Call 07394 433889
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              aria-label="Chat on WhatsApp"
              title="Chat on WhatsApp"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/40 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <span aria-hidden className="inline-flex"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M20.52 3.48A11.94 11.94 0 0 0 12.06 0C5.47 0 .1 5.37.1 12c0 2.12.56 4.14 1.62 5.94L0 24l6.2-1.6A11.86 11.86 0 0 0 12.06 24c6.58 0 11.94-5.37 11.94-12 0-3.2-1.25-6.2-3.48-8.52Zm-8.46 18.5c-1.86 0-3.63-.5-5.2-1.47l-.37-.22-3.68.95.98-3.58-.24-.37A9.65 9.65 0 0 1 2.3 12c0-5.38 4.38-9.76 9.76-9.76 2.6 0 5.06 1 6.9 2.83a9.66 9.66 0 0 1 2.86 6.93c0 5.38-4.38 9.76-9.76 9.76Zm5.63-7.3c-.3-.15-1.78-.88-2.06-.98-.28-.1-.49-.15-.7.15-.2.3-.8.98-.98 1.18-.2.2-.36.23-.66.08-.3-.15-1.25-.46-2.38-1.46-.88-.78-1.48-1.74-1.66-2.04-.18-.3 0-.47.14-.62.14-.14.3-.36.46-.54.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.54-.08-.15-.7-1.68-.96-2.3-.25-.6-.5-.5-.7-.51h-.6c-.2 0-.54.07-.82.38-.28.3-1.08 1.06-1.08 2.58 0 1.5 1.1 2.94 1.26 3.14.15.2 2.12 3.24 5.14 4.54.72.3 1.28.48 1.72.62.72.23 1.38.2 1.9.12.58-.08 1.78-.72 2.03-1.4.26-.7.26-1.3.2-1.4-.08-.12-.28-.2-.58-.35Z"/></svg></span>
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-8 rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-inner lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 text-sm text-slate-300">
          <div>
            <p className="font-semibold text-white">Workshop</p>
            <p>11 Cunliffe Dr, Kettering NN16 8LD</p>
          </div>
          <div>
            <p className="font-semibold text-white">Call us</p>
            <p>
              <a href="tel:07394433889" className="font-semibold text-brand-orange" aria-label="Call 07394 433889">
                07394 433889
              </a>
            </p>
          </div>
          <div>
            <p className="font-semibold text-white">Opening hours</p>
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {openingHours.map((day) => (
                <li key={day.day} className="flex items-center justify-between gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300">
                  <span>{day.day}</span>
                  <span className="text-brand-orange">{day.time}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-slate-400">
            Prefer instant confirmation? Use the online booking journey to reserve your service slot in minutes.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="hidden">
            <label className="sr-only">Company</label>
            <input value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300" htmlFor="contact-name">Name</label>
            <input
              id="contact-name"
              value={form.name}
              onChange={handleChange('name')}
              required
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'error-name' : undefined}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {fieldErrors.name ? <p id="error-name" className="mt-1 text-xs text-red-600">{fieldErrors.name}</p> : null}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300" htmlFor="contact-email">Email</label>
            <input
              type="email"
              id="contact-email"
              value={form.email}
              onChange={handleChange('email')}
              required
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'error-email' : undefined}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {fieldErrors.email ? <p id="error-email" className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300" htmlFor="contact-phone">Phone</label>
            <input
              id="contact-phone"
              value={form.phone}
              onChange={handleChange('phone')}
              required
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? 'error-phone' : undefined}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {fieldErrors.phone ? <p id="error-phone" className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p> : null}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300" htmlFor="contact-message">Message</label>
            <textarea
              id="contact-message"
              value={form.message}
              onChange={handleChange('message')}
              required
              rows={5}
              aria-invalid={Boolean(fieldErrors.message)}
              aria-describedby={fieldErrors.message ? 'error-message' : undefined}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {fieldErrors.message ? <p id="error-message" className="mt-1 text-xs text-red-600">{fieldErrors.message}</p> : null}
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          {status === 'success' ? (
            <p className="text-xs text-emerald-600">Thanks for your message. we&apos;ll be in touch shortly.</p>
          ) : null}
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="inline-flex h-11 items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === 'submitting' ? 'Sending…' : 'Send message'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default ContactPage;
