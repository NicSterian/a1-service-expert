import { Link } from 'react-router-dom';
import servicesFeature from '../assets/images/services-feature.png';
const heroVideo = '/media/a1-video.mp4';

const dropletIcon = (
  <svg viewBox="0 0 48 48" aria-hidden className="h-10 w-10 text-brand-orange">
    <path
      fill="currentColor"
      d="M24 4c5.3 6.54 12 15.32 12 22a12 12 0 0 1-24 0c0-6.68 6.7-15.46 12-22Zm0 14c-2.78 3.52-4 5.82-4 8a4 4 0 1 0 8 0c0-2.18-1.22-4.48-4-8Z"
    />
  </svg>
);

const interimIcon = (
  <svg viewBox="0 0 48 48" aria-hidden className="h-10 w-10 text-brand-orange">
    <path
      fill="currentColor"
      d="M12 8a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v4h4a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Zm2 8v16h20V12H16v4Zm6 0h8v8h-8v-8Z"
    />
  </svg>
);

const fullServiceIcon = (
  <svg viewBox="0 0 48 48" aria-hidden className="h-10 w-10 text-brand-orange">
    <path
      fill="currentColor"
      d="M18 4h12a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-2v4h6a4 4 0 0 1 4 4v12h-8v-8h-4v8h-8V28a4 4 0 0 1 4-4h2v-4h-2a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Zm2 12v-4h8v4h-8Z"
    />
  </svg>
);

const snowflakeIcon = (
  <svg viewBox="0 0 48 48" aria-hidden className="h-8 w-8" fill="currentColor">
    <path d="M22 4v6.34l-4.24-4.24-2.83 2.83L21.17 16H15v4h6.17l-6.24 6.24 2.83 2.83L22 24.83V30h4v-5.17l4.24 4.24 2.83-2.83L26.83 20H33v-4h-6.17l6.24-6.24-2.83-2.83L26 10.34V4h-4Z" />
  </svg>
);

const diagnosticsIcon = (
  <svg viewBox="0 0 48 48" aria-hidden className="h-8 w-8" fill="currentColor">
    <path d="M16 4a4 4 0 0 0-4 4v6H8a4 4 0 0 0-4 4v6h8v-4h24v4h8v-6a4 4 0 0 0-4-4h-4V8a4 4 0 0 0-4-4H16Zm4 28v12h8V32h-8Zm-8 0a4 4 0 0 0-4 4v8h8v-8a4 4 0 0 0-4-4Zm24 0a4 4 0 0 0-4 4v8h8v-8a4 4 0 0 0-4-4Z" />
  </svg>
);

const brakeIcon = (
  <svg viewBox="0 0 48 48" aria-hidden className="h-8 w-8" fill="currentColor">
    <path d="M24 4a20 20 0 1 0 0 40 20 20 0 0 0 0-40Zm0 8a12 12 0 1 1-12 12h6a6 6 0 1 0 6-6V12Z" />
  </svg>
);

const suspensionIcon = (
  <svg viewBox="0 0 48 48" aria-hidden className="h-8 w-8" fill="currentColor">
    <path d="M14 6a4 4 0 0 1 4 4v6.34l13.17-13.17 2.83 2.83L21.66 19H30a4 4 0 0 1 0 8h-8v10a4 4 0 0 1-8 0V25.66L8.34 30 5.5 27.17 14 18.66V10a4 4 0 0 1 4-4Z" />
  </svg>
);

const steeringIcon = (
  <svg viewBox="0 0 48 48" aria-hidden className="h-8 w-8" fill="currentColor">
    <path d="M24 4a20 20 0 1 0 0 40 20 20 0 0 0 0-40Zm0 6a14 14 0 0 1 13.66 11H34a2 2 0 0 0-2 2v1a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4v-1a2 2 0 0 0-2-2H10.34A14 14 0 0 1 24 10Zm0 28a14 14 0 0 1-13.66-11H16a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6h5.66A14 14 0 0 1 24 38Z" />
  </svg>
);

const batteryIcon = (
  <svg viewBox="0 0 48 48" aria-hidden className="h-8 w-8" fill="currentColor">
    <path d="M8 10a4 4 0 0 0-4 4v16a4 4 0 0 0 4 4h32a4 4 0 0 0 4-4V14a4 4 0 0 0-4-4h-4V8a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H18V8a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H8Zm6 8h4v4h-4v-4Zm10 0h4v4h-4v-4Zm10 0h4v4h-4v-4Z" />
  </svg>
);

const clutchIcon = (
  <svg viewBox="0 0 48 48" aria-hidden className="h-8 w-8" fill="currentColor">
    <path d="M24 4a20 20 0 1 0 0 40 20 20 0 0 0 0-40Zm0 6a14 14 0 0 1 12.62 21H27a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3h9.62A14 14 0 0 1 24 10Zm-3 12v6a3 3 0 0 1-3 3H7.38A14 14 0 0 1 21 10v9Z" />
  </svg>
);

const cambeltIcon = (
  <svg viewBox="0 0 48 48" aria-hidden className="h-8 w-8" fill="currentColor">
    <path d="M24 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 22a14 14 0 0 0-14 14v4a4 4 0 0 0 4 4h20a4 4 0 0 0 4-4v-4a14 14 0 0 0-14-14Z" />
  </svg>
);

const engineRebuildIcon = (
  <svg viewBox="0 0 48 48" aria-hidden className="h-8 w-8" fill="currentColor">
    <path d="M18 6h12a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4h-2v6h4a4 4 0 0 1 4 4v6h-8v-6h-4v6h-8v-6a4 4 0 0 1 4-4h4v-6h-2a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4Zm2 8v6a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2Z" />
  </svg>
);

const exhaustIcon = (
  <svg viewBox="0 0 48 48" aria-hidden className="h-8 w-8" fill="currentColor">
    <path d="M6 24a6 6 0 0 1 6-6h10l4-6h10a6 6 0 0 1 6 6v6h-6v8a6 6 0 0 1-6 6H20l-4-6h-4a6 6 0 0 1-6-6Z" />
  </svg>
);

const fluidsIcon = (
  <svg viewBox="0 0 48 48" aria-hidden className="h-8 w-8" fill="currentColor">
    <path d="M20 4h8a4 4 0 0 1 4 4v4h4a4 4 0 0 1 4 4v24H12V16a4 4 0 0 1 4-4h4V8a4 4 0 0 1 4-4Zm0 18a4 4 0 1 0 0 8h8a4 4 0 1 0 0-8h-8Z" />
  </svg>
);

const generalRepairsIcon = (
  <svg viewBox="0 0 48 48" aria-hidden className="h-8 w-8" fill="currentColor">
    <path d="M20 6a6 6 0 0 1 11.66-2h6.34v6.34a6 6 0 0 1-2 11.66L30 28.34V36h6v8H12v-8h6v-5.66L12.66 24a6 6 0 0 1-2-11.66V6h6.34A6 6 0 0 1 20 6Z" />
  </svg>
);

const primaryServices = [
  {
    id: 'service-1',
    title: 'Service 1',
    highlight: 'Oil & Oil Filter Change',
    summary: 'Core lubrication refresh to keep engines protected.',
    icon: dropletIcon,
    details: ['Oil change*', 'Oil filter change', 'Check & top up all fluid levels'],
  },
  {
    id: 'service-2',
    title: 'Service 2',
    highlight: 'Interim Service',
    summary: 'Adds safety inspections and intake care on top of Service 1.',
    icon: interimIcon,
    details: [
      'SERVICE 1 PLUS',
      'Air filter change',
      'Visual brake check',
      'Check & report on battery condition',
      'Full underbody inspections',
    ],
  },
  {
    id: 'service-3',
    title: 'Service 3',
    highlight: 'Full Service',
    summary: 'Complete annual refresh for dependable performance.',
    icon: fullServiceIcon,
    details: [
      'SERVICE 2 PLUS',
      'Replace cabin filters',
      'Replace spark plugs (additional cost for platinum or iridium)',
      'Full brake and disc check',
      'Replace fuel filters if required (additional cost for parts)',
    ],
  },
];

const servicingNotes = [
  'Fixed Price Menu Servicing',
  'All prices include VAT at 20%',
  'Applies to 4 cylinder cars only',
];

const fixedPriceRows = [
  {
    engineSize: 'Small Cars up to 1200cc',
    service1: '\u00A379.95',
    service2: '\u00A3119.95',
    service3: '\u00A3179.95',
  },
  {
    engineSize: 'Medium Cars up to 1600cc',
    service1: '\u00A389.95',
    service2: '\u00A3129.95',
    service3: '\u00A3179.95',
  },
  {
    engineSize: 'Large Cars up to 2200cc',
    service1: '\u00A399.95',
    service2: '\u00A3139.95',
    service3: '\u00A3199.95',
  },
  {
    engineSize: 'Extra-Large Cars over 2200cc',
    service1: '\u00A3109.95',
    service2: '\u00A3159.95',
    service3: '\u00A3219.95',
  },
];

const supportingServices = [
  {
    title: 'Air Conditioning',
    copy: 'Regas, leak tracing, and deodorising refreshes keep cabins chilled and clean.',
    icon: snowflakeIcon,
  },
  {
    title: 'Engine Diagnostics',
    copy: 'Dealer-level tooling for coding, live data, and electrical fault investigation.',
    icon: diagnosticsIcon,
  },
  {
    title: 'Brake Systems',
    copy: 'Pads, discs, hydraulics, and ABS servicing for confident stopping power.',
    icon: brakeIcon,
  },
  {
    title: 'Suspension & Alignment',
    copy: 'Four-wheel alignment, geometry set-ups, and ride refinement tuned to your vehicle.',
    icon: suspensionIcon,
  },
  {
    title: 'Steering',
    copy: 'Power steering repairs, rack and pinion servicing, and precise alignments.',
    icon: steeringIcon,
  },
  {
    title: 'Batteries',
    copy: 'Supply, fitting, coding, and diagnostic health reports for every battery type.',
    icon: batteryIcon,
  },
  {
    title: 'Clutches',
    copy: 'Replacement, hydraulic bleeding, and adjustment for manual transmissions.',
    icon: clutchIcon,
  },
  {
    title: 'Cambelts',
    copy: 'Timing belt and tensioner replacement to manufacturer schedules.',
    icon: cambeltIcon,
  },
  {
    title: 'Engine Rebuilds',
    copy: 'Component replacement and full overhauls with trusted machining partners.',
    icon: engineRebuildIcon,
  },
  {
    title: 'Exhaust Systems',
    copy: 'Repairs, DPF servicing, and emissions compliance checks.',
    icon: exhaustIcon,
  },
  {
    title: 'Oil & Fluids',
    copy: 'Coolant, brake, and power steering fluid maintenance on schedule.',
    icon: fluidsIcon,
  },
  {
    title: 'General Repairs',
    copy: 'Comprehensive solutions for cars and light vans covering every concern.',
    icon: generalRepairsIcon,
  },
];

export function ServicesPage() {
  return (
    <div className="space-y-16">
      <section
        className="relative overflow-hidden rounded-3xl text-white shadow-xl"
      >
        <video
          src={heroVideo}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-slate-950/80" />
        <div className="relative space-y-6 p-8 sm:p-14">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-brand-orange">Our services</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">Comprehensive care for every system</h1>
          <p className="max-w-3xl text-base text-slate-200">
            From preventative servicing to complex diagnostics, A1 Service Expert keeps cars and light vans running exactly as the manufacturer intended. Book online or talk to the team for a tailored plan; every repair uses OE-quality parts and comes with transparent, fixed pricing.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/online-booking"
              className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-orange-400"
            >
              Book online today
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              Request a tailored quote
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-8 rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-inner lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          {primaryServices.map((service) => (
            <article
              key={service.id}
              id={service.id}
              className="group rounded-3xl border border-slate-700 bg-slate-800 p-6 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-orange-500 hover:shadow-xl"
            >
              <header className="flex items-start gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10 text-orange-500 transition-all duration-200 group-hover:bg-orange-500/20 group-hover:text-orange-400 group-hover:shadow-lg group-hover:ring-2 group-hover:ring-orange-500">
                  {service.icon}
                </span>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-orange-400">{service.title}</p>
                  <h2 className="text-2xl font-semibold text-white">{service.highlight}</h2>
                  <p className="text-sm leading-relaxed text-slate-300">{service.summary}</p>
                </div>
              </header>
              <ul className="mt-5 space-y-2.5 text-sm text-slate-400">
                {service.details.map((detail) => (
                  <li key={detail} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
                    <span className="leading-relaxed">{detail}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
          <div className="rounded-3xl border border-orange-500/30 bg-orange-500/5 p-6 shadow-lg backdrop-blur-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-400">Servicing notes</p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-300">
              {servicingNotes.map((note) => (
                <li key={note} className="flex items-start gap-3">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              Up to 5 litres of standard oil is included. Certain oil types may incur an additional charge. Additional parts are supplied at cost only; no extra labour fees applied.
            </p>
          </div>
        </div>

        <aside className="relative overflow-hidden rounded-3xl">
          <div
            className="absolute inset-0"
            style={{ backgroundImage: `url(${servicesFeature})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
          <div className="relative flex h-full flex-col justify-between gap-6 rounded-3xl bg-slate-950/80 p-8 text-white">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-orange">Workshop advantages</p>
              <h2 className="text-3xl font-semibold">Specialists in complex repairs</h2>
              <p className="text-sm text-slate-200">
                From cambelt timing to gearbox rebuilds, our master technicians combine dealer tooling with decades of experience so every visit leaves your vehicle running at its best.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-slate-200">
              {[
                'OEM-compliant parts with full warranty support.',
                'Digital health reports and photographic updates.',
                'Courtesy cars and collection available on request.',
              ].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-orange/90 text-xs text-slate-950">
                    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m3 9 3 3 7-7" />
                    </svg>
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400"
            >
              Discuss your repair
            </Link>
          </div>
        </aside>
      </section>

      <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-semibold text-brand-black">Fixed Price Menu Servicing</h2>
          <p className="text-sm text-slate-600">All prices include VAT at 20% and apply to 4 cylinder cars only.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] table-fixed border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-xs uppercase tracking-wider text-slate-600">
                <th className="px-4 py-3 font-semibold">Engine size</th>
                <th className="px-4 py-3 font-semibold">Service 1<br /><span className="text-[10px] font-normal uppercase text-slate-500">Oil &amp; Oil Filter</span></th>
                <th className="px-4 py-3 font-semibold">Service 2<br /><span className="text-[10px] font-normal uppercase text-slate-500">Interim</span></th>
                <th className="px-4 py-3 font-semibold">Service 3<br /><span className="text-[10px] font-normal uppercase text-slate-500">Full</span></th>
              </tr>
            </thead>
            <tbody>
              {fixedPriceRows.map((row, index) => (
                <tr key={row.engineSize} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-4 py-3 font-semibold text-brand-black">{row.engineSize}</td>
                  <td className="px-4 py-3 text-slate-700">{row.service1}</td>
                  <td className="px-4 py-3 text-slate-700">{row.service2}</td>
                  <td className="px-4 py-3 text-slate-700">{row.service3}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="space-y-1 text-xs text-slate-500">
          <li>* Up to 5 litres of standard oil included. Certain oil types will incur an additional charge.</li>
          <li>* Additional costs for parts only and will not incur any labour charges.</li>
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-inner sm:p-12">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <h2 className="text-3xl font-semibold text-white">More ways we keep you moving</h2>
          <p className="text-sm text-slate-300">
            Pair any of these services with the online booking journey or discuss a bespoke maintenance plan with our service advisors.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {supportingServices.map((service) => (
            <div
              key={service.title}
              className="group flex h-full flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-800 p-6 text-left shadow-lg transition duration-200 hover:-translate-y-1 hover:border-orange-500 hover:bg-slate-750 hover:shadow-xl"
            >
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10 text-orange-500 transition-all duration-200 group-hover:bg-orange-500 group-hover:text-black group-hover:shadow-lg">
                {service.icon}
              </span>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white transition-colors duration-200 group-hover:text-orange-400">{service.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400 transition-colors duration-200 group-hover:text-slate-300">{service.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}




