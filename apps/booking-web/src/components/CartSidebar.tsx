import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBookingWizard } from '../features/booking/state';

const gbCurrency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export function CartSidebar() {
  const { draft, reset, markStepComplete } = useBookingWizard();
  const navigate = useNavigate();
  const location = useLocation();

  const serviceName = draft.serviceName ?? 'Select a service';
  const serviceDescription = draft.serviceDescription ?? '';
  const tierName = draft.engineTierName ?? null;
  const vrm = draft.vehicle?.vrm ?? '';
  const make = draft.vehicle?.make ?? 'Not set';
  const price =
    typeof draft.pricePence === 'number' ? gbCurrency.format(draft.pricePence / 100) : null;

  const canContinue =
    Boolean(draft.serviceId) && Boolean(draft.vehicle?.vrm) && typeof draft.pricePence === 'number';

  const handleContinue = () => {
    if (!canContinue) return;

    if (location.pathname.includes('/pricing')) {
      markStepComplete('pricing');
      navigate('/online-booking/date-time');
      return;
    }

    if (location.pathname.includes('/date-time')) {
      markStepComplete('date-time');
      navigate('/online-booking/details-confirm');
      return;
    }

    markStepComplete('services');
    navigate('/online-booking/pricing');
  };

  const handleStartAgain = () => {
    reset();
    navigate('/online-booking');
  };

  return (
    <aside className="rounded-xl border-2 border-orange-200 bg-white p-5 shadow-md">
      <h3 className="mb-4 text-lg font-semibold text-brand-black">Your booking</h3>

      <div className="space-y-3 rounded-lg bg-orange-50 p-4 text-sm text-brand-black">
        <div>
          <p className="text-xs uppercase text-orange-600">Service</p>
          <p className="text-base font-semibold leading-tight">{serviceName}</p>
          {serviceDescription ? (
            <p className="mt-1 text-xs text-slate-700">{serviceDescription}</p>
          ) : null}
        </div>

        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-orange-600">Vehicle</p>
            <p className="font-medium uppercase tracking-wide">{vrm || 'N/A'}</p>
            <p className="text-xs text-slate-700">{make}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-orange-600">Tier</p>
            <p className="text-sm font-semibold">{tierName ?? 'To be confirmed'}</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-orange-200 pt-3 text-base font-semibold">
          <span>Total</span>
          <span>{price ?? 'N/A'}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full rounded bg-orange-500 px-3 py-2 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
        <button
          type="button"
          onClick={handleStartAgain}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:border-slate-400"
        >
          Start again
        </button>
      </div>
    </aside>
  );
}
