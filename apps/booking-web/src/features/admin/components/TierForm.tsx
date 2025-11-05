export type TierFormValue = {
  name: string;
  maxCc: string;
  sortOrder: string;
};

export function TierForm(props: {
  value: TierFormValue;
  onChange: (patch: Partial<TierFormValue>) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const { value, onChange, onSubmit } = props;
  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-3">
      <label className="text-xs text-slate-400">
        Name
        <input
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          required
        />
      </label>
      <label className="text-xs text-slate-400">
        Max CC
        <input
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
          placeholder="leave blank"
          value={value.maxCc}
          onChange={(e) => onChange({ maxCc: e.target.value })}
        />
      </label>
      <label className="text-xs text-slate-400">
        Sort order
        <input
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
          value={value.sortOrder}
          onChange={(e) => onChange({ sortOrder: e.target.value })}
          required
        />
      </label>
      <div className="sm:col-span-3">
        <button type="submit" className="rounded bg-brand-orange px-3 py-2 text-sm text-white hover:bg-orange-500">
          Add tier
        </button>
      </div>
    </form>
  );
}

