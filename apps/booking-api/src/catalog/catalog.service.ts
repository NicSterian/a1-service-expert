import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ServicePricingMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEngineTierDto } from './dto/create-engine-tier.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateEngineTierDto } from './dto/update-engine-tier.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpsertServicePriceDto } from './dto/upsert-service-price.dto';
import { mapEngineTierNameToCode, mapEngineTierSortOrderToCode } from '@a1/shared/pricing';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  getServices() {
    return this.prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  getAllServices() {
    return this.prisma.service.findMany({
      orderBy: { name: 'asc' },
    });
  }

  getEngineTiers() {
    return this.prisma.engineTier.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  getServicePrices(includeRelations = false) {
    const query: Prisma.ServicePriceFindManyArgs = {
      orderBy: [{ serviceId: 'asc' }, { engineTierId: 'asc' }],
    };

    if (includeRelations) {
      query.include = {
        service: true,
        engineTier: true,
      };
    }

    return this.prisma.servicePrice.findMany(query);
  }

  async getCatalogSummary() {
    const [services, engineTiers] = await Promise.all([
      this.prisma.service.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.engineTier.findMany({
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    const servicesSummary = services.map((service) => ({
      id: service.id,
      code: service.code?.trim() ?? null,
      name: service.name,
      description: service.description ?? null,
      pricingMode: service.pricingMode,
      fixedPricePence: typeof service.fixedPricePence === 'number' ? service.fixedPricePence : null,
      footnotes: service.footnotes ?? null,
    }));

    const engineTiersSummary = engineTiers.map((tier) => ({
      id: tier.id,
      code: mapEngineTierNameToCode(tier.name) ?? mapEngineTierSortOrderToCode(tier.sortOrder) ?? null,
      name: tier.name,
      sortOrder: tier.sortOrder,
      maxCc: typeof tier.maxCc === 'number' ? tier.maxCc : null,
    }));

    const priceWhere: Prisma.ServicePriceWhereInput = {};

    const serviceIds = servicesSummary.map((service) => service.id);
    if (serviceIds.length > 0) {
      priceWhere.serviceId = { in: serviceIds };
    }

    const engineTierIds = engineTiersSummary.map((tier) => tier.id);
    if (engineTierIds.length > 0) {
      priceWhere.engineTierId = { in: engineTierIds };
    }

    const prices = await this.prisma.servicePrice.findMany({
      where: priceWhere,
      orderBy: [{ serviceId: 'asc' }, { engineTierId: 'asc' }],
    });

    // Compute lowest tier price per service for convenience in the UI
    const lowestByService = new Map<number, number>();
    for (const p of prices) {
      const prev = lowestByService.get(p.serviceId);
      if (typeof prev !== 'number' || p.amountPence < prev) {
        lowestByService.set(p.serviceId, p.amountPence);
      }
    }

    const servicesWithLowest = servicesSummary.map((s) => ({
      ...s,
      lowestTierPricePence:
        s.pricingMode === ServicePricingMode.FIXED
          ? s.fixedPricePence
          : lowestByService.get(s.id) ?? null,
    }));

    return {
      services: servicesWithLowest,
      engineTiers: engineTiersSummary,
      prices: prices.map((price) => ({
        serviceId: price.serviceId,
        engineTierId: price.engineTierId,
        amountPence: price.amountPence,
      })),
    };
  }

  async createService(dto: CreateServiceDto) {
    try {
      return await this.prisma.service.create({
        data: {
          code: dto.code.trim(),
          name: dto.name.trim(),
          description: dto.description?.trim() ?? null,
          pricingMode: dto.pricingMode ?? ServicePricingMode.TIERED,
          fixedPricePence: dto.fixedPricePence ?? null,
          footnotes: dto.footnotes?.trim() ?? null,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      this.handleKnownErrors(error, 'Service');
    }
  }

  async updateService(id: number, dto: UpdateServiceDto) {
    const data: Prisma.ServiceUpdateInput = {};

    if (dto.code !== undefined) {
      data.code = dto.code.trim();
    }
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() ?? null;
    }
    if (dto.pricingMode !== undefined) {
      data.pricingMode = dto.pricingMode;
      if (dto.pricingMode === ServicePricingMode.TIERED) {
        data.fixedPricePence = null;
      }
    }
    if (dto.fixedPricePence !== undefined) {
      data.fixedPricePence = dto.fixedPricePence ?? null;
    }
    if (dto.footnotes !== undefined) {
      data.footnotes = dto.footnotes?.trim() ?? null;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    try {
      return await this.prisma.service.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.handleKnownErrors(error, 'Service');
    }
  }

  async deleteService(id: number) {
    try {
      await this.prisma.service.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Service not found');
        }
        if (error.code === 'P2003') {
          throw new Error('Cannot delete service: it is referenced by existing bookings. Please cancel or modify those bookings first.');
        }
      }
      throw error;
    }
  }

  async createEngineTier(dto: CreateEngineTierDto) {
    try {
      return await this.prisma.engineTier.create({
        data: {
          name: dto.name.trim(),
          maxCc: dto.maxCc ?? null,
          sortOrder: dto.sortOrder,
        },
      });
    } catch (error) {
      this.handleKnownErrors(error, 'Engine tier');
    }
  }

  async updateEngineTier(id: number, dto: UpdateEngineTierDto) {
    const data: Prisma.EngineTierUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.maxCc !== undefined) {
      data.maxCc = dto.maxCc ?? null;
    }
    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }

    try {
      return await this.prisma.engineTier.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.handleKnownErrors(error, 'Engine tier');
    }
  }

  async deleteEngineTier(id: number) {
    try {
      await this.prisma.engineTier.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Engine tier not found');
      }
      throw error;
    }
  }

  async upsertServicePrice(dto: UpsertServicePriceDto) {
    try {
      return await this.prisma.servicePrice.upsert({
        where: {
          serviceId_engineTierId: {
            serviceId: dto.serviceId,
            engineTierId: dto.engineTierId,
          },
        },
        update: {
          amountPence: dto.amountPence,
        },
        create: {
          serviceId: dto.serviceId,
          engineTierId: dto.engineTierId,
          amountPence: dto.amountPence,
        },
      });
    } catch (error) {
      this.handleKnownErrors(error, 'Service price');
    }
  }

  async deleteServicePrice(id: number) {
    try {
      await this.prisma.servicePrice.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Service price not found');
      }
      throw error;
    }
  }

  private handleKnownErrors(error: unknown, entity: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(`${entity} already exists`);
      }
      if (error.code === 'P2025') {
        throw new NotFoundException(`${entity} not found`);
      }
    }

    throw error;
  }
}
