import { MouseEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import heroBackground from '../assets/images/home-hero.svg';
import servicesFeature from '../assets/images/services-feature.png';
import reviewsBackground from '../assets/images/reviews-background.svg';

const heroHighlights = [
  {
    title: 'Same-day diagnostics',
    description: 'Dealer-level tooling for fast fault finding on every marque.',
  },
  {
    title: 'Transparent pricing',
    description: 'Fixed menu pricing with the online booking flow.',
  },
  {
    title: 'Precision servicing',
    description: 'Manufacturer-compliant programmes on every visit.',
  },
];

const showcaseServices = [
  {
    id: 'air-conditioning',
    title: 'Air Conditioning',
    blurb: 'Regas, leak trace, and deodorising treatments for year-round comfort.',
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden className="h-10 w-10 text-brand-orange">
        <path
          fill="currentColor"
          d="M24 4a2 2 0 0 1 2 2v8.09l5.54-5.55a2 2 0 1 1 2.83 2.83L28.83 16H38a2 2 0 1 1 0 4h-9.17l5.54 5.54a2 2 0 0 1-2.83 2.83L26 22.83V32a2 2 0 1 1-4 0v-9.17l-5.54 5.54a2 2 0 0 1-2.83-2.83L19.17 20H10a2 2 0 0 1 0-4h9.17l-5.54-5.54a2 2 0 1 1 2.83-2.83L22 14.09V6a2 2 0 0 1 2-2Z"
        />
      </svg>
    ),
  },
  {
    id: 'engine-diagnostics',
    title: 'Engine Diagnostics',
    blurb: 'Advanced fault detection, coding, and live data analysis.',
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden className="h-10 w-10 text-brand-orange">
        <path
          fill="currentColor"
          d="M16 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2h6a2 2 0 0 1 2 2v7a2 2 0 0 1-.59 1.41l-7.7 7.7a2 2 0 0 1-2.82 0l-5-5a2 2 0 0 1 0-2.82L30 12.83V9a2 2 0 0 0-4 0v14.17a2 2 0 0 1-.59 1.41l-5 5a2 2 0 0 1-2.82 0l-7-7A2 2 0 0 1 11.17 20H18a2 2 0 0 1 0 4h-1.17l3 3 3.59-3.59V9a6 6 0 0 1 6-6Z"
        />
      </svg>
    ),
  },
  {
    id: 'brake-systems',
    title: 'Brake Systems',
    blurb: 'Pads, discs, hydraulics, and safety checks in one visit.',
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden className="h-10 w-10 text-brand-orange">
        <path
          fill="currentColor"
          d="M24 4a20 20 0 1 1 0 40 20 20 0 0 1 0-40Zm-1 4.05A16 16 0 0 0 8.05 23H13a2 2 0 0 1 0 4H8.05A16 16 0 0 0 23 39.95V35a2 2 0 0 1 4 0v4.95A16 16 0 0 0 39.95 27H35a2 2 0 0 1 0-4h4.95A16 16 0 0 0 27 8.05V13a2 2 0 0 1-4 0V8.05ZM24 20a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"
        />
      </svg>
    ),
  },
  {
    id: 'general-repairs',
    title: 'General Repairs',
    blurb: 'Suspension, steering, exhausts, electrics, and more.',
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden className="h-10 w-10 text-brand-orange">
        <path
          fill="currentColor"
          d="M30 4a6 6 0 0 1 5.91 5H40a2 2 0 0 1 2 2v7a2 2 0 0 1-.59 1.41l-7.7 7.7a2 2 0 0 1-2.82 0l-5-5a2 2 0 0 1 0-2.82L30 12.83V9a2 2 0 0 0-4 0v14.17a2 2 0 0 1-.59 1.41l-5 5a2 2 0 0 1-2.82 0l-7-7A2 2 0 0 1 11.17 20H18a2 2 0 0 1 0 4h-1.17l3 3 3.59-3.59V9a6 6 0 0 1 6-6Z"
        />
      </svg>
    ),
  },
];

const extendedServices = [
  'Steering - power steering repairs, rack & pinion servicing, alignment',
  'Batteries - supply, fitting, and coding',
  'Clutches - replacement, hydraulic bleeding, and adjustment',
  'Cambelts - timing belt and tensioner replacement to schedule',
  'Engine rebuilds - component replacement and full overhauls',
  'Exhaust systems - repairs, DPF servicing, and emissions testing',
  'Oil & fluids - complete service packs, coolant and brake fluid maintenance',
  'General repairs - comprehensive solutions for cars and light vans',
];

const checklistIcon = (
  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-orange/90 text-xs text-white">
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 10l3 3 5-6" />
    </svg>
  </span>
);

const openingHours = [
  { day: 'Monday', time: '09:00 - 18:00' },
  { day: 'Tuesday', time: '09:00 - 18:00' },
  { day: 'Wednesday', time: '09:00 - 18:00' },
  { day: 'Thursday', time: '09:00 - 18:00' },
  { day: 'Friday', time: '09:00 - 18:00' },
  { day: 'Saturday', time: '09:00 - 14:30' },
  { day: 'Sunday', time: 'Closed' },
];

export function HomePage() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handlePointerMove = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 12;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -12;
    setTilt({ x, y });
  };

  const resetTilt = () => setTilt({ x: 0, y: 0 });

  const videoUrl = useMemo(() => '/media/a1-video.mp4', []);

  return (
    <div className="space-y-16">
      <section
        className="relative overflow-hidden rounded-3xl text-white shadow-xl"
        style={{ backgroundImage: `url(${heroBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-slate-950/75" />
        <div className="relative grid gap-10 p-8 sm:grid-cols-[1.1fr_0.9fr] sm:p-14">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-orange">Independent Specialists</p>
            
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Servicing, diagnostics, and repairs with dealer-level expertise.
            </h1>
            <p className="max-w-xl text-base text-slate-200">
              Our senior technicians blend diagnostic mastery with transparent communication. Book online in minutes and we
              take care of everything from accurate diagnosis to preventative maintenance tailored to your driving style.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/online-booking"
                className="inline-flex items-center justify-center rounded bg-brand-orange px-6 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-orange-400"
              >
                Book online now
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center justify-center rounded border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                Explore services
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {heroHighlights.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-xs text-slate-200">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div
            className="relative flex min-h-[260px] items-center justify-center"
            onMouseMove={handlePointerMove}
            onMouseLeave={resetTilt}
          >
            <div
              className="h-full w-full rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/20 to-orange-300/40 p-6 shadow-2xl backdrop-blur transition-transform"
              style={{ transform: `perspective(1200px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)` }}
            >
              <div className="flex h-full flex-col justify-between space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/80">Featured services</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Four essentials every driver relies on</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {showcaseServices.map((service) => (
                    <Link
                      key={service.id}
                      to={`/services#${service.id}`}
                      className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 text-left text-sm transition-transform duration-200 hover:-translate-y-1 hover:border-white/40 hover:bg-white/20"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white">
                        {service.icon}
                      </span>
                      <span>
                        <span className="block font-semibold text-white">{service.title}</span>
                        <span className="text-xs text-white/80">{service.blurb}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        style={{ backgroundImage: `url(${servicesFeature})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" />
        <div className="relative space-y-8 p-8 sm:p-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-orange">Comprehensive coverage</p>
              <h2 className="text-3xl font-semibold text-white">Every system, handled under one roof</h2>
            </div>
            <Link to="/services" className="text-sm font-semibold text-brand-orange transition hover:-translate-y-0.5 hover:underline">
              View the detailed services guide
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {showcaseServices.map((item) => (
              <Link
                key={item.id}
                to={`/services#${item.id}`}
                className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm transition-transform duration-200 hover:-translate-y-1.5 hover:shadow-xl"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange">
                  {item.icon}
                </span>
                <span>
                  <h3 className="text-xl font-semibold text-brand-black">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{item.blurb}</p>
                  <span className="mt-4 inline-flex items-center text-sm font-semibold text-brand-orange">
                    Learn more
                    <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
                    </svg>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl text-white shadow-xl">
        <video
          src={videoUrl}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          controls
          loop
          muted
          playsInline
        >
          <track kind="captions" label="" />
        </video>
        <div className="absolute inset-0 bg-slate-950/75" />
        <div className="relative grid gap-10 p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-14">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold">Workshop highlights</h2>
            <p className="max-w-2xl text-sm text-slate-200">
              From engine rebuilds to cambelts, our Kettering workshop handles every stage of a vehicle&rsquo;s life cycle. Browse the service icons above or explore the wider list below.
            </p>
            <ul className="grid gap-2 text-sm text-slate-200 md:grid-cols-2">
              {extendedServices.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  {checklistIcon}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-center gap-4">
            <div className="rounded-3xl border border-white/30 bg-white/10 p-6 backdrop-blur">
              <h3 className="text-lg font-semibold text-white">Why customers choose us</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-200">
                <li className="flex items-start gap-2">
                  {checklistIcon}
                  <span>Fixed-price servicing from &pound;79.95 with OE-quality parts.</span>
                </li>
                <li className="flex items-start gap-2">
                  {checklistIcon}
                  <span>Warranty-safe maintenance and transparent estimates.</span>
                </li>
                <li className="flex items-start gap-2">
                  {checklistIcon}
                  <span>Comfortable waiting area with free WiFi and refreshments.</span>
                </li>
              </ul>
            </div>
            <Link
              to="/online-booking"
              className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-orange-400"
            >
              Book your visit
            </Link>
          </div>
        </div>
      </section>

      <section
        className="relative overflow-hidden rounded-3xl text-white shadow-xl"
        style={{ backgroundImage: `url(${reviewsBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-slate-950/80" />
        <div className="relative flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-14">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-brand-orange">Reviews</p>
            <h2 className="text-3xl font-semibold">Read what Northamptonshire customers say</h2>
            <p className="max-w-2xl text-sm text-slate-200">
              We are proud of the recommendations we receive. Visit our Google profile to browse the latest reviews and see why motorists trust A1 Service Expert.
            </p>
          </div>
          <a
            href="https://www.google.com/search?q=A1+Service+Expert+Reviews&lrd=0x48779b0069361c17:0x2dd4b577752db42e,1,,,,"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 self-start rounded-full bg-brand-orange px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-orange-500"
          >
            <svg viewBox="0 0 48 48" className="h-6 w-6" aria-hidden>
              <path fill="#EA4335" d="M24 9.5c3.28 0 6.23 1.15 8.55 3.05l6.37-6.37C34.36 2.45 29.48 0 24 0 14.62 0 6.53 5.35 2.56 13.09l7.4 5.75C12.04 13.18 17.64 9.5 24 9.5Z" />
              <path fill="#34A853" d="M46.5 24.5c0-1.66-.17-3.26-.5-4.81H24v9.11h12.75c-.55 2.89-2.21 5.36-4.7 7.02l7.36 5.7C43.38 37.76 46.5 31.66 46.5 24.5Z" />
              <path fill="#4A90E2" d="M9.96 28.84a14.49 14.49 0 0 1-.76-4.34c0-1.5.27-2.94.76-4.34l-7.4-5.75A22.93 22.93 0 0 0 0 24.5C0 32.12 3.87 38.76 9.96 42.9l7.25-5.9c-2.13-1.2-3.92-2.98-5.25-5.05Z" />
              <path fill="#FBBC05" d="M24 47c5.48 0 10.36-1.8 14.25-4.73l-7.36-5.7c-2.05 1.38-4.66 2.19-6.89 2.19-5.33 0-9.86-3.59-11.48-8.44l-7.25 5.9C9.2 43.64 16.05 47 24 47Z" />
            </svg>
            See Google Reviews
          </a>
        </div>
      </section>

      <section className="space-y-6 rounded-3xl bg-white p-8 shadow-sm">
        <h2 className="text-3xl font-semibold text-brand-black">Get in touch</h2>
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4 text-sm text-slate-600">
            <div className="flex items-start gap-3">
              <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-orange/15 text-brand-orange">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.686-6-10A6 6 0 0 1 18 11c0 4.314-6 10-6 10Zm0-9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                </svg>
              </span>
              <div>
                <p className="font-semibold text-brand-black">Workshop</p>
                <p>11 Cunliffe Dr, Kettering NN16 8LD</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-orange/15 text-brand-orange">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 0 1 2-2h2.28a2 2 0 0 1 1.94 1.515l.74 2.964a2 2 0 0 1-.97 2.26l-1.21.726a11 11 0 0 0 5.1 5.1l.73-1.21a2 2 0 0 1 2.26-.97l2.96.74A2 2 0 0 1 21 18.72V21a2 2 0 0 1-2 2h-1c-8.284 0-15-6.716-15-15V5Z" />
                </svg>
              </span>
              <a href="tel:07394433889" className="inline-flex items-center gap-1 rounded-full border border-brand-orange px-4 py-2 font-semibold text-brand-orange transition hover:-translate-y-0.5 hover:bg-brand-orange hover:text-white">
                Call 07394 433889
              </a>
              <a
                href="https://wa.me/447394433889"
                target="_blank"
                rel="noreferrer"
                aria-label="Chat on WhatsApp"
                title="Chat on WhatsApp"
                className="inline-flex items-center gap-2 rounded-full border border-brand-orange px-4 py-2 font-semibold text-brand-orange transition hover:-translate-y-0.5 hover:bg-brand-orange hover:text-white"
              >
                <span aria-hidden className="inline-flex"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M20.52 3.48A11.94 11.94 0 0 0 12.06 0C5.47 0 .1 5.37.1 12c0 2.12.56 4.14 1.62 5.94L0 24l6.2-1.6A11.86 11.86 0 0 0 12.06 24c6.58 0 11.94-5.37 11.94-12 0-3.2-1.25-6.2-3.48-8.52Zm-8.46 18.5c-1.86 0-3.63-.5-5.2-1.47l-.37-.22-3.68.95.98-3.58-.24-.37A9.65 9.65 0 0 1 2.3 12c0-5.38 4.38-9.76 9.76-9.76 2.6 0 5.06 1 6.9 2.83a9.66 9.66 0 0 1 2.86 6.93c0 5.38-4.38 9.76-9.76 9.76Zm5.63-7.3c-.3-.15-1.78-.88-2.06-.98-.28-.1-.49-.15-.7.15-.2.3-.8.98-.98 1.18-.2.2-.36.23-.66.08-.3-.15-1.25-.46-2.38-1.46-.88-.78-1.48-1.74-1.66-2.04-.18-.3 0-.47.14-.62.14-.14.3-.36.46-.54.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.54-.08-.15-.7-1.68-.96-2.3-.25-.6-.5-.5-.7-.51h-.6c-.2 0-.54.07-.82.38-.28.3-1.08 1.06-1.08 2.58 0 1.5 1.1 2.94 1.26 3.14.15.2 2.12 3.24 5.14 4.54.72.3 1.28.48 1.72.62.72.23 1.38.2 1.9.12.58-.08 1.78-.72 2.03-1.4.26-.7.26-1.3.2-1.4-.08-.12-.28-.2-.58-.35Z"/></svg></span>
                WhatsApp
              </a>
            </div>
            <div>
              <p className="font-semibold text-brand-black">Opening hours</p>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {openingHours.map((entry) => (
                  <li key={entry.day} className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                    <span>{entry.day}</span>
                    <span className="text-brand-orange">{entry.time}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-brand-black">Follow us</p>
              <div className="mt-2 flex gap-3">
                <a
                  href="https://www.facebook.com/p/A1-Service-Expert-61559306016998/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-orange text-brand-orange transition hover:-translate-y-0.5 hover:bg-brand-orange hover:text-white"
                  aria-label="Facebook"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M22 12a10 10 0 1 0-11.5 9.87v-6.99H7.9V12h2.6V9.79c0-2.57 1.53-4 3.86-4 1.12 0 2.29.2 2.29.2v2.52h-1.29c-1.27 0-1.66.79-1.66 1.6V12h2.83l-.45 2.88h-2.38v6.99A10 10 0 0 0 22 12Z" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/a1service.expert/?hl=en"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-orange text-brand-orange transition hover:-translate-y-0.5 hover:bg-brand-orange hover:text-white"
                  aria-label="Instagram"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm-5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5Zm5-2.75a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 17 6.75Z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="space-y-4 text-sm text-slate-600">
            <p className="font-semibold text-brand-black">Ready to book?</p>
            <p>
              Use our online booking tool for instant availability, or drop us a message via the contact form and our service advisors will get straight back to you.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/online-booking"
                className="inline-flex items-center justify-center rounded bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-orange-500"
              >
                Start booking
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded border border-brand-orange px-4 py-2 text-sm font-semibold text-brand-orange transition hover:-translate-y-0.5 hover:bg-orange-50"
              >
                Contact us
              </Link>
            </div>
            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <iframe
                title="A1 Service Expert location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2432.370825002624!2d-0.717838823409184!3d52.40985247201358!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48779b0069361c17%3A0x2dd4b577752db42e!2s11%20Cunliffe%20Dr%2C%20Kettering%20NN16%208LD!5e0!3m2!1sen!2suk!4v1700000000000!5m2!1sen!2suk"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                className="h-64 w-full border-0"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}













