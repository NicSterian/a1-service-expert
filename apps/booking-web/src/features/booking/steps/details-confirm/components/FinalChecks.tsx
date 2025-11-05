import { TurnstileWidget } from '../../../../../components/TurnstileWidget';

/** Renders captcha and confirm actions. Pure presentational. */
export function FinalChecks({
  confirmError,
  onBack,
  onStartAgain,
  onCaptchaChange,
  disabled,
  disabledTitle,
  confirming,
}: {
  confirmError: string | null;
  onBack: () => void;
  onStartAgain: () => void;
  onCaptchaChange: (token?: string | null) => void;
  disabled: boolean;
  disabledTitle?: string;
  confirming: boolean;
}) {
  return (
    <section className="rounded-3xl bg-slate-900 p-6 text-slate-100 shadow-inner">
      <h2 className="text-xl font-semibold text-white">3. Final checks</h2>
      <div className="mt-4 space-y-3 rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
        <TurnstileWidget className="flex justify-center" onChange={onCaptchaChange} fallbackLabel="I confirm I am not a robot." />
        <p className="text-xs text-slate-300">Complete the security check, then confirm. We&apos;ll email your confirmation and documents instantly.</p>
        {confirmError ? <p className="text-sm text-red-300">{confirmError}</p> : null}
      </div>
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <button type="button" onClick={onBack} className="rounded-full bg-slate-800 px-6 py-2 text-sm font-semibold text-slate-100 transition hover:bg-orange-500 hover:text-black"> Back</button>
          <button type="button" onClick={onStartAgain} className="rounded-full border border-slate-600 bg-slate-900 px-6 py-2 text-sm font-semibold text-slate-100 transition hover:border-orange-500 hover:bg-slate-800 hover:text-orange-400">Start again</button>
        </div>
        <button type="submit" disabled={disabled} title={disabledTitle} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-6 py-2 text-sm font-semibold text-black transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70">{confirming ? 'Confirming...' : 'Confirm'}</button>
      </div>
    </section>
  );
}

export default FinalChecks;
