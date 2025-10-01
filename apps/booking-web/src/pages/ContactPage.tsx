import { ChangeEvent, FormEvent, useState } from 'react';
import { apiPost } from '../lib/api';

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

  const handleChange = (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.message) {
      setError('Please complete the required fields.');
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
    } catch (err) {
      setStatus('error');
      setError((err as Error).message ?? 'Something went wrong. Please try again later.');
    }
  };

  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl text-white shadow-xl">
        <img
          src="https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=70"
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
          <a
            href="tel:07394433889"
            className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-orange-400"
          >
            Call 07394 433889
          </a>
        </div>
      </section>

      <section className="grid gap-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 text-sm text-slate-600">
          <div>
            <p className="font-semibold text-brand-black">Workshop</p>
            <p>11 Cunliffe Dr, Kettering NN16 8LD</p>
          </div>
          <div>
            <p className="font-semibold text-brand-black">Call us</p>
            <p>
              <a href="tel:07394433889" className="font-semibold text-brand-orange">
                07394 433889
              </a>
            </p>
          </div>
          <div>
            <p className="font-semibold text-brand-black">Opening hours</p>
            <ul className="mt-3 grid gap-1 sm:grid-cols-2">
              {openingHours.map((day) => (
                <li key={day.day} className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                  <span>{day.day}</span>
                  <span className="text-brand-orange">{day.time}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-slate-500">
            Prefer instant confirmation? Use the online booking journey to reserve your service slot in minutes.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Name</label>
            <input
              value={form.name}
              onChange={handleChange('name')}
              required
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              required
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Phone</label>
            <input
              value={form.phone}
              onChange={handleChange('phone')}
              required
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Message</label>
            <textarea
              value={form.message}
              onChange={handleChange('message')}
              required
              rows={5}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          {status === 'success' ? (
            <p className="text-xs text-emerald-600">Thanks for your message. We&apos;ll be in touch shortly.</p>
          ) : null}
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="inline-flex items-center justify-center rounded bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === 'submitting' ? 'Sending…' : 'Send message'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default ContactPage;
