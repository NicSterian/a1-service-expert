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

  const handleConfirm = ()=>{
    if(!summary) return;
    const cleanedModel = sanitizeModel(summary.model);
    updateDraft({ vehicle: { vrm: summary.vrm, make: summary.make ?? undefined, model: cleanedModel ?? undefined, engineSizeCc: summary.engineSizeCc ?? undefined }, engineTierCode: summary.engineTierCode ?? undefined, engineTierName: summary.engineTierName ?? undefined, pricePence: typeof summary.pricePence==='number'? summary.pricePence: undefined });
    onAdded();
  };

  if(!open) return null;

  const modelOptions = () => {
    const mk = manualForm.getValues('make');
    const list = (modelsMap as Record<string,string[]>)?.[mk as string] ?? [];
    return list.map((m)=> (<option key={m} value={m} />));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-2xl rounded-lg bg-white p-4 shadow-xl">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Find your vehicle</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100">✕</button>
        </header>

        {active==='vrm' ? (
          <form className="space-y-3" onSubmit={handleLookup} noValidate>
            <label className="block text-sm font-medium text-slate-700">Vehicle registration</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input type="text" placeholder="Enter your registration" className="flex-1 rounded border border-slate-300 bg-yellow-200 px-3 py-2 text-slate-900 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-400" {...vrmForm.register('vrm')} />
              <button type="submit" disabled={!vrmForm.formState.isValid || busy} className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50">Continue</button>
            </div>
            <div className="text-xs text-slate-500">We’ll use DVLA to look up your vehicle. You can enter details manually <button type="button" onClick={()=>setActive('manual')} className="text-blue-700 underline">here</button>.</div>
            {busy ? <LoadingIndicator label="Searching DVLA…" />: null}
            {error ? <p className="text-sm text-red-600">{error}</p>: null}
            {summary ? (
              <div className="rounded border border-slate-200 bg-orange-50 p-3 text-sm text-brand-black">
                <p>{`Make: ${summary.make ?? 'Unknown'}`}</p>
                {(() => {
                  const modelLabel = sanitizeModel(summary.model);
                  return modelLabel ? <p>{`Model: ${modelLabel}`}</p> : null;
                })()}
                <p>{`Engine size: ${summary.engineSizeCc ? `${summary.engineSizeCc} cc` : 'Unknown'}`}</p>
                {typeof summary.pricePence==='number' ? (<p>{`Price: ${gbCurrency.format(summary.pricePence/100)}`}</p>) : null}
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={()=>setActive('vrm')} className="text-sm text-blue-700 underline">Search again</button>
                  <button type="button" onClick={handleConfirm} disabled={!canContinue} className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50">Continue</button>
                </div>
              </div>
            ): null}
          </form>
        ) : (
          <form className="space-y-3" onSubmit={handleManual} noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Vehicle registration *</label>
                <input type="text" className="mt-1 w-full rounded border border-slate-300 px-3 py-2 uppercase" {...manualForm.register('vrm')} />
                {manualForm.formState.errors.vrm ? (<p className="text-xs text-red-600">{manualForm.formState.errors.vrm.message}</p>) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Vehicle make *</label>
                <input list="make-list" type="text" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...manualForm.register('make')} />
                <datalist id="make-list">
                  {(makes as string[]).map((m)=> (<option key={m} value={m} />))}
                </datalist>
                {manualForm.formState.errors.make ? (<p className="text-xs text-red-600">{manualForm.formState.errors.make.message}</p>) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Vehicle model</label>
                <input list="model-list" type="text" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...manualForm.register('model')} />
                <datalist id="model-list">
                  {modelOptions()}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Engine size (cc) *</label>
                <input type="number" min={1} step={1} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...manualForm.register('engineSizeCc',{ valueAsNumber: true })} />
                {manualForm.formState.errors.engineSizeCc ? (<p className="text-xs text-red-600">{manualForm.formState.errors.engineSizeCc.message}</p>) : (<p className="text-xs text-slate-500">Please enter your engine size in CC. e.g. 1200.</p>)}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Fuel type *</label>
                <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...manualForm.register('fuelType')}>
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
                {manualForm.formState.errors.fuelType ? (<p className="text-xs text-red-600">{manualForm.formState.errors.fuelType.message}</p>) : null}
              </div>
            </div>
            {busy ? <LoadingIndicator label="Calculating price…" /> : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {summary ? (
              <div className="rounded border border-slate-200 bg-orange-50 p-3 text-sm text-brand-black">
                <p>{`Make: ${summary.make ?? 'Unknown'}`}</p>
                {(() => {
                  const modelLabel = sanitizeModel(summary.model);
                  return modelLabel ? <p>{`Model: ${modelLabel}`}</p> : null;
                })()}
                <p>{`Engine size: ${summary.engineSizeCc ? `${summary.engineSizeCc} cc` : 'Unknown'}`}</p>
                {typeof summary.pricePence==='number' ? (<p>{`Price: ${gbCurrency.format(summary.pricePence/100)}`}</p>) : null}
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={()=>setSummary(null)} className="text-sm text-blue-700 underline">Change details</button>
                  <button type="button" onClick={handleConfirm} disabled={!canContinue} className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50">Continue</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end"><button type="submit" disabled={!manualForm.formState.isValid || busy} className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50">Continue</button></div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
