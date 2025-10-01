import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  ENGINE_TIER_CODES,
  SERVICE_DETAILS,
  engineTierFromCc,
  type EngineTierCode,
  type ServiceCode,
} from '@shared/pricing';
import { LoadingIndicator } from '../../../components/LoadingIndicator';
import { useBookingWizard } from '../state';
import { useCatalogSummary } from '../useCatalogSummary';

const priceFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

type TierOption = {
  id: number;
  code: EngineTierCode;
  name: string;
  pricePence: number | null;
};

function formatPrice(pence: number | null | undefined) {
  if (typeof pence !== 'number' || Number.isNaN(pence)) {
    return 'Contact us';
  }
  return priceFormatter.format(pence / 100);
}

export function PriceStep() {
  const navigate = useNavigate();
  const { draft, updateDraft, markStepComplete } = useBookingWizard();
  const { catalog, loading, error, refresh } = useCatalogSummary();
  const [message, setMessage] = useState<string | null>(null);

  const hasServiceSelection = Boolean(draft.serviceId && draft.serviceCode);

  useEffect(() => {
    if (!hasServiceSelection) {
      setMessage('Select a service before confirming pricing.');
    } else {
      setMessage(null);
    }
  }, [hasServiceSelection]);

  const serviceSummary = useMemo(() => {
    if (!catalog || !hasServiceSelection || !draft.serviceId) {
      return undefined;
    }

    return catalog.services.find((service) => service.id === draft.serviceId);
  }, [catalog, draft.serviceId, hasServiceSelection]);

  const serviceCode = useMemo<ServiceCode | undefined>(() => {
    if (!hasServiceSelection) {
      return undefined;
    }

    return (serviceSummary?.code ?? draft.serviceCode) ?? undefined;
  }, [draft.serviceCode, hasServiceSelection, serviceSummary]);

  const serviceDetails = serviceCode ? SERVICE_DETAILS[serviceCode] : null;

  const priceLookup = useMemo(() => {
    const map = new Map<string, number>();
    if (!catalog) {
      return map;
    }
    catalog.prices.forEach((price) => {
      map.set(`${price.serviceId}:${price.engineTierId}`, price.amountPence);
    });
    return map;
  }, [catalog]);

  const tierOptions: TierOption[] = useMemo(() => {
    if (!catalog || !serviceSummary) {
      return [];
    }

    return catalog.engineTiers
      .filter((tier) => tier.code && ENGINE_TIER_CODES.includes(tier.code as EngineTierCode))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((tier) => ({
        id: tier.id,
        code: tier.code as EngineTierCode,
        name: tier.name,
        pricePence: priceLookup.get(`${serviceSummary.id}:${tier.id}`) ?? null,
      }));
  }, [catalog, priceLookup, serviceSummary]);

  const tierById = useMemo(() => {
    const map = new Map<number, TierOption>();
    tierOptions.forEach((tier) => map.set(tier.id, tier));
    return map;
  }, [tierOptions]);

  const tierByCode = useMemo(() => {
    const map = new Map<EngineTierCode, TierOption>();
    tierOptions.forEach((tier) => map.set(tier.code, tier));
    return map;
  }, [tierOptions]);

  const recommendedFromDraftById = draft.engineTierId ? tierById.get(draft.engineTierId) : undefined;
  const recommendedFromDraftByCode =
    !recommendedFromDraftById && draft.engineTierCode ? tierByCode.get(draft.engineTierCode as EngineTierCode) : undefined;

  const vehicleRecommendation = draft.vehicle?.recommendation;
  const recommendedFromVehicleById = vehicleRecommendation?.engineTierId
    ? tierById.get(vehicleRecommendation.engineTierId)
    : undefined;
  const recommendedFromVehicleByCode =
    !recommendedFromVehicleById && vehicleRecommendation?.engineTierCode
      ? tierByCode.get(vehicleRecommendation.engineTierCode as EngineTierCode)
      : undefined;

  const derivedFromEngineSize = useMemo(() => {
    if (typeof draft.vehicle?.engineSizeCc !== 'number') {
      return undefined;
    }

    const code = engineTierFromCc(draft.vehicle.engineSizeCc);
    return code ? tierByCode.get(code) : undefined;
  }, [draft.vehicle?.engineSizeCc, tierByCode]);

  const recommendedTier = useMemo(() => {
    const candidates = [
      recommendedFromDraftById,
      recommendedFromDraftByCode,
      recommendedFromVehicleById,
      recommendedFromVehicleByCode,
      derivedFromEngineSize,
    ];
    return candidates.find((candidate) => candidate && typeof candidate.pricePence === 'number');
  }, [
    derivedFromEngineSize,
    recommendedFromDraftByCode,
    recommendedFromDraftById,
    recommendedFromVehicleByCode,
    recommendedFromVehicleById,
  ]);

  const firstPricedTier = useMemo(
    () => tierOptions.find((tier) => typeof tier.pricePence === 'number'),
    [tierOptions],
  );

  const [selectedTier, setSelectedTier] = useState<TierOption | undefined>(() => recommendedTier ?? firstPricedTier);

  useEffect(() => {
    if (!tierOptions.length) {
      if (selectedTier !== undefined) {
        setSelectedTier(undefined);
      }
      return;
    }

    const selectedIsValid = selectedTier ? tierOptions.some((tier) => tier.id === selectedTier.id) : false;
    const desiredTier = recommendedTier ?? (selectedIsValid ? selectedTier : firstPricedTier);

    if (!desiredTier || typeof desiredTier.pricePence !== 'number') {
      if (selectedTier !== undefined) {
        setSelectedTier(undefined);
      }
      return;
    }

    if (!selectedIsValid || desiredTier.id !== selectedTier?.id) {
      setSelectedTier(desiredTier);
    }
  }, [firstPricedTier, recommendedTier, selectedTier, tierOptions]);

  const recommendedTierId = recommendedTier?.id;
  const recommendedReason = recommendedTierId
    ? recommendedTierId === recommendedFromDraftById?.id || recommendedTierId === recommendedFromDraftByCode?.id
      ? 'Current selection'
      : recommendedTierId === recommendedFromVehicleById?.id || recommendedTierId === recommendedFromVehicleByCode?.id
        ? 'Suggested from vehicle lookup'
        : recommendedTierId === derivedFromEngineSize?.id
          ? 'Based on engine size'
          : null
    : null;

  const engineSizeCc = draft.vehicle?.engineSizeCc;

  const handleSelectTier = (tier: TierOption) => {
    if (typeof tier.pricePence !== 'number') {
      toast.error('Pricing is not configured for this tier. Please choose another option.');
      return;
    }
    setSelectedTier(tier);
    setMessage(null);
  };

  const handleContinue = () => {
    if (!selectedTier || typeof selectedTier.pricePence !== 'number') {
      setMessage('Select a pricing tier with a configured amount to continue.');
      toast.error('Please select a pricing tier with valid pricing.');
      return;
    }

    updateDraft({
      engineTierId: selectedTier.id,
      engineTierCode: selectedTier.code,
      engineTierName: selectedTier.name,
      pricePence: selectedTier.pricePence,
      ...(draft.vehicle
        ? {
            vehicle: {
              ...draft.vehicle,
              recommendation: {
                engineTierId: selectedTier.id,
                engineTierCode: selectedTier.code,
                engineTierName: selectedTier.name,
                pricePence: selectedTier.pricePence,
              },
            },
          }
        : {}),
    });

    setMessage(null);
    markStepComplete('pricing');
    navigate('../date-time');
  };

  const handleBack = () => {
    navigate('../vehicle');
  };

  if (!hasServiceSelection) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-brand-black">Pricing</h2>
        <p className="text-sm text-red-600">Please choose a service package first.</p>
        <button
          type="button"
          onClick={() => navigate('..')}
          className="rounded bg-brand-orange px-4 py-2 text-white hover:bg-orange-500"
        >
          Go to services
        </button>
      </div>
    );
  }

  if (loading && !catalog) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-brand-black">Pricing</h2>
        <LoadingIndicator label="Loading pricing information." />
      </section>
    );
  }

  if (error && !catalog) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-brand-black">Pricing</h2>
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

  if (!catalog) {
    return null;
  }

  if (!serviceCode || !serviceSummary || !serviceDetails) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-brand-black">Pricing</h2>
        <p className="text-sm text-red-600">The selected service is no longer available.</p>
        <button
          type="button"
          onClick={() => navigate('..')}
          className="rounded bg-brand-orange px-4 py-2 text-white hover:bg-orange-500"
        >
          Choose another service
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-brand-black">3. Confirm pricing</h2>
        <p className="text-slate-600">
          Engine size determines the service tier. Pricing below includes VAT.
        </p>
        {engineSizeCc ? (
          <p className="text-xs text-slate-500">Detected engine size: {engineSizeCc} cc</p>
        ) : (
          <p className="text-xs text-slate-500">Enter an engine size on the previous step for an automatic recommendation.</p>
        )}
        {recommendedTier ? (
          <p className="text-xs text-emerald-700">
            {`Recommended tier: ${recommendedTier.name} (${recommendedTier.code})${recommendedReason ? ` - ${recommendedReason}` : ''}`}
          </p>
        ) : null}
        {message ? <p className="text-sm text-red-600">{message}</p> : null}
      </header>

      <section className="space-y-3 rounded border border-slate-200 bg-white p-4">
        <div>
          <h3 className="text-lg font-semibold text-brand-black">{serviceDetails.name}</h3>
          <p className="text-sm text-slate-600">{serviceDetails.description}</p>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
          {serviceDetails.disclaimers.map((disclaimer: string) => (
            <li key={disclaimer}>{disclaimer}</li>
          ))}
        </ul>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {tierOptions.map((tier) => {
          const isSelected = selectedTier?.id === tier.id;
          const isRecommended = recommendedTierId === tier.id;
          const hasPrice = typeof tier.pricePence === 'number';
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => handleSelectTier(tier)}
              disabled={!hasPrice}
              className={`space-y-1 rounded border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-brand-orange
                ${isSelected ? 'border-brand-orange bg-orange-50 text-brand-orange' : 'border-slate-200 bg-white text-slate-700'}
                ${!hasPrice ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{tier.name}</p>
                {isRecommended ? (
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Recommended</span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500">{tier.code}</p>
              <p className="text-sm font-medium">{formatPrice(tier.pricePence)}</p>
              {!hasPrice ? (
                <p className="text-xs text-red-600">Set pricing for this tier in the admin panel.</p>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:border-slate-400"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!selectedTier || typeof selectedTier.pricePence !== 'number'}
          onClick={handleContinue}
          className="rounded bg-brand-orange px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue to Date &amp; Time
        </button>
      </div>
    </div>
  );
}
