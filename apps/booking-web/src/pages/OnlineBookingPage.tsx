import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api';

interface CatalogSummaryResponse {
  services: Array<{
    id: number;
    code: string | null;
    name: string;
    description: string | null;
  }>;
  engineTiers: Array<{
    id: number;
    code: string | null;
    name: string;
    sortOrder: number;
    maxCc: number | null;
  }>;
  prices: Array<{
    serviceId: number;
    engineTierId: number;
    amountPence: number;
  }>;
}

type StepId = 'service' | 'vehicle' | 'slot' | 'confirm';

const steps: Array<{ id: StepId; label: string }> = [
  { id: 'service', label: 'Choose service' },
  { id: 'vehicle', label: 'Vehicle details' },
  { id: 'slot', label: 'Date & time' },
  { id: 'confirm', label: 'Confirm & book' },
];

interface ServiceOption {
  id: number;
  name: string;
  description: string | null;
  priceFromPence: number | null;
}

interface BookingSelection {
  serviceId: number | null;
}

const inspirationCards = [
  {
    name: 'SERVICE 1',
    details:
      'Oil & filter change, fluid top ups, complimentary health check, and digital service light reset.',
    priceText: 'Prices from £79.95',
  },
  {
    name: 'SERVICE 2',
    details: 'SERVICE 1 inclusions plus air filter change, battery condition report, and brake inspection.',
    priceText: 'Prices from £119.95',
  },
  {
    name: 'SERVICE 3',
    details: 'Complete menu service with spark plugs, cabin filter, full brake inspection, and fluid exchanges.',
    priceText: 'Prices from £169.95',
  },
];

export function OnlineBookingPage() {
  const [catalogStatus, setCatalogStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [selection, setSelection] = useState<BookingSelection>({ serviceId: null });
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        maximumFractionDigits: 2,
      }),
    [],
  );

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setCatalogStatus('loading');
        setCatalogError(null);
        const response = await apiGet<CatalogSummaryResponse>('/catalog');

        const grouped: Record<number, ServiceOption> = {};
        response.services.forEach((service) => {
          grouped[service.id] = {
            id: service.id,
            name: service.name,
            description: service.description,
            priceFromPence: null,
          };
        });

        response.prices.forEach((price) => {
          const target = grouped[price.serviceId];
          if (!target) {
            return;
          }
          if (target.priceFromPence === null || price.amountPence < target.priceFromPence) {
            target.priceFromPence = price.amountPence;
          }
        });

        const options = Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
        setServiceOptions(options);
        setCatalogStatus('ready');
      } catch (error) {
        setCatalogStatus('error');
        setCatalogError((error as Error).message ?? 'Unable to load services right now.');
      }
    };

    loadCatalog();
  }, []);

  const currentStep = steps[currentStepIndex];
  const canContinue = currentStep.id !== 'service' || selection.serviceId !== null;

  const goToNext = () => {
    if (!canContinue) {
      return;
    }
    setCurrentStepIndex((index) => Math.min(index + 1, steps.length - 1));
  };

  const goToPrevious = () => setCurrentStepIndex((index) => Math.max(index - 1, 0));

  const renderStepContent = () => {
    switch (currentStep.id) {
      case 'service':
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Choose the service level that fits your vehicle. Prices shown are for the smallest engine tier. You can
              adjust the engine size further along the journey.
            </p>
            {catalogStatus === 'loading' ? (
              <p className="text-sm text-slate-500">Loading services…</p>
            ) : catalogStatus === 'error' ? (
              <p className="text-sm text-red-600">{catalogError}</p>
            ) : serviceOptions.length === 0 ? (
              <p className="text-sm text-slate-500">No services are available for online booking yet.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {serviceOptions.map((option) => {
                  const isSelected = option.id === selection.serviceId;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelection((prev) => ({ ...prev, serviceId: option.id }))}
                      className={`flex h-full flex-col rounded-2xl border px-4 py-5 text-left transition hover:-translate-y-1 hover:border-brand-orange hover:shadow-lg ${isSelected ? 'border-brand-orange bg-orange-50 text-brand-black' : 'border-slate-200 bg-white text-slate-600'}``
                    >
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-orange">Service</span>
                      <span className="mt-3 text-lg font-semibold text-brand-black">{option.name}</span>
                      {option.priceFromPence !== null ? (
                        <span className="mt-2 text-sm font-semibold text-brand-black">
                          From {currencyFormatter.format(option.priceFromPence / 100)}
                        </span>
                      ) : (
                        <span className="mt-2 text-sm text-slate-500">Contact us for pricing</span>
                      )}
                      {option.description ? (
                        <span className="mt-3 text-xs text-slate-600">{option.description}</span>
                      ) : null}
                      <span
                        className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${isSelected ? 'border-brand-orange bg-brand-orange text-white' : 'border-slate-300 bg-white text-brand-black'}`
                      >
                        className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${isSelected ? 'border-brand-orange bg-brand-orange text-white' : 'border-slate-300 bg-white text-brand-black'}``
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      case 'vehicle':
        return (
          <div className="space-y-4 text-sm text-slate-600">
            <p className="font-semibold text-brand-black">Vehicle details</p>
            <p>
              We will add the vehicle lookup and manual entry form in this step. Confirm your VRM and engine size so we
              can recommend the right tier.
            </p>
          </div>
        );
      case 'slot':
        return (
          <div className="space-y-4 text-sm text-slate-600">
            <p className="font-semibold text-brand-black">Date & time selection</p>
            <p>
              This step will show available slots, including default 09:00–11:00 and any extra slots you add via the
              admin portal. Selecting a slot will place a 10 minute hold.
            </p>
          </div>
        );
      case 'confirm':
        return (
          <div className="space-y-4 text-sm text-slate-600">
            <p className="font-semibold text-brand-black">Review and confirm</p>
            <p>
              Customer details, reCAPTCHA verification, and the booking confirmation call-to-action will appear here.
              Once confirmed we will send customer and admin emails and issue quote/invoice PDFs.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-12">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
        <div className="relative grid gap-10 p-8 sm:grid-cols-[1.2fr_0.8fr] sm:p-12">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-orange">Online Booking</p>
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Four quick steps to get your vehicle serviced with the A1 team.
            </h1>
            <p className="max-w-xl text-sm text-slate-200">
              Pick your service, confirm vehicle details, reserve a slot, and lock in your booking. No hidden fees, no
              payment required upfront.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-200">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-semibold">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> Email reminders included
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-semibold">
                <span className="inline-block h-2 w-2 rounded-full bg-brand-orange" /> Holds last 10 minutes
              </span>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Fixed price menu</h2>
            <p className="mt-3 text-sm text-slate-200">From £79.95 with VAT included.</p>
            <div className="mt-4 space-y-3">
              {inspirationCards.map((card) => (
                <div key={card.name} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-sm font-semibold text-white">{card.name}</p>
                  <p className="mt-1 text-xs text-slate-200">{card.details}</p>
                  <p className="mt-3 text-xs font-semibold text-brand-orange">{card.priceText}</p>
                </div>
              ))}
            </div>
            <Link
              to="/services"
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-brand-orange transition hover:-translate-y-0.5 hover:underline"
            >
              View full service menu
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-6 rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-brand-black">Booking journey</h2>
            <p className="text-sm text-slate-600">Work through each step below. Your progress will be saved locally.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {steps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStepIndex(index)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 transition ${selection.serviceId && selection.date && selection.time ? 'bg-brand-orange text-white border-brand-orange' : 'border-slate-300 text-slate-500'}`
                >
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 transition ${selection.serviceId && selection.date && selection.time ? 'bg-brand-orange text-white border-brand-orange' : 'border-slate-300 text-slate-500'}``
                    {index + 1}
                  </span>
                  {step.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          {renderStepContent()}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={goToPrevious}
            disabled={currentStepIndex === 0}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7" />
            </svg>
            Back
          </button>
          <button
            type="button"
            onClick={goToNext}
            disabled={!canContinue || currentStepIndex === steps.length - 1}
            className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-4 py-2 text-xs font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
            </svg>
          </button>
        </div>
      </section>
    </div>
  );
}

