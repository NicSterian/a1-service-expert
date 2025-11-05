/**
 * PricingPolicy
 *
 * Resolves unit pricing for a service given the requested engine tier and/or
 * the vehicle engine size. Preserves existing error messages and selection
 * order to avoid behavior changes.
 */
import { BadRequestException, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ServicePricingMode } from '@prisma/client';
import { mapEngineTierNameToCode, mapEngineTierSortOrderToCode, EngineTierCode } from '@a1/shared/pricing';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService } from '../vehicles/vehicles.service';

export type PricingResolution = {
  unitPricePence: number;
  resolvedEngineTierId: number | null;
  engineTierCode: EngineTierCode | null;
};

export class PricingPolicy {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vehicles: VehiclesService,
    private readonly logger: Logger,
  ) {}

  /**
   * Resolve the price for a given service.
   *
   * Selection order (must not change):
   * 1) FIXED: use fixedPricePence and no engine tier.
   * 2) TIERED: try recommendation by engine size, then requested tier, then cheapest.
   */
  async resolveForService(params: {
    service: { id: number; pricingMode: ServicePricingMode; fixedPricePence: number | null };
    requestedEngineTierId: number | null;
    engineSizeCc: number | null;
  }): Promise<PricingResolution> {
    const { service, requestedEngineTierId, engineSizeCc } = params;

    // FIXED pricing
    if (service.pricingMode === ServicePricingMode.FIXED) {
      if (typeof service.fixedPricePence !== 'number' || service.fixedPricePence <= 0) {
        throw new BadRequestException('Service pricing is not configured correctly.');
      }
      return {
        unitPricePence: service.fixedPricePence,
        resolvedEngineTierId: null,
        engineTierCode: null,
      };
    }

    // TIERED pricing
    let resolvedEngineTierId: number | null = requestedEngineTierId;

    if (engineSizeCc) {
      try {
        const rec = await this.vehicles.getRecommendation(service.id, engineSizeCc);
        if (rec.engineTierId) {
          resolvedEngineTierId = rec.engineTierId;
        }
      } catch (error) {
        this.logger.warn(`Unable to determine engine tier automatically: ${(error as Error).message}`);
      }
    }

    type ServicePriceWithTier = Prisma.ServicePriceGetPayload<{ include: { engineTier: true } }>;
    let servicePrice: ServicePriceWithTier | null = null;

    if (resolvedEngineTierId) {
      servicePrice = await this.prisma.servicePrice.findUnique({
        where: { serviceId_engineTierId: { serviceId: service.id, engineTierId: resolvedEngineTierId } },
        include: { engineTier: true },
      });
    }

    if (!servicePrice && requestedEngineTierId && requestedEngineTierId !== resolvedEngineTierId) {
      servicePrice = await this.prisma.servicePrice.findUnique({
        where: { serviceId_engineTierId: { serviceId: service.id, engineTierId: requestedEngineTierId } },
        include: { engineTier: true },
      });
    }

    if (!servicePrice) {
      servicePrice = await this.prisma.servicePrice.findFirst({
        where: { serviceId: service.id },
        orderBy: [{ amountPence: 'asc' }],
        include: { engineTier: true },
      });
    }

    if (!servicePrice) {
      throw new BadRequestException('Service pricing is not configured correctly.');
    }

    const unitPricePence = servicePrice.amountPence;
    resolvedEngineTierId = servicePrice.engineTierId;
    const tierName = servicePrice.engineTier?.name ?? null;
    const tierSortOrder = servicePrice.engineTier?.sortOrder ?? null;
    const engineTierCode = (mapEngineTierNameToCode(tierName) ?? mapEngineTierSortOrderToCode(tierSortOrder)) as EngineTierCode | null;

    return { unitPricePence, resolvedEngineTierId, engineTierCode };
  }
}
