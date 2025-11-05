import { SERVICE_DETAILS, type ServiceCode } from '@a1/shared/pricing';
import { ServiceCard } from '../../../../../components/ServiceCard';
import { PricingTable } from '../../../../../components/PricingTable';
import { VehicleModal } from '../../../../../components/VehicleModal';
import type { CatalogSummary, BookingDraft } from '../../../types';
import type { ServiceOption } from '../hooks/useServiceOptions';

/** New UI grid of service cards, with vehicle modal + pricing table */
export function NewUiGrid({
  catalog,
  draft,
  serviceOptions,
  pendingSelectCode,
  modalOpen,
  onSelect,
  onDeselect,
  setModalOpen,
  setPendingSelectCode,
}: {
  catalog: CatalogSummary;
  draft: BookingDraft;
  serviceOptions: ServiceOption[];
  pendingSelectCode: ServiceCode | null;
  modalOpen: boolean;
  onSelect: (code: ServiceCode) => void;
  onDeselect: () => void;
  setModalOpen: (open: boolean) => void;
  setPendingSelectCode: (code: ServiceCode | null) => void;
}) {
  return (
    <div className="space-y-6">
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
              onSelect={() => onSelect(code)}
              onToggleSelected={onDeselect}
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

export default NewUiGrid;
