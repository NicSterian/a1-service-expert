import React, { useEffect, useRef, useState } from 'react';
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
  const price = typeof draft.pricePence === 'number' ? gbCurrency.format(draft.pricePence / 100) : null;

  const prevPriceRef = useRef<number | null>(null);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (typeof draft.pricePence === 'number') {
      if (prevPriceRef.current !== null && prevPriceRef.current !== draft.pricePence) {
        setPulse(true);
        const t = setTimeout(() => setPulse(false), 600);
        return () => clearTimeout(t);
      }
      prevPriceRef.current = draft.pricePence;
    }
  }, [draft.pricePence]);

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
      return;
    }

    if (isOnDateTimeStep) {
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
    <aside className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-inner">
      <h3 className="mb-5 text-lg font-semibold text-white">Your booking</h3>

      <div className={`space-y-4 rounded-2xl border border-slate-700 bg-slate-800 p-5 text-sm shadow-lg ${pulse ? 'animate-pulse' : ''}`}>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-orange-400">Service</p>
          <p className="mt-1.5 text-base font-semibold leading-tight text-white">{serviceName}</p>
          {serviceDescription ? (
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{serviceDescription}</p>
          ) : null}
        </div>

        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-orange-400">Vehicle</p>
            <p className="mt-1.5 font-semibold uppercase tracking-wide text-white">{vrm || 'N/A'}</p>
            <p className="mt-1 text-xs text-slate-400">{make}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-orange-400">Tier</p>
            <p className="mt-1.5 text-sm font-semibold text-white">{tierName ?? 'To be confirmed'}</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-600 pt-4 text-lg font-bold">
          <span className="text-slate-300">Total</span>
          <span className="text-orange-400">{price ?? 'N/A'}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
        <button
          type="button"
          onClick={handleStartAgain}
          className="w-full rounded-full border border-slate-600 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-orange-500 hover:bg-slate-700 hover:text-orange-400"
        >
          Start again
        </button>
      </div>
    </aside>
  );
}
