import type { AdminBookingResponse } from './AdminBookingDetailPage';

export type VehicleDraft = {
  registration: string;
  make: string;
  model: string;
  engineSizeCc: string | number;
};

export function VehiclePanel(props: {
  booking: AdminBookingResponse;
  editing: boolean;
  draft: VehicleDraft;
  setDraft: (next: VehicleDraft) => void;
  onToggleEdit: () => void;
  onSave: () => void;
}) {
  const { booking, editing, draft, setDraft, onToggleEdit, onSave } = props;
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Vehicle</h3>
        <button
          onClick={onToggleEdit}
          className="rounded-full border border-slate-600 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:border-orange-500 hover:text-orange-300"
          type="button"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>
      {editing ? (
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Registration" value={draft.registration} onChange={(e) => setDraft({ ...draft, registration: e.target.value })} />
          <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Make" value={draft.make} onChange={(e) => setDraft({ ...draft, make: e.target.value })} />
          <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Model" value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} />
          <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Engine size (cc)" value={draft.engineSizeCc} onChange={(e) => setDraft({ ...draft, engineSizeCc: e.target.value })} />
          <div className="sm:col-span-2">
            <button onClick={onSave} className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black hover:bg-orange-400">Save</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2 text-sm text-slate-200">
          <div className="text-lg font-semibold text-white">{booking.vehicle.registration}</div>
          <div className="text-slate-400">
            {[booking.vehicle.make, booking.vehicle.model].filter(Boolean).join(' · ') || 'No vehicle details'}
          </div>
          {typeof booking.vehicle.engineSizeCc === 'number' && (
            <div className="text-xs text-slate-400">Engine size: {booking.vehicle.engineSizeCc}cc</div>
          )}
        </div>
      )}
    </div>
  );
}

