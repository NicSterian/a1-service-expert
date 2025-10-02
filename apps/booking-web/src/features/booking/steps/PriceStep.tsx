import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { SERVICE_DETAILS, type ServiceCode } from '@shared/pricing';
import { useBookingWizard } from '../state';
import { useCatalogSummary } from '../useCatalogSummary';

const priceFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});
const fmt = (p?: number | null) => (typeof p === 'number' ? priceFormatter.format(p / 100) : 'Contact us');

export function PriceStep() {
  const navigate = useNavigate();
  const { draft, updateDraft, markStepComplete } = useBookingWizard();
  const { catalog } = useCatalogSummary(); // optional now
  const [message, setMessage] = useState<string | null>(null);

  const hasService = Boolean(draft.serviceId && draft.serviceName);
  const engineSizeCc = draft.vehicle?.engineSizeCc ?? null;
  const serviceDetails = useMemo(() => {
    const code = (draft.serviceCode ?? undefined) as ServiceCode | undefined;
    return code ? SERVICE_DETAILS[code] : null;
  }, [draft.serviceCode]);

  const canContinue = hasService && typeof draft.pricePence === 'number';

  const handleContinue = () => {
    if (!canContinue) {
      setMessage('Select or confirm a price to continue.');
      toast.error('Price required to continue.');
      return;
    }
    // ensure draft fields are consistent (they should already be)
    updateDraft({
      pricePence: draft.pricePence!,
    });
    setMessage(null);
    markStepComplete('pricing');
    navigate('../date-time');
  };

  const handleBack = () => navigate('../vehicle');

  if (!hasService) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-brand-black">Pricing</h2>
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

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-brand-black">3. Confirm pricing</h2>
        <p className="text-slate-600">Engine size determines the service tier. Pricing below includes VAT.</p>
        {engineSizeCc ? (
          <p className="text-xs text-slate-500">Detected engine size: {engineSizeCc} cc</p>
        ) : (
          <p className="text-xs text-slate-500">Enter engine size on the previous step for an automatic price.</p>
        )}
        {message ? <p className="text-sm text-red-600">{message}</p> : null}
      </header>

      <section className="space-y-3 rounded border border-slate-200 bg-white p-4">
        <div>
          <h3 className="text-lg font-semibold text-brand-black">{serviceDetails?.name ?? draft.serviceName}</h3>
          <p className="text-sm text-slate-600">{serviceDetails?.description}</p>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
          {(serviceDetails?.disclaimers ?? [
            'Up to 5 litres of standard oil included. Certain oil types may incur additional charge.',
            'Additional costs for parts only and will not incur any labour charges.',
          ]).map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>

      <section className="rounded border border-slate-200 bg-orange-50 p-4">
        <p className="text-sm">
          <span className="font-semibold">Selected price: </span>
          {fmt(draft.pricePence)}
        </p>
        {catalog ? (
          <p className="mt-1 text-xs text-slate-500">
            (Catalog loaded. Admin prices will be used automatically if configured.)
          </p>
        ) : null}
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
          Continue to Date &amp; Time
        </button>
      </div>
    </div>
  );
}
