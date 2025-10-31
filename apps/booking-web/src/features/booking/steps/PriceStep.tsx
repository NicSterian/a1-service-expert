import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SERVICE_DETAILS, type ServiceCode } from '@a1/shared/pricing';
import { useBookingWizard } from '../state';
import { useCatalogSummary } from '../useCatalogSummary';

const priceFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

export function PriceStep() {
  const navigate = useNavigate();
  const { draft } = useBookingWizard();
  const { catalog } = useCatalogSummary();

  const hasService = Boolean(draft.serviceId && draft.serviceName);
  const serviceDetails = useMemo(() => {
    const code = (draft.serviceCode ?? undefined) as ServiceCode | undefined;
    return code ? SERVICE_DETAILS[code] : null;
  }, [draft.serviceCode]);

  const priceText =
    typeof draft.pricePence === 'number'
      ? priceFormatter.format(draft.pricePence / 100)
      : null;

  const handleBack = () => {
    navigate('..');
  };

  if (!hasService) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-brand-black">2. Booking summary</h2>
        <p className="text-sm text-red-600">Please choose a service package first.</p>
        <button
          type="button"
          onClick={() => navigate('..')}
          className="rounded bg-brand-orange px-4 py-2 text-white hover:bg-orange-500"
        >
          Go to services
        </button>
      </div>
    );
  }

  const engineSize = draft.vehicle?.engineSizeCc
    ? `${draft.vehicle.engineSizeCc} cc`
    : 'Not provided';
  const vrm = draft.vehicle?.vrm ?? 'N/A';
  const tier = draft.engineTierName ?? 'To be confirmed';
  const make = draft.vehicle?.make ?? '';

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-brand-black">2. Booking summary</h2>
        <p className="text-slate-600">
          Double-check your selected service and vehicle details before choosing an appointment.
        </p>
      </header>

      <section className="space-y-4 rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-inner">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-1 items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 text-black">
              <svg
                aria-hidden="true"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 15h14l1.5 4H3.5L5 15Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M7 11a5 5 0 1 1 10 0v4H7v-4Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <circle cx="8.5" cy="18.5" r="1.5" fill="currentColor" />
                <circle cx="15.5" cy="18.5" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {draft.serviceName ?? serviceDetails?.name}
              </h3>
              <p className="text-sm text-slate-300">
                {draft.serviceDescription ?? serviceDetails?.description}
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-400">
                {(serviceDetails?.disclaimers ?? [
                  'Up to 5 litres of standard oil included. Certain oil types may incur an additional charge.',
                  'Additional costs for parts only and will not incur any labour charges.',
                ]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            <div className="text-xs uppercase text-orange-400">Tier</div>
            <div className="text-base font-semibold text-white">{tier}</div>
            <div className="text-xs uppercase text-orange-400">Total</div>
            <div className="text-xl font-bold text-orange-400">{priceText ?? 'Contact us'}</div>
            {catalog ? (
              <div className="text-[11px] text-slate-400">
                Catalog prices applied automatically.
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl bg-slate-800/60 p-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-slate-400">Vehicle</p>
            <p className="font-semibold uppercase tracking-wide text-white">{vrm}</p>
            <p className="text-slate-300">{make}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Engine size</p>
            <p className="font-semibold text-white">{engineSize}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Price tier</p>
            <p className="font-semibold text-white">{tier}</p>
          </div>
        </div>
      </section>

      <div className="flex justify-start">
        <button
          type="button"
          onClick={handleBack}
          className="rounded-full bg-slate-800 px-6 py-2 text-sm font-semibold text-slate-100 transition hover:bg-orange-500 hover:text-black"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
