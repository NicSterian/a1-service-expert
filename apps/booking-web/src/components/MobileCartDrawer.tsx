import React, { useState } from 'react';
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

  const canContinue =
    Boolean(draft.serviceId) &&
    Boolean(draft.vehicle?.vrm) &&
    typeof draft.pricePence === 'number' &&
    // On date-time step, also require date and time to be selected
    (!isOnDateTimeStep || (Boolean(draft.date) && Boolean(draft.time)));

  const handleContinue = () => {
    if (!canContinue) return;

    if (location.pathname.includes('/pricing')) {
      markStepComplete('pricing');
      navigate('/online-booking/date-time');
      setOpen(false);
      return;
    }

    if (isOnDateTimeStep) {
      markStepComplete('date-time');
      navigate('/online-booking/details-confirm');
      setOpen(false);
      return;
    }

    markStepComplete('services');
    navigate('/online-booking/pricing');
    setOpen(false);
  };

  const handleStartAgain = () => {
    reset();
    navigate('/online-booking');
    setOpen(false);
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white p-3 shadow-md lg:hidden">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setOpen(true)} className="text-left">
            <div className="text-xs text-slate-600">Your booking</div>
            <div className="text-sm font-semibold text-slate-900">{price}</div>
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] rounded-t-2xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
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

            <div className="mt-4 grid grid-cols-2 gap-2">
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
      ) : null}
    </>
  );
}
