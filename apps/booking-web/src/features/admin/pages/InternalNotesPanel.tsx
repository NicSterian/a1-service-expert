export function InternalNotesPanel(props: {
  draft: string;
  setDraft: (next: string) => void;
  saving: boolean;
  onSave: () => void;
  original: string | null;
}) {
  const { draft, setDraft, saving, onSave, original } = props;
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Internal Notes</h3>
      <div className="mt-4 space-y-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={6}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          placeholder="Add notes for staff..."
        />
        <div className="flex gap-2">
          <button
            onClick={onSave}
            className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-700/40"
            type="button"
            disabled={saving}
          >
            Save Notes
          </button>
          <button
            onClick={() => setDraft(original ?? '')}
            className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-orange-500 hover:text-orange-300"
            type="button"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

