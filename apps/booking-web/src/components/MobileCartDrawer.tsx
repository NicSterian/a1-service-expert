import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBookingWizard } from '../features/booking/state';

const gbCurrency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export function MobileCartDrawer() {
  const { draft, reset, markStepComplete } = useBookingWizard();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const price =
    typeof draft.pricePence === 'number' ? gbCurrency.format(draft.pricePence / 100) : 'N/A';

  const isOnDateTimeStep = location.pathname.includes('/date-time');
  const isOnConfirmStep = location.pathname.includes('/details-confirm');

  // Don't show mobile drawer on confirm step (already has its own buttons)
  const showDrawer = !isOnConfirmStep && Boolean(draft.serviceId);

  const canContinue =
    Boolean(draft.serviceId) &&
    Boolean(draft.vehicle?.vrm) &&
    typeof draft.pricePence === 'number' &&
    // On date-time step, also require date and time to be selected
    (!isOnDateTimeStep || (Boolean(draft.date) && Boolean(draft.time)));

  if (!showDrawer) {
    return null;
  }

  const handleContinue = () => {
    if (!canContinue) return;

    if (location.pathname.includes('/pricing')) {
      markStepComplete('pricing');
      navigate('/online-booking/date-time');
      setOpen(false);
      // Scroll to step content after navigation
      setTimeout(() => {
        const stepContent = document.querySelector('section');
        stepContent?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return;
    }

    if (isOnDateTimeStep) {
      markStepComplete('date-time');
      navigate('/online-booking/details-confirm');
      setOpen(false);
      // Scroll to step content after navigation
      setTimeout(() => {
        const stepContent = document.querySelector('section');
        stepContent?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return;
    }

    markStepComplete('services');
    navigate('/online-booking/pricing');
    setOpen(false);
    // Scroll to step content after navigation
    setTimeout(() => {
      const stepContent = document.querySelector('section');
      stepContent?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleStartAgain = () => {
    reset();
    navigate('/online-booking');
    setOpen(false);
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white shadow-md lg:hidden">
        <div className="flex items-center justify-between gap-3 p-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-1 items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-left transition hover:bg-slate-100 active:bg-slate-200"
          >
            <div>
              <div className="text-xs font-medium text-slate-600">Your booking</div>
              <div className="text-base font-bold text-slate-900">{price}</div>
            </div>
            <svg
              className="h-5 w-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[80vh] flex-col rounded-t-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h3 className="text-base font-semibold text-slate-900">Your booking</h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                <span aria-hidden className="text-lg leading-none">X</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3 rounded-lg bg-orange-50 p-4 text-sm text-brand-black">
              <div>
                <p className="text-xs uppercase text-orange-600">Service</p>
                <p className="text-base font-semibold leading-tight">
                  {draft.serviceName ?? 'Select a service'}
                </p>
                {draft.serviceDescription ? (
                  <p className="mt-1 text-xs text-slate-700">{draft.serviceDescription}</p>
                ) : null}
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-xs uppercase text-orange-600">Vehicle</p>
                  <p className="font-medium uppercase tracking-wide">
                    {draft.vehicle?.vrm ?? 'N/A'}
                  </p>
                  <p className="text-xs text-slate-700">{draft.vehicle?.make ?? 'Not set'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase text-orange-600">Tier</p>
                  <p className="text-sm font-semibold">
                    {draft.engineTierName ?? 'To be confirmed'}
                  </p>
                </div>
              </div>
                <div className="flex items-center justify-between border-t border-orange-200 pt-3 text-base font-semibold">
                  <span>Total</span>
                  <span>{price}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 p-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleStartAgain}
                  className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:border-slate-400"
                >
                  Start again
                </button>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!canContinue}
                  className="rounded bg-orange-500 px-3 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
