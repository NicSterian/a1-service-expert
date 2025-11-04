import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { LoadingIndicator } from '../../../components/LoadingIndicator';
import { ServiceCard } from '../../../components/ServiceCard';
import { VehicleModal } from '../../../components/VehicleModal';
import { PricingTable } from '../../../components/PricingTable';
import {
  ENGINE_TIER_CODES,
  SERVICE_CODES,
  SERVICE_DETAILS,
  type EngineTierCode,
  type ServiceCode,
} from '@a1/shared/pricing';
import { useBookingWizard } from '../state';
import type { CatalogSummary } from '../types';
import { useCatalogSummary } from '../useCatalogSummary';

const priceFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

type ServiceOption = {
  code: ServiceCode;
  summary?: CatalogSummary['services'][number];
};

type ServicePriceMap = Partial<Record<EngineTierCode, number>>;

function formatPrice(pence: number | undefined) {
  if (typeof pence !== 'number' || Number.isNaN(pence)) {
    return 'Contact us';
  }
  return priceFormatter.format(pence / 100);
}

function useNewBookingUIFlag() {
  const env = ((import.meta as unknown) as { env?: Record<string, unknown> }).env ?? {};
  const raw = (env.USE_NEW_BOOKING_UI ?? env.VITE_USE_NEW_BOOKING_UI ?? 'true');
  const val = String(raw).trim().toLowerCase();
  return !(val === 'false' || val === '0' || val === '');
}

export function ServicesStep() {
  const navigate = useNavigate();
  const { draft, updateDraft, markStepComplete } = useBookingWizard();
  const { catalog, loading, error, refresh } = useCatalogSummary();
  const [message, setMessage] = useState<string | null>(null);
  const useNewUI = useNewBookingUIFlag();
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingSelectCode, setPendingSelectCode] = useState<ServiceCode | null>(null);

  const serviceOptions: ServiceOption[] = useMemo(() => {
    if (!catalog) {
      return SERVICE_CODES.map((code: ServiceCode) => ({ code }));
    }
    return SERVICE_CODES.map((code: ServiceCode) => ({
      code,
      summary: catalog.services.find((service) => service.code === code),
    }));
  }, [catalog]);

  const pricesByService = useMemo(() => {
    if (!catalog) {
      return new Map<ServiceCode, ServicePriceMap>();
    }

    const tierCodeById = new Map<number, EngineTierCode>();
    catalog.engineTiers.forEach((tier) => {
      if (tier.code) {
        tierCodeById.set(tier.id, tier.code);
      }
    });

    const serviceCodeById = new Map<number, ServiceCode>();
    catalog.services.forEach((service) => {
      if (service.code) {
        serviceCodeById.set(service.id, service.code);
      }
    });

    const result = new Map<ServiceCode, ServicePriceMap>();
    catalog.prices.forEach((price) => {
      const serviceCode = serviceCodeById.get(price.serviceId);
      const tierCode = tierCodeById.get(price.engineTierId);
      if (!serviceCode || !tierCode) {
        return;
      }
      const tierMap = result.get(serviceCode) ?? {};
      tierMap[tierCode] = price.amountPence;
      result.set(serviceCode, tierMap);
    });

    return result;
  }, [catalog]);

  const selectedServiceCode = draft.serviceCode ?? null;

  const handleSelect = (code: ServiceCode) => {
    const summary = catalog?.services.find((service) => service.code === code);
    if (!summary) {
      toast.error('This service is not currently available.');
      return;
    }

    const details = SERVICE_DETAILS[code];
    updateDraft({
      serviceId: summary.id,
      serviceCode: code,
      serviceName: summary.name ?? details.name,
      serviceDescription: summary?.description ?? details.description,
      engineTierId: undefined,
      engineTierCode: undefined,
      engineTierName: undefined,
      pricePence: undefined,
      holdId: undefined,
    });
    setMessage(null);
    if (useNewUI) { setPendingSelectCode(code); setModalOpen(true); }
  };

  const handleDeselect = () => {
    updateDraft({
      serviceId: undefined,
      serviceCode: undefined,
      serviceName: undefined,
      serviceDescription: undefined,
      engineTierId: undefined,
      engineTierCode: undefined,
      engineTierName: undefined,
      pricePence: undefined,
      holdId: undefined,
    });
    setPendingSelectCode(null);
  };

  const handleNext = () => {
    if (!selectedServiceCode) {
      setMessage('Select a service to continue.');
      toast.error('Please select a service before continuing.');
      return;
    }

    markStepComplete('services');
    navigate('pricing');
  };

  if (loading && !catalog) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-brand-black">Service Catalogue</h2>
        <LoadingIndicator label="Loading service catalogue." />
      </section>
    );
  }

  if (error && !catalog) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-brand-black">Service Catalogue</h2>
        <div className="space-y-3 text-sm">
          <p className="text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => refresh().catch(() => undefined)}
            className="rounded bg-brand-orange px-3 py-2 text-white hover:bg-orange-500"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  // New UI: black service cards with "Price from Â£X" and Vehicle modal
  if (useNewUI) {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-brand-black">1. Choose a service package</h2>
          <p className="text-slate-600">
            Each package is priced with VAT included. Engine size determines the final tier in the next step.
          </p>
          {message ? <p className="text-sm text-red-600">{message}</p> : null}
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {serviceOptions.map(({ code, summary }) => {
            const details = SERVICE_DETAILS[code];
            const lowest = summary?.lowestTierPricePence ?? null;
            const isAvailable = Boolean(summary);
            return (
              <ServiceCard
                key={code}
                title={summary?.name ?? details.name}
                description={summary?.description ?? details.description}
                priceFromPence={lowest}
                disabled={!isAvailable}
                selected={Boolean(draft.serviceCode === code && draft.vehicle?.vrm && !pendingSelectCode)}
                onSelect={() => handleSelect(code)}
                onToggleSelected={handleDeselect}
              />
            );
          })}
        </div>

        {/* Pricing table below cards */}
        <PricingTable catalog={catalog} variant="dark" />

        <VehicleModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setPendingSelectCode(null); }}
          onAdded={() => { setModalOpen(false); setPendingSelectCode(null); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-brand-black">1. Choose a service package</h2>
        <p className="text-slate-600">
          Each package is priced with VAT included. Engine size determines the final tier in the next step.
        </p>
        {message ? <p className="text-sm text-red-600">{message}</p> : null}
      </header>

      <div className="grid gap-4">
        {serviceOptions.map(({ code, summary }) => {
          const details = SERVICE_DETAILS[code];
          const priceMap = pricesByService.get(code);
          const isSelected = selectedServiceCode === code;
          const isAvailable = Boolean(summary);

          return (
            <button
              key={code}
              type="button"
              onClick={() => handleSelect(code)}
              disabled={!isAvailable}
              className={`space-y-3 rounded border px-4 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-brand-orange ${isSelected ? 'border-brand-orange bg-orange-50 text-brand-orange' : 'border-slate-200 bg-white text-slate-700'} ${!isAvailable ? 'cursor-not-allowed opacity-60' : 'hover:border-brand-orange hover:text-brand-orange'}`}
            >
              <div>
                <h3 className="text-lg font-semibold">{summary?.name ?? details.name}</h3>
                <p className="text-sm text-slate-600">{summary?.description ?? details.description}</p>
              </div>

              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
                {details.disclaimers.map((disclaimer: string) => (
                  <li key={disclaimer}>{disclaimer}</li>
                ))}
              </ul>

              <div className="grid gap-2 text-xs sm:grid-cols-4">
                {ENGINE_TIER_CODES.map((tier: EngineTierCode) => (
                  <div key={tier} className="rounded border border-slate-200 bg-slate-50 p-2 text-center">
                    <p className="font-semibold text-slate-700">{tier}</p>
                    <p className="text-slate-600">{formatPrice(priceMap?.[tier])}</p>
                  </div>
                ))}
              </div>

              {!isAvailable ? (
                <p className="text-xs text-red-600">This service is not currently available.</p>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <span className="text-xs text-slate-500">You can adjust details later in the flow.</span>
        <button
          type="button"
          disabled={!selectedServiceCode}
          onClick={handleNext}
          className="rounded bg-brand-orange px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue to summary
        </button>
      </div>
    </div>
  );
}















