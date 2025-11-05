import { useMemo } from 'react';
import { ENGINE_TIER_CODES, type EngineTierCode, SERVICE_CODES, type ServiceCode } from '@a1/shared/pricing';
import type { CatalogSummary } from '../../types';

export type ServiceOption = { code: ServiceCode; summary?: CatalogSummary['services'][number] };
export type ServicePriceMap = Partial<Record<EngineTierCode, number>>;

export function useServiceOptions(catalog: CatalogSummary | null) {
  const serviceOptions: ServiceOption[] = useMemo(() => {
    if (!catalog) return SERVICE_CODES.map((code: ServiceCode) => ({ code }));
    return SERVICE_CODES.map((code: ServiceCode) => ({ code, summary: catalog.services.find((s) => s.code === code) }));
  }, [catalog]);

  const pricesByService = useMemo(() => {
    if (!catalog) return new Map<ServiceCode, ServicePriceMap>();
    const tierCodeById = new Map<number, EngineTierCode>();
    catalog.engineTiers.forEach((tier) => { if (tier.code) tierCodeById.set(tier.id, tier.code); });
    const serviceCodeById = new Map<number, ServiceCode>();
    catalog.services.forEach((service) => { if (service.code) serviceCodeById.set(service.id, service.code); });
    const result = new Map<ServiceCode, ServicePriceMap>();
    catalog.prices.forEach((price) => {
      const serviceCode = serviceCodeById.get(price.serviceId);
      const tierCode = tierCodeById.get(price.engineTierId);
      if (!serviceCode || !tierCode) return;
      const tierMap = result.get(serviceCode) ?? {};
      tierMap[tierCode] = price.amountPence;
      result.set(serviceCode, tierMap);
    });
    return result;
  }, [catalog]);

  return { serviceOptions, pricesByService } as const;
}

