import { Link } from 'react-router-dom';

export function RegisterPage() {
  return (
    <section className="mx-auto max-w-2xl space-y-6 rounded-3xl bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold text-brand-black">Create your A1 Service Expert account</h1>
      <p className="text-slate-600">
        You now create your account while confirming a booking. This ensures we capture all the details we need to
        prepare for your visit and keeps your profile in sync. Start a booking, choose your service, and you&apos;ll be
        prompted to add your details and set a password during the final step.
      </p>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        <p className="font-semibold text-brand-black">Need an account?</p>
        <p className="mt-2">
          Begin a booking, enter the date and time that suits you, and we&apos;ll guide you through account creation on
          the confirmation page—no separate registration required.
        </p>
      </div>
      <Link
        to="/online-booking"
        className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-5 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-orange-400"
      >
        Start a booking
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
        </svg>
      </Link>
    </section>
  );
}
