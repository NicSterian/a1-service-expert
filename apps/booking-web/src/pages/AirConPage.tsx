import { Link } from 'react-router-dom';
import airConHero from '../assets/images/aircon-hero.svg';
import airConHighlight from '../assets/images/aircon-highlight.svg';

const airConHighlights = [
  'R134a and R1234yf refrigerant handling with accredited recovery stations.',
  'UV and nitrogen leak detection to prevent repeat visits.',
  'Cabin filter replacement, ozone, and anti-bacterial treatments.',
  'Climate control diagnostics, compressor and condenser repairs.',
];

const packages = [
  {
    title: 'Refresh & Regas',
    copy: 'Ideal for systems blowing warm air. Includes pressure testing, regas, and performance report.',
  },
  {
    title: 'Deep Clean & Protect',
    copy: 'Cabin filter, anti-bacterial treatment, and odour removal for a healthier cabin.',
  },
  {
    title: 'Full System Repair',
    copy: 'Component sourcing, compressor or condenser replacement, and recalibration.',
  },
];

export function AirConPage() {
  return (
    <div className="space-y-16">
      <section
        className="relative overflow-hidden rounded-3xl text-white shadow-xl"
        style={{ backgroundImage: `url(${airConHero})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-slate-950/80" />
        <div className="relative space-y-6 p-8 sm:p-14">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-brand-orange">Air conditioning</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">Comfort in every cabin</h1>
          <p className="max-w-3xl text-base text-slate-200">
            A1 Service Expert keeps cabins cool, clean, and quiet all year round. From routine re-gassing to complex electrical faults, our technicians diagnose issues quickly using accredited equipment and genuine refrigerants.
          </p>
          <Link
            to="/online-booking"
            className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-orange-400"
          >
            Book an air-con appointment
          </Link>
        </div>
      </section>

      <section className="grid gap-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-brand-black">What we inspect every time</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            {airConHighlights.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-orange" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div
          className="relative h-64 overflow-hidden rounded-3xl"
          style={{ backgroundImage: `url(${airConHighlight})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 space-y-2 text-sm text-white">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-orange">Certified handling</p>
            <p className="text-lg font-semibold">F-Gas registered technicians with EPA-compliant equipment.</p>
          </div>
        </div>
      </section>

      <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-brand-black">Packages tailored to your vehicle</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {packages.map((pkg) => (
            <article key={pkg.title} className="flex h-full flex-col rounded-3xl border border-slate-200 p-6 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl">
              <h3 className="text-lg font-semibold text-brand-black">{pkg.title}</h3>
              <p className="mt-3 flex-1 text-sm text-slate-600">{pkg.copy}</p>
              <Link
                to="/online-booking"
                className="mt-6 inline-flex items-center text-sm font-semibold text-brand-orange transition hover:-translate-y-0.5 hover:underline"
              >
                Schedule now
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-xl">
        <h2 className="text-2xl font-semibold">Fast turnaround, guaranteed comfort</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-200">
          Bring your vehicle in for an 8-point air-conditioning check. Our team will provide photographic evidence of any leaks or component wear so you can decide the next steps with confidence.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/online-booking"
            className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-orange-400"
          >
            Book a diagnostic check
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            Talk to the team
          </Link>
        </div>
      </section>
    </div>
  );
}

export default AirConPage;
