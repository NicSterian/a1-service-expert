import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoadingIndicator } from '../../../components/LoadingIndicator';
import { apiPost } from '../../../lib/api';
import { EngineTierCode, mapEngineTierNameToCode } from '@shared/pricing';
import { useBookingWizard } from '../state';
import type { BookingDraft } from '../types';

type RecommendationInfo = {
  engineTierId?: number | null;
  engineTierName?: string | null;
  engineTierCode?: EngineTierCode | null;
  pricePence?: number | null;
};

type VehicleLookupData = {
  make?: string | null;
  model?: string | null;
  engineSizeCc?: number | null;
  recommendation?: RecommendationInfo | null;
};

type LookupResponse = {
  ok: boolean;
  allowManual: boolean;
  data?: VehicleLookupData;
};

type RecommendTierResponse = {
  engineSizeCc?: number | null;
  engineTierId?: number | null;
  engineTierCode?: EngineTierCode | null;
  engineTierName?: string | null;
  pricePence?: number | null;
};

const normalizeVrm = (value: string) => value.replace(/\s+/g, '').toUpperCase();

const engineSizeField = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
  },
  z
    .number({ invalid_type_error: 'Enter a valid engine size' })
    .int('Engine size must be a whole number')
    .min(1, 'Engine size must be at least 1 cc'),
);

// --- Schemas -------------------------------------------------

const vrmSchema = z.object({
  vrm: z
    .string()
    .min(2, 'VRM must be at least 2 characters')
    .max(10, 'VRM must be at most 10 characters')
    .transform(normalizeVrm),
});

// All fields required for manual entry
const manualSchema = z.object({
  vrm: z
    .string()
    .min(2, 'VRM must be at least 2 characters')
    .max(10, 'VRM must be at most 10 characters')
    .transform(normalizeVrm),
  make: z.string().min(2, 'Make is required').max(100, 'Make is too long'),
  model: z.string().min(1, 'Model is required').max(100, 'Model is too long'),
  engineSizeCc: engineSizeField,
});

type VrmFormValues = z.infer<typeof vrmSchema>;
type ManualFormValues = z.infer<typeof manualSchema>;

type WithTierId = { engineTierId?: number | null; engineTierName?: string | null };
type WithTierCode = { engineTierCode?: EngineTierCode | null };
type WithRecommendation = { recommendation?: RecommendationInfo | null };

function hasTierId(x: unknown): x is WithTierId {
  return typeof x === 'object' && x !== null && 'engineTierId' in x;
}
function hasTierCode(x: unknown): x is WithTierCode {
  return typeof x === 'object' && x !== null && 'engineTierCode' in x;
}
function hasRecommendation(x: unknown): x is WithRecommendation {
  return typeof x === 'object' && x !== null && 'recommendation' in x;
}

const toRecommendationInfo = (
  data?: VehicleLookupData | RecommendationInfo | RecommendTierResponse | null,
): RecommendationInfo | null => {
  if (!data) return null;

  if (hasTierId(data) && typeof data.engineTierId === 'number') {
    const explicitCode = hasTierCode(data) ? data.engineTierCode ?? null : null;
    return {
      engineTierId: data.engineTierId,
      engineTierName: data.engineTierName ?? null,
      engineTierCode:
        explicitCode ?? mapEngineTierNameToCode(data.engineTierName ?? undefined) ?? null,
      pricePence:
        'pricePence' in data && typeof (data as { pricePence?: number }).pricePence === 'number'
          ? (data as { pricePence?: number }).pricePence!
          : null,
    };
  }

  if (hasRecommendation(data)) {
    return toRecommendationInfo(data.recommendation ?? null);
  }

  return null;
};

// ----------------------------------------------------------------

export function VehicleStep() {
  const navigate = useNavigate();
  const { draft, updateDraft, markStepComplete } = useBookingWizard();

  const initialLookupResult = useMemo<VehicleLookupData | null>(() => {
    if (!draft.vehicle) return null;
    return {
      make: draft.vehicle.make ?? null,
      model: draft.vehicle.model ?? null,
      engineSizeCc: draft.vehicle.engineSizeCc ?? null,
      recommendation:
        typeof draft.engineTierId === 'number'
          ? {
              engineTierId: draft.engineTierId,
              engineTierName: draft.engineTierName ?? null,
              engineTierCode: draft.engineTierCode ?? null,
              pricePence: typeof draft.pricePence === 'number' ? draft.pricePence : null,
            }
          : null,
    };
  }, [draft.engineTierCode, draft.engineTierId, draft.engineTierName, draft.pricePence, draft.vehicle]);

  const [activeTab, setActiveTab] = useState<'vrm' | 'manual'>(draft.vehicle?.manualEntry ? 'manual' : 'vrm');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<VehicleLookupData | null>(initialLookupResult);
  const [lookupSuccess, setLookupSuccess] = useState<boolean>(() => {
    if (!draft.vehicle) return false;
    if (draft.vehicle.manualEntry) {
      return Boolean(draft.vehicle.vrm && draft.vehicle.make && draft.vehicle.model && draft.vehicle.engineSizeCc);
    }
    return Boolean(draft.vehicle.vrm);
  });
  const [isLookingUp, setIsLookingUp] = useState(false);

  const vrmForm = useForm<VrmFormValues>({
    resolver: zodResolver(vrmSchema),
    defaultValues: { vrm: draft.vehicle?.manualEntry ? '' : draft.vehicle?.vrm ?? '' },
  });

  const manualForm = useForm<ManualFormValues>({
    resolver: zodResolver(manualSchema),
    mode: 'onChange', // <— so isValid updates live
    defaultValues: {
      vrm: draft.vehicle?.manualEntry ? draft.vehicle.vrm ?? '' : '',
      make: draft.vehicle?.manualEntry ? draft.vehicle.make ?? '' : '',
      model: draft.vehicle?.manualEntry ? draft.vehicle.model ?? '' : '',
      engineSizeCc: draft.vehicle?.manualEntry ? draft.vehicle.engineSizeCc ?? undefined : undefined,
    },
  });

  // persist into draft
  const applyVehicleData = useCallback(
    (payload: {
      manualEntry: boolean;
      vrm?: string;
      make?: string | null;
      model?: string | null;
      engineSizeCc?: number | null;
      recommendation?: RecommendationInfo | null;
    }) => {
      const vehicle: NonNullable<BookingDraft['vehicle']> = {
        manualEntry: payload.manualEntry,
        vrm: payload.vrm ?? undefined,
        make: payload.make ?? undefined,
        model: payload.model ?? undefined,
      };
      if (typeof payload.engineSizeCc === 'number' && payload.engineSizeCc > 0) {
        vehicle.engineSizeCc = payload.engineSizeCc;
      }

      const updates: Partial<BookingDraft> = { vehicle };

      if (payload.recommendation) {
        updates.engineTierId = payload.recommendation.engineTierId ?? undefined;
        updates.engineTierName = payload.recommendation.engineTierName ?? undefined;
        updates.engineTierCode =
          payload.recommendation.engineTierCode ??
          mapEngineTierNameToCode(payload.recommendation.engineTierName ?? undefined) ??
          undefined;

        if (typeof payload.recommendation.pricePence === 'number') {
          updates.pricePence = payload.recommendation.pricePence;
        } else {
          updates.pricePence = undefined;
        }
      } else {
        updates.pricePence = undefined;
      }

      updateDraft(updates);
    },
    [updateDraft],
  );

  const goNextAfterUpdate = (rec: RecommendationInfo | null | undefined) => {
    markStepComplete('vehicle');
    if (rec?.engineTierId && typeof rec.pricePence === 'number') {
      markStepComplete('pricing');
      navigate('../date-time');
    } else {
      navigate('../pricing');
    }
  };

  // VRM LOOKUP
  const handleLookup = vrmForm.handleSubmit(async (values) => {
    if (!draft.serviceId) {
      toast.error('Select a service before looking up a vehicle.');
      return;
    }

    try {
      setLookupError(null);
      setLookupMessage('Looking up vehicle…');
      setIsLookingUp(true);

      const vrm = values.vrm;
      vrmForm.setValue('vrm', vrm);

      const response = await apiPost<LookupResponse>('/vehicles/vrm', {
        vrm,
        serviceId: draft.serviceId,
      });

      if (!response.ok || !response.data) {
        setLookupResult(null);
        setLookupSuccess(false);
        setLookupMessage(null);
        setLookupError('Vehicle not found. Please enter the details manually.');
        return;
      }

      const resultData = response.data;

      let recommendation = toRecommendationInfo(resultData);
      if (!recommendation && resultData.engineSizeCc && draft.serviceId) {
        try {
          const recResp = await apiPost<RecommendTierResponse>('/vehicles/recommend-tier', {
            serviceId: draft.serviceId,
            engineSizeCc: resultData.engineSizeCc,
          });
          recommendation = toRecommendationInfo(recResp);
        } catch {
          /* ignore; user will confirm pricing next step */
        }
      }

      applyVehicleData({
        manualEntry: false,
        vrm,
        make: resultData.make ?? null,
        model: resultData.model ?? null,
        engineSizeCc: resultData.engineSizeCc ?? null,
        recommendation,
      });

      setLookupResult({
        make: resultData.make ?? null,
        model: resultData.model ?? null,
        engineSizeCc: resultData.engineSizeCc ?? null,
        recommendation,
      });
      setLookupSuccess(true);

      if (recommendation?.engineTierId && typeof recommendation.pricePence === 'number') {
        setLookupMessage('Vehicle found. Pricing confirmed from engine size.');
      } else if (resultData.engineSizeCc) {
        setLookupMessage('Vehicle found. Engine size captured.');
      } else {
        setLookupMessage('Vehicle found. Confirm details and continue.');
      }

      goNextAfterUpdate(recommendation);
    } catch (error) {
      const message = (error as Error)?.message ?? 'Unable to contact DVLA. Please try again later.';
      setLookupError(message);
      setLookupMessage(null);
      setLookupSuccess(false);
    } finally {
      setIsLookingUp(false);
    }
  });

  // MANUAL ENTRY save (used by Save button AND Continue)
  const saveManual = manualForm.handleSubmit(async (values) => {
    let recommendation: RecommendationInfo | null = null;

    if (values.engineSizeCc && draft.serviceId) {
      try {
        const recommendationResponse = await apiPost<RecommendTierResponse>('/vehicles/recommend-tier', {
          serviceId: draft.serviceId,
          engineSizeCc: values.engineSizeCc,
        });
        recommendation = toRecommendationInfo(recommendationResponse);
      } catch {
        toast.error('Could not match engine size automatically. Please verify the service tier.');
      }
    } else if (!draft.serviceId) {
      toast.error('Select a service before applying engine size.');
    }

    applyVehicleData({
      manualEntry: true,
      vrm: values.vrm,
      make: values.make,
      model: values.model,
      engineSizeCc: values.engineSizeCc,
      recommendation,
    });

    setLookupResult({
      make: values.make,
      model: values.model,
      engineSizeCc: values.engineSizeCc,
      recommendation,
    });

    setLookupSuccess(true);
    toast.success('Vehicle details saved.');

    return recommendation; // so Continue can decide where to go
  });

  // Enable Continue if:
  //  - VRM lookup succeeded, OR
  //  - Manual tab is active AND the manual form is valid right now
  const canContinue = activeTab === 'manual' ? manualForm.formState.isValid : lookupSuccess;

  const handleNext = async () => {
    if (activeTab === 'manual') {
      const rec = await saveManual(); // saves + returns recommendation
      goNextAfterUpdate(rec ?? null);
      return;
    }
    if (!lookupSuccess) {
      toast.error('Please provide vehicle details before continuing.');
      return;
    }
    markStepComplete('vehicle');
    navigate('../pricing');
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-brand-black">2. Vehicle</h2>
        <p className="text-slate-600">
          Look up your vehicle using its registration or enter the details manually. Engine size helps us price the
          correct service tier automatically.
        </p>
      </header>

      <div className="rounded border border-slate-200 bg-white shadow-sm">
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('vrm')}
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === 'vrm'
                ? 'border-b-2 border-brand-orange text-brand-orange'
                : 'text-slate-500 hover:text-brand-orange'
            }`}
          >
            VRM Lookup
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === 'manual'
                ? 'border-b-2 border-brand-orange text-brand-orange'
                : 'text-slate-500 hover:text-brand-orange'
            }`}
          >
            Manual Entry
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'vrm' ? (
            <form className="space-y-3" onSubmit={handleLookup} noValidate>
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="vrm-input">
                  Vehicle registration (VRM)
                </label>
                <input
                  id="vrm-input"
                  type="text"
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 uppercase"
                  {...vrmForm.register('vrm')}
                />
                {vrmForm.formState.errors.vrm ? (
                  <p className="text-xs text-red-600">{vrmForm.formState.errors.vrm.message}</p>
                ) : null}
              </div>

              <button
                type="submit"
                className="rounded bg-brand-orange px-4 py-2 text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isLookingUp}
              >
                {isLookingUp ? 'Looking up…' : 'Lookup'}
              </button>

              {isLookingUp ? <LoadingIndicator label="Contacting DVLA…" /> : null}
              {lookupMessage ? <p className="text-sm text-emerald-700">{lookupMessage}</p> : null}
              {lookupError ? <p className="text-sm text-red-600">{lookupError}</p> : null}
              {lookupResult ? (
                <div className="rounded border border-slate-200 bg-orange-50 p-3 text-sm text-brand-black">
                  <p>{`Make: ${lookupResult.make ?? 'Unknown'}`}</p>
                  <p>{`Model: ${lookupResult.model ?? 'Unknown'}`}</p>
                  <p>{`Engine size: ${lookupResult.engineSizeCc ? `${lookupResult.engineSizeCc} cc` : 'Unknown'}`}</p>
                  {lookupResult.recommendation ? (
                    <p>{`Engine tier: ${
                      lookupResult.recommendation.engineTierName ??
                      (typeof lookupResult.recommendation.engineTierId === 'number'
                        ? `ID ${lookupResult.recommendation.engineTierId}`
                        : 'Unknown')
                    }${
                      lookupResult.recommendation.engineTierCode
                        ? ` (${lookupResult.recommendation.engineTierCode})`
                        : ''
                    }${
                      typeof lookupResult.recommendation.pricePence === 'number'
                        ? ` — ${Intl.NumberFormat('en-GB', {
                            style: 'currency',
                            currency: 'GBP',
                          }).format(lookupResult.recommendation.pricePence / 100)}`
                        : ''
                    }`}</p>
                  ) : null}
                </div>
              ) : null}
            </form>
          ) : (
            <form className="space-y-3" onSubmit={saveManual} noValidate>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700" htmlFor="manual-vrm">
                    Vehicle registration
                  </label>
                  <input
                    id="manual-vrm"
                    type="text"
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 uppercase"
                    {...manualForm.register('vrm')}
                  />
                  {manualForm.formState.errors.vrm ? (
                    <p className="text-xs text-red-600">{manualForm.formState.errors.vrm.message}</p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700" htmlFor="manual-make">
                    Make
                  </label>
                  <input
                    id="manual-make"
                    type="text"
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    {...manualForm.register('make')}
                  />
                  {manualForm.formState.errors.make ? (
                    <p className="text-xs text-red-600">{manualForm.formState.errors.make.message}</p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700" htmlFor="manual-model">
                    Model
                  </label>
                  <input
                    id="manual-model"
                    type="text"
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    {...manualForm.register('model')}
                  />
                  {manualForm.formState.errors.model ? (
                    <p className="text-xs text-red-600">{manualForm.formState.errors.model.message}</p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700" htmlFor="manual-engine-size">
                    Engine size (cc)
                  </label>
                  <input
                    id="manual-engine-size"
                    type="number"
                    min={1}
                    step={1}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    {...manualForm.register('engineSizeCc', { valueAsNumber: true })}
                  />
                  {manualForm.formState.errors.engineSizeCc ? (
                    <p className="text-xs text-red-600">{manualForm.formState.errors.engineSizeCc.message}</p>
                  ) : (
                    <p className="text-xs text-slate-500">Required for automatic pricing.</p>
                  )}
                </div>
              </div>

              <button type="submit" className="rounded bg-brand-orange px-4 py-2 text-white hover:bg-orange-500">
                Save vehicle details
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => navigate('..')}
          className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:border-slate-400"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!canContinue}
          onClick={handleNext}
          className="rounded bg-brand-orange px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue to Pricing
        </button>
      </div>
    </div>
  );
}
