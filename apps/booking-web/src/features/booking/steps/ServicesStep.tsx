import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { LoadingIndicator } from '../../../components/LoadingIndicator';
import { useBookingWizard } from '../state';
import { useCatalogSummary } from '../useCatalogSummary';
import { SERVICE_DETAILS, type ServiceCode } from '@a1/shared/pricing';
import { useNewBookingUIFlag } from './services-step/utils/format';
import { useServiceOptions } from './services-step/hooks/useServiceOptions';
import { NewUiGrid } from './services-step/components/NewUiGrid';
import { LegacyServiceList } from './services-step/components/LegacyServiceList';

// ServicesStep composes service selection with new/legacy UIs; behaviour unchanged
export function ServicesStep() {
  const navigate = useNavigate();
  const { draft, updateDraft, markStepComplete } = useBookingWizard();
  const { catalog, loading, error, refresh } = useCatalogSummary();
  const [message, setMessage] = useState<string | null>(null);
  const useNewUI = useNewBookingUIFlag();
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingSelectCode, setPendingSelectCode] = useState<ServiceCode | null>(null);

  const { serviceOptions, pricesByService } = useServiceOptions(catalog);
  const selectedServiceCode = draft.serviceCode ?? null;

  const handleSelect = (code: ServiceCode) => {
    const summary = catalog?.services.find((service) => service.code === code);
    if (!summary) { toast.error('This service is not currently available.'); return; }
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
          <button type="button" onClick={() => refresh().catch(() => undefined)} className="rounded bg-brand-orange px-3 py-2 text-white hover:bg-orange-500">Try again</button>
        </div>
      </section>
    );
  }

  // New UI path: grid cards + modal + pricing table
  if (useNewUI && catalog) {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-brand-black">1. Choose a service package</h2>
          <p className="text-slate-600">Each package is priced with VAT included. Engine size determines the final tier in the next step.</p>
          {message ? <p className="text-sm text-red-600">{message}</p> : null}
        </header>
        <NewUiGrid
          catalog={catalog}
          draft={draft}
          serviceOptions={serviceOptions}
          pendingSelectCode={pendingSelectCode}
          modalOpen={modalOpen}
          onSelect={handleSelect}
          onDeselect={handleDeselect}
          setModalOpen={setModalOpen}
          setPendingSelectCode={setPendingSelectCode}
        />
      </div>
    );
  }

  // Legacy path: list with inline tier pricing and continue button
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-brand-black">1. Choose a service package</h2>
        <p className="text-slate-600">Each package is priced with VAT included. Engine size determines the final tier in the next step.</p>
        {message ? <p className="text-sm text-red-600">{message}</p> : null}
      </header>
      <LegacyServiceList
        serviceOptions={serviceOptions}
        pricesByService={pricesByService}
        selectedServiceCode={selectedServiceCode}
        onSelect={handleSelect}
        message={message}
      />
      <div className="flex justify-between">
        <span className="text-xs text-slate-500">You can adjust details later in the flow.</span>
        <button type="button" disabled={!selectedServiceCode} onClick={handleNext} className="rounded bg-brand-orange px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50">Continue to summary</button>
      </div>
    </div>
  );
}

export default ServicesStep;

