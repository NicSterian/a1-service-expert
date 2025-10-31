import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoadingIndicator } from './LoadingIndicator';
import { apiPost } from '../lib/api';
import { useBookingWizard } from '../features/booking/state';
import type { EngineTierCode } from '@a1/shared/pricing';
import makes from '../data/vehicle-makes.json';
import modelsMap from '../data/vehicle-models.json';

const normalizeVrm = (value: string) => value.replace(/\s+/g, '').toUpperCase();
const gbVrmStrict = new RegExp(([
  '(^[A-HJ-PR-Y]{2}[0-9]{2}\\s?[A-HJ-PR-Y]{3}$)',
  '(^[A-Z]{1,3}\\s?[0-9]{1,4}\\s?[A-Z]{1,3}$)',
  '(^Q\\s?[A-Z0-9]{3,6}$)'
]).join('|'),'i');

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
  z.number({ invalid_type_error: 'Enter a valid engine size' }).int('Engine size must be a whole number').min(1, 'Engine size must be at least 1 cc'),
);

const vrmSchema = z.object({
  vrm: z.string().min(2,'Enter a valid registration').max(10,'Enter a valid registration').refine((v)=>gbVrmStrict.test(v),'Enter a valid GB registration').transform(normalizeVrm)
});

const manualSchema = z.object({
  vrm: z.string().min(2,'Enter a valid registration').max(10,'Enter a valid registration').refine((v)=>gbVrmStrict.test(v),'Enter a valid GB registration').transform(normalizeVrm),
  make: z.string().min(2,'Make is required').max(100),
  model: z.string().max(100).optional(),
  engineSizeCc: engineSizeField,
  fuelType: z.string().min(1,'Fuel type is required'),
});

type LookupResponse = { ok: boolean; allowManual: boolean; data?: { make?: string|null; model?: string|null; engineSizeCc?: number|null; recommendation?: { engineTierId?: number|null; engineTierCode?: EngineTierCode|null; engineTierName?: string|null; pricePence?: number|null; }|null; } };

type RecommendTierResponse = { engineSizeCc?: number|null; engineTierId?: number|null; engineTierCode?: EngineTierCode|null; engineTierName?: string|null; pricePence?: number|null };

const gbCurrency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

const sanitizeModel = (value?: string | null) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  if (trimmed.toLowerCase() === 'unknown') return null;
  return trimmed;
};

export function VehicleModal(props: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const { open, onClose, onAdded } = props;
  const { draft, updateDraft } = useBookingWizard();
  const [active, setActive] = useState<'vrm'|'manual'>('vrm');

  const vrmForm = useForm<z.infer<typeof vrmSchema>>({ resolver: zodResolver(vrmSchema), defaultValues: { vrm: '' }, mode: 'onChange' });
  const manualForm = useForm<z.infer<typeof manualSchema>>({ resolver: zodResolver(manualSchema), defaultValues: { fuelType: '' }, mode: 'onChange' });

  useEffect(()=>{ if(!open){ vrmForm.reset({vrm:''}); manualForm.reset({fuelType:''}); setActive('vrm'); } },[open]);

  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [summary,setSummary]=useState<{ vrm:string; make?:string|null; model?:string|null; engineSizeCc?:number|null; engineTierName?:string|null; engineTierCode?:EngineTierCode|null; pricePence?:number|null; }|null>(null);

  const serviceId = draft.serviceId;
  const canContinue = useMemo(()=>Boolean(summary && typeof summary.pricePence==='number'),[summary]);

  const handleLookup = vrmForm.handleSubmit(async(values)=>{
    setBusy(true); setError(null); setSummary(null);
    try{
      const vrm = values.vrm;
      const payload: Record<string, unknown> = { vrm };
      if (serviceId) {
        payload.serviceId = serviceId;
      }
      const resp = await apiPost<LookupResponse>('/vehicles/vrm', payload);
      if(!resp.ok){ setError('We couldn’t find your vehicle right now. You can try again or enter the details manually.'); setActive('manual'); return; }
      const data = resp.data ?? {};
      const rec = data.recommendation ?? null;
      setSummary({ vrm, make: data.make ?? null, model: sanitizeModel(data.model), engineSizeCc: data.engineSizeCc ?? null, engineTierName: rec?.engineTierName ?? null, engineTierCode: rec?.engineTierCode ?? null, pricePence: rec?.pricePence ?? null });
    }catch{ setError('We couldn’t find your vehicle right now. You can try again or enter the details manually.'); }
    finally{ setBusy(false); }
  });

  const handleManual = manualForm.handleSubmit(async(values)=>{
    setBusy(true); setError(null); setSummary(null);
    try{
      const rec = await apiPost<RecommendTierResponse>('/vehicles/recommend-tier',{ serviceId: serviceId!, engineSizeCc: values.engineSizeCc });
      setSummary({ vrm: values.vrm, make: values.make, model: sanitizeModel(values.model), engineSizeCc: rec.engineSizeCc ?? values.engineSizeCc, engineTierName: rec.engineTierName ?? null, engineTierCode: rec.engineTierCode ?? null, pricePence: rec.pricePence ?? null });
    }catch{ setError('Unable to resolve price for the entered details. Please check and try again.'); }
    finally{ setBusy(false); }
  });

  const handleConfirm = async ()=>{
    if(!summary) return;
    const cleanedModel = sanitizeModel(summary.model);
    let price = typeof summary.pricePence === 'number' ? summary.pricePence : undefined;
    let tierCode = summary.engineTierCode ?? undefined;
    let tierName = summary.engineTierName ?? undefined;
    try {
      if (serviceId && summary.engineSizeCc) {
        const rec = await apiPost<RecommendTierResponse>('/vehicles/recommend-tier', { serviceId: serviceId, engineSizeCc: summary.engineSizeCc });
        if (typeof rec.pricePence === 'number') price = rec.pricePence;
        if (rec.engineTierCode) tierCode = rec.engineTierCode;
        if (rec.engineTierName) tierName = rec.engineTierName ?? undefined;
      }
    } catch {
      // keep existing values if recommend-tier fails
    }
    updateDraft({
      vehicle: { vrm: summary.vrm, make: summary.make ?? undefined, model: cleanedModel ?? undefined, engineSizeCc: summary.engineSizeCc ?? undefined },
      engineTierCode: tierCode,
      engineTierName: tierName,
      pricePence: price,
    });
    onAdded();
  };

  if(!open) return null;

  const modelOptions = () => {
    const mk = manualForm.getValues('make');
    const list = (modelsMap as Record<string,string[]>)?.[mk as string] ?? [];
    return list.map((m)=> (<option key={m} value={m} />));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <header className="mb-5 flex items-center justify-between border-b border-slate-700 pb-4">
          <h3 className="text-xl font-semibold text-white">Find your vehicle</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {active==='vrm' ? (
          <form className="space-y-4" onSubmit={handleLookup} noValidate>
            <label className="block text-sm font-medium text-slate-300">Vehicle registration</label>
            {!summary ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input type="text" placeholder="AB12 CDE" className="flex-1 rounded-lg border border-slate-600 bg-yellow-400 px-4 py-3 text-lg font-bold uppercase tracking-wider text-slate-900 placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500" {...vrmForm.register('vrm')} />
                  <button type="submit" disabled={!vrmForm.formState.isValid || busy} className="rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50">Search</button>
                </div>
                <div className="text-sm text-slate-400">We'll use DVLA to look up your vehicle. You can enter details manually <button type="button" onClick={()=>setActive('manual')} className="font-medium text-orange-400 underline-offset-2 hover:underline">here</button>.</div>
              </>
            ) : null}
            {busy ? <LoadingIndicator label="Searching DVLA…" />: null}
            {error ? <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</p>: null}
            {summary ? (
              <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Make:</span>
                    <span className="font-semibold text-white">{summary.make ?? 'Unknown'}</span>
                  </div>
                  {(() => {
                    const modelLabel = sanitizeModel(summary.model);
                    return modelLabel ? (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Model:</span>
                        <span className="font-semibold text-white">{modelLabel}</span>
                      </div>
                    ) : null;
                  })()}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Engine size:</span>
                    <span className="font-semibold text-white">{summary.engineSizeCc ? `${summary.engineSizeCc} cc` : 'Unknown'}</span>
                  </div>
                  {typeof summary.pricePence==='number' ? (
                    <div className="flex justify-between border-t border-slate-600 pt-3 text-base">
                      <span className="font-medium text-slate-300">Price:</span>
                      <span className="font-bold text-orange-400">{gbCurrency.format(summary.pricePence/100)}</span>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={()=>{ setSummary(null); vrmForm.reset({ vrm: '' }); }} className="rounded-full border border-slate-600 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-orange-500 hover:bg-slate-700 hover:text-orange-400">Search again</button>
                  <button type="button" onClick={handleConfirm} disabled={!canContinue} className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50">Continue</button>
                </div>
              </div>
            ): null}
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleManual} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300">Vehicle registration *</label>
                <input type="text" className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 uppercase text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" {...manualForm.register('vrm')} />
                {manualForm.formState.errors.vrm ? (<p className="mt-1 text-xs text-red-400">{manualForm.formState.errors.vrm.message}</p>) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Vehicle make *</label>
                <input list="make-list" type="text" className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" {...manualForm.register('make')} />
                <datalist id="make-list">
                  {(makes as string[]).map((m)=> (<option key={m} value={m} />))}
                </datalist>
                {manualForm.formState.errors.make ? (<p className="mt-1 text-xs text-red-400">{manualForm.formState.errors.make.message}</p>) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Vehicle model</label>
                <input list="model-list" type="text" className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" {...manualForm.register('model')} />
                <datalist id="model-list">
                  {modelOptions()}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Engine size (cc) *</label>
                <input type="number" min={1} step={1} className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" {...manualForm.register('engineSizeCc',{ valueAsNumber: true })} />
                {manualForm.formState.errors.engineSizeCc ? (<p className="mt-1 text-xs text-red-400">{manualForm.formState.errors.engineSizeCc.message}</p>) : (<p className="mt-1 text-xs text-slate-400">Please enter your engine size in CC. e.g. 1200.</p>)}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Fuel type *</label>
                <select className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" {...manualForm.register('fuelType')}>
                  <option value="">Select fuel type</option>
                  <option value="PETROL">Petrol</option>
                  <option value="DIESEL">Diesel</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="PETROL_ELECTRIC">Petrol/Electric</option>
                  <option value="CNG">CNG</option>
                  <option value="LPG">LPG</option>
                  <option value="ELECTRIC">Electric</option>
                  <option value="PETROL_E85">Petrol / E85 (Flex Fuel)</option>
                  <option value="DIESEL_HYBRID">Diesel/Hybrid</option>
                  <option value="DIESEL_ELECTRIC">Diesel/Electric</option>
                </select>
                {manualForm.formState.errors.fuelType ? (<p className="mt-1 text-xs text-red-400">{manualForm.formState.errors.fuelType.message}</p>) : null}
              </div>
            </div>
            {busy ? <LoadingIndicator label="Calculating price…" /> : null}
            {error ? <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</p> : null}
            {summary ? (
              <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Make:</span>
                    <span className="font-semibold text-white">{summary.make ?? 'Unknown'}</span>
                  </div>
                  {(() => {
                    const modelLabel = sanitizeModel(summary.model);
                    return modelLabel ? (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Model:</span>
                        <span className="font-semibold text-white">{modelLabel}</span>
                      </div>
                    ) : null;
                  })()}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Engine size:</span>
                    <span className="font-semibold text-white">{summary.engineSizeCc ? `${summary.engineSizeCc} cc` : 'Unknown'}</span>
                  </div>
                  {typeof summary.pricePence==='number' ? (
                    <div className="flex justify-between border-t border-slate-600 pt-3 text-base">
                      <span className="font-medium text-slate-300">Price:</span>
                      <span className="font-bold text-orange-400">{gbCurrency.format(summary.pricePence/100)}</span>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={()=>{ setSummary(null); setActive('vrm'); }} className="rounded-full border border-slate-600 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-orange-500 hover:bg-slate-700 hover:text-orange-400">Back to lookup</button>
                  <button type="button" onClick={handleConfirm} disabled={!canContinue} className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50">Continue</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={()=>setActive('vrm')} className="rounded-full border border-slate-600 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-orange-500 hover:bg-slate-700 hover:text-orange-400">Back</button>
                <button type="submit" disabled={!manualForm.formState.isValid || busy} className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50">Continue</button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}


