import { ENGINE_TIER_CODES, SERVICE_DETAILS, type EngineTierCode, type ServiceCode } from '@a1/shared/pricing';
import { formatPrice } from '../utils/format';
import type { ServiceOption, ServicePriceMap } from '../hooks/useServiceOptions';

/** Legacy list of selectable service buttons with inline tier pricing */
export function LegacyServiceList({
  serviceOptions,
  pricesByService,
  selectedServiceCode,
  onSelect,
  message,
}: {
  serviceOptions: ServiceOption[];
  pricesByService: Map<ServiceCode, ServicePriceMap>;
  selectedServiceCode: ServiceCode | null;
  onSelect: (code: ServiceCode) => void;
  message: string | null;
}) {
  return (
    <div className="space-y-6">
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
      <div className="grid gap-4">
        {serviceOptions.map(({ code, summary }) => {
          const details = SERVICE_DETAILS[code];
          const priceMap = pricesByService.get(code);
          const isSelected = selectedServiceCode === code;
          const isAvailable = Boolean(summary);
          return (
            <button
              key={code}
              type="button"
              onClick={() => onSelect(code)}
              disabled={!isAvailable}
              className={`space-y-3 rounded border px-4 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-brand-orange ${isSelected ? 'border-brand-orange bg-orange-50 text-brand-orange' : 'border-slate-200 bg-white text-slate-700'} ${!isAvailable ? 'cursor-not-allowed opacity-60' : 'hover:border-brand-orange hover:text-brand-orange'}`}
            >
              <div>
                <h3 className="text-lg font-semibold">{summary?.name ?? details.name}</h3>
                <p className="text-sm text-slate-600">{summary?.description ?? details.description}</p>
              </div>
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
                {details.disclaimers.map((d) => (<li key={d}>{d}</li>))}
              </ul>
              <div className="grid gap-2 text-xs sm:grid-cols-4">
                {ENGINE_TIER_CODES.map((tier: EngineTierCode) => (
                  <div key={tier} className="rounded border border-slate-200 bg-slate-50 p-2 text-center">
                    <p className="font-semibold text-slate-700">{tier}</p>
                    <p className="text-slate-600">{formatPrice(priceMap?.[tier])}</p>
                  </div>
                ))}
              </div>
              {!isAvailable ? (<p className="text-xs text-red-600">This service is not currently available.</p>) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default LegacyServiceList;
