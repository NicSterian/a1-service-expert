import { Link } from 'react-router-dom';
import diagnosticsHero from '../assets/images/diagnostics-hero.svg';

const diagnosticPoints = [
  'OEM-level fault code reading with guided fault trees.',
  'Live data monitoring, oscilloscope testing, and smoke diagnostics.',
  'Software updates, ECU coding, and key programming support.',
  'ADAS calibration and driver safety system resets.',
  'Hybrid and EV platform diagnostics, including battery management.',
  'Electrical tracing for intermittent faults and wiring issues.',
];

export function DiagnosticsPage() {
  return (
    <div className="space-y-16">
      <section
        className="relative overflow-hidden rounded-3xl text-white shadow-xl"
        style={{ backgroundImage: `url(${diagnosticsHero})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-slate-950/80" />
        <div className="relative space-y-6 p-8 sm:p-14">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-brand-orange">Diagnostics</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">Dealer-level diagnostics without the dealer price</h1>
          <p className="max-w-3xl text-base text-slate-200">
            Our workshop is equipped with the latest manufacturer and multi-brand diagnostic platforms. Warning lights, electrical faults, software updates — we identify the root cause quickly so you can get back on the road with confidence.
          </p>
          <Link
            to="/online-booking"
            className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-orange-400"
          >
            Book a diagnostic slot
          </Link>
        </div>
      </section>

      <section className="grid gap-8 rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-inner lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">What we deliver</h2>
          <ul className="space-y-2.5 text-sm text-slate-400">
            {diagnosticPoints.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-500" />
                <span className="leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-700 bg-slate-800 p-6 text-white shadow-lg">
          <h3 className="text-lg font-semibold">Included with every assessment</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>Photographic and data-backed reports for complete transparency.</li>
            <li>Priority booking for follow-up repairs identified during diagnostics.</li>
            <li>Access to manufacturer technical bulletins and wiring diagrams.</li>
          </ul>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-inner">
        <h2 className="text-2xl font-semibold text-white">How to book</h2>
        <p className="mt-2 text-sm text-slate-300">
          Choose a diagnostic appointment through our online booking journey and let us know the symptoms you&apos;re experiencing. We&apos;ll provide a clear report, estimate, and repair plan before any work begins.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/online-booking"
            className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            Reserve a time
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            Speak to a technician
          </Link>
        </div>
      </section>
    </div>
  );
}

export default DiagnosticsPage;

