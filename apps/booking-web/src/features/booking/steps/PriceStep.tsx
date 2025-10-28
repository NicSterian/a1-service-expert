import { useMemo } from 'react';
import toast from 'react-hot-toast';
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
  const { draft, markStepComplete } = useBookingWizard();
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

  const canContinue = hasService && typeof draft.pricePence === 'number';

  const handleContinue = () => {
    if (!canContinue) {
      toast.error('Vehicle details are required before continuing.');
      return;
    }
    markStepComplete('pricing');
    navigate('../date-time');
  };

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

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-1 items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-black text-white">
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
              <h3 className="text-lg font-semibold text-brand-black">
                {draft.serviceName ?? serviceDetails?.name}
              </h3>
              <p className="text-sm text-slate-600">
                {draft.serviceDescription ?? serviceDetails?.description}
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-500">
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
            <div className="text-xs uppercase text-orange-600">Tier</div>
            <div className="text-base font-semibold text-brand-black">{tier}</div>
            <div className="text-xs uppercase text-orange-600">Total</div>
            <div className="text-xl font-bold text-brand-black">{priceText ?? 'Contact us'}</div>
            {catalog ? (
              <div className="text-[11px] text-slate-500">
                Catalog prices applied automatically.
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-700 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-slate-500">Vehicle</p>
            <p className="font-semibold uppercase tracking-wide text-brand-black">{vrm}</p>
            <p>{make}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Engine size</p>
            <p className="font-semibold text-brand-black">{engineSize}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Price tier</p>
            <p className="font-semibold text-brand-black">{tier}</p>
          </div>
        </div>
      </section>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:border-slate-400"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!canContinue}
          onClick={handleContinue}
          className="rounded bg-brand-orange px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
