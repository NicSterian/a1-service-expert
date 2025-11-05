import type { BookingDraft } from '../../../types';
import { formatHoldCountdown, formatCurrency } from '../details-confirm.utils';

/** Renders the summary cards and hold banner. Pure presentational. */
export function SummarySection({ draft, appointment, holdActive, holdRemainingMs, onStartAgain }: {
  draft: BookingDraft;
  appointment: { dateLabel: string; timeLabel: string } | null;
  holdActive: boolean;
  holdRemainingMs: number;
  onStartAgain: () => void;
}) {
  return (
    <section className="rounded-3xl bg-slate-900 p-6 text-slate-100 shadow-inner">
      <header className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Confirm your booking</h1>
          <p className="text-sm text-slate-300">Review the summary below, make sure your details are correct, then complete the security check to finalise.</p>
        </div>
        <div className="rounded-full bg-slate-800 px-4 py-2 text-xs uppercase tracking-wide text-slate-200">Step 4 of 4</div>
      </header>
      <div className="grid gap-4 text-sm md:grid-cols-2">
        <div className="rounded-2xl bg-slate-800/60 p-4">
          <p className="text-xs uppercase text-slate-400">Service</p>
          <p className="text-lg font-semibold text-white">{draft.serviceName ?? 'Service not selected'}</p>
          <p className="mt-1 text-slate-300">{draft.serviceDescription ?? 'Select a service to see the summary here.'}</p>
        </div>
        <div className="rounded-2xl bg-slate-800/60 p-4">
          <p className="text-xs uppercase text-slate-400">Vehicle</p>
          <p className="text-lg font-semibold text-white">{draft.vehicle?.make || draft.vehicle?.model ? `${draft.vehicle.make ?? ''} ${draft.vehicle.model ?? ''}`.trim() : 'Vehicle not captured'}</p>
          <p className="mt-1 text-slate-300">{draft.vehicle?.vrm ? `VRM: ${draft.vehicle.vrm}` : 'VRM will appear once entered.'}</p>
        </div>
        <div className="rounded-2xl bg-slate-800/60 p-4">
          <p className="text-xs uppercase text-slate-400">Appointment</p>
          {appointment ? (
            <>
              <p className="text-lg font-semibold text-white">{appointment.dateLabel}</p>
              <p className="mt-1 text-slate-300">{appointment.timeLabel}</p>
            </>
          ) : (
            <p className="text-slate-300">Choose a date and time to secure a slot.</p>
          )}
        </div>
        <div className="rounded-2xl bg-slate-800/60 p-4">
          <p className="text-xs uppercase text-slate-400">Total</p>
          <p className="text-lg font-semibold text-white">{formatCurrency(draft.pricePence)}</p>
          <p className="mt-1 text-slate-300">Engine tier: {draft.engineTierName ?? 'Not selected'}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-slate-300">
          {holdActive ? (
            <span>
              Your slot is reserved for the next <span className="font-semibold text-white">{formatHoldCountdown(holdRemainingMs)}</span>. Confirm before it expires.
            </span>
          ) : (
            <span className="font-semibold text-amber-200">This hold has expired. Pick a new date and time to continue.</span>
          )}
        </div>
        <button type="button" onClick={onStartAgain} className="self-start rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-slate-800">Start over</button>
      </div>
    </section>
  );
}

export default SummarySection;
