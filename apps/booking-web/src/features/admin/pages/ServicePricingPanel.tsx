import type { AdminBookingResponse } from './AdminBookingDetailPage';

export function ServicePricingPanel(props: {
  booking: AdminBookingResponse;
  drafts: Record<number, string>;
  setDraft: (updater: (prev: Record<number, string>) => Record<number, string>) => void;
  onSavePrice: (serviceLineId: number) => void;
  loading: boolean;
}) {
  const { booking, drafts, setDraft, onSavePrice, loading } = props;
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 lg:col-span-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Services</h3>
      <div className="mt-4 space-y-3">
        {booking.services.length === 0 ? (
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-300">No services recorded.</div>
        ) : (
          booking.services.map((service) => (
            <div key={service.id} className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white">{service.serviceName ?? 'Service'}</span>
                {service.engineTierName && (
                  <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300">{service.engineTierName}</span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-400 sm:grid-cols-3">
                <div>Code: {service.serviceCode ?? '-'}</div>
                <div>Pricing: {service.pricingMode ?? '-'}</div>
                <div className="flex items-center gap-2">
                  <span>Price:</span>
                  <input
                    value={drafts[service.id] ?? ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [service.id]: e.target.value }))}
                    className="w-24 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white"
                    placeholder="0.00"
                    inputMode="decimal"
                  />
                  <button
                    onClick={() => onSavePrice(service.id)}
                    className="rounded-full border border-slate-600 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:border-orange-500 hover:text-orange-300"
                    type="button"
                    disabled={loading}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

