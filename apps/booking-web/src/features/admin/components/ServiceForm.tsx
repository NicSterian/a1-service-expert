export type ServiceFormValue = {
  code: string;
  name: string;
  description: string;
  pricingMode: 'TIERED' | 'FIXED';
  fixedPrice: string;
};

export function ServiceForm(props: {
  value: ServiceFormValue;
  onChange: (patch: Partial<ServiceFormValue>) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const { value, onChange, onSubmit } = props;
  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-2">
      <label className="text-xs text-slate-400">
        Code
        <input
          className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
          placeholder="e.g. SERVICE_1"
          value={value.code}
          onChange={(event) => onChange({ code: event.target.value })}
        />
      </label>
      <label className="text-xs text-slate-400">
        Name
        <input
          className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
          placeholder="Service name"
          value={value.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </label>
      <label className="text-xs text-slate-400 sm:col-span-2">
        Description (optional)
        <input
          className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
          placeholder="Short description"
          value={value.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </label>
      <label className="text-xs text-slate-400">
        Pricing mode
        <select
          className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
          value={value.pricingMode}
          onChange={(e) => onChange({ pricingMode: e.target.value as 'TIERED' | 'FIXED' })}
        >
          <option value="TIERED">TIERED</option>
          <option value="FIXED">FIXED</option>
        </select>
      </label>
      <label className="text-xs text-slate-400">
        Fixed price (GBP)
        <input
          className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
          placeholder="0.00"
          value={value.fixedPrice}
          onChange={(e) => onChange({ fixedPrice: e.target.value })}
          disabled={value.pricingMode !== 'FIXED'}
        />
      </label>
      <div className="sm:col-span-2 mt-2">
        <button type="submit" className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black hover:bg-orange-400">
          Add service
        </button>
      </div>
    </form>
  );
}

