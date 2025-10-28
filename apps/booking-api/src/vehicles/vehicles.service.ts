import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EngineTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { VehicleLookupDto } from './dto/vehicle-lookup.dto';
import {
  EngineTierCode,
  mapEngineTierNameToCode,
  mapEngineTierSortOrderToCode,
} from '@a1/shared/pricing';


type CachedVehicleData = {
  make?: string;
  model?: string;
  engineSizeCc?: number;
};

interface VehicleCacheEntry {
  expiresAt: number;
  data: CachedVehicleData;
}

type Recommendation = {
  engineSizeCc?: number;
  engineTierId?: number;
  engineTierCode?: EngineTierCode | null;
  engineTierName?: string;
  pricePence?: number;
};

type DVLAResponse = {
  make?: string;
  model?: string;
  /** DVLA commonly provides this as engineCapacity */
  engineCapacity?: number | string | null;
  /** Some payloads use cylinderCapacity */
  cylinderCapacity?: number | string | null;
  /** Fallback field name seen in other datasets */
  engineSize?: number | string | null;
};

type HttpResponse = {
  ok: boolean;
  status: number;
  statusText?: string;
  text(): Promise<string>;
  json(): Promise<unknown>;
};


const DVLA_URL =
  'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles';

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);
  private readonly vehicleCache = new Map<string, VehicleCacheEntry>();
  private readonly vehicleCacheTtlMs = 5 * 60 * 1000;

  private engineTierCache: { expiresAt: number; tiers: EngineTier[] } | null =
    null;
  private readonly engineTierCacheTtlMs = 10 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Lookup a VRM via DVLA. Caches results briefly.
   * Returns { ok, allowManual, data?, reason? } (reason only in non-production).
   */
  async lookupVrm(
    { vrm, serviceId }: VehicleLookupDto,
    options: { dryRun?: boolean } = {},
  ) {
    const normalized = this.normalizeVrm(vrm);

    // cache hit
    const cached = this.vehicleCache.get(normalized);
    if (!options.dryRun && cached && cached.expiresAt > Date.now()) {
      const recommendation = await this.buildRecommendation(
        cached.data.engineSizeCc,
        serviceId,
      );
      return {
        ok: true,
        allowManual: false,
        data: this.toResponsePayload(cached.data, recommendation),
      };
    }

    // resolve API key: DB (encrypted) -> .env fallback
    const apiKey = await this.resolveApiKey();
    if (!apiKey) {
  const msg = 'DVLA API key is not configured';
  this.logger.warn(msg);
  return { ok: false, allowManual: true, reason: msg };
}

    // call DVLA
    let res: HttpResponse;
    try {
      // Node 18+ global fetch returns an undici Response (typed via 'undici')
      res = (await fetch(DVLA_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ registrationNumber: normalized }),
      })) as unknown as HttpResponse;
    } catch (error) {
  const msg = `Network error calling DVLA: ${(error as Error).message}`;
  this.logger.error(msg);
  return { ok: false, allowManual: true, reason: msg };
}


   if (res.status === 404) {
  const msg = 'DVLA 404 (VRM not found)';
  this.logger.warn(msg);
  return { ok: false, allowManual: true, reason: msg };
}

if (!res.ok) {
  const text = await res.text().catch(() => '');
  const msg = `DVLA error ${res.status}: ${text || res.statusText || 'Unknown error'}`;
  this.logger.warn(msg);
  return { ok: false, allowManual: true, reason: msg };
}



    // success
    const raw = (await res.json()) as DVLAResponse;
    const data: CachedVehicleData = {
      make: this.extractString(raw.make),
      model: this.extractString(raw.model),
      engineSizeCc: this.sanitizeEngineSize(
        raw.engineCapacity ?? raw.cylinderCapacity ?? raw.engineSize,
      ),
    };

    if (!options.dryRun) {
      this.vehicleCache.set(normalized, {
        data,
        expiresAt: Date.now() + this.vehicleCacheTtlMs,
      });
    }

    const recommendation = await this.buildRecommendation(
      data.engineSizeCc,
      serviceId,
    );

    return {
      ok: true,
      allowManual: false,
      data: this.toResponsePayload(data, recommendation),
    };
  }

  async recommendEngineTier(serviceId: number, engineSizeCc: number) {
    const recommendation = await this.buildRecommendation(
      engineSizeCc,
      serviceId,
    );
    return {
      engineSizeCc: recommendation.engineSizeCc ?? engineSizeCc,
      engineTierId: recommendation.engineTierId ?? null,
      engineTierCode: recommendation.engineTierCode ?? null,
      engineTierName: recommendation.engineTierName ?? null,
      pricePence: recommendation.pricePence ?? null,
    };
  }

  async getRecommendation(serviceId: number, engineSizeCc: number) {
    return this.recommendEngineTier(serviceId, engineSizeCc);
  }

  // ----------------- internals -----------------

  private async buildRecommendation(
    engineSizeCc?: number,
    serviceId?: number,
  ): Promise<Recommendation> {
    if (!engineSizeCc || engineSizeCc <= 0) {
      return { engineSizeCc };
    }

    const tiers = await this.getEngineTiers();
    if (!tiers.length) {
      return { engineSizeCc };
    }

    const sorted = tiers.slice().sort((a, b) => a.sortOrder - b.sortOrder);

    // pick first tier whose maxCc >= engineSizeCc, else highest
    let selected =
      this.pickTier(sorted, engineSizeCc) ?? sorted[sorted.length - 1];

    let pricePence: number | undefined;

    if (serviceId) {
      const prices = await this.prisma.servicePrice.findMany({
        where: { serviceId },
        select: { engineTierId: true, amountPence: true },
      });
      const priceMap = new Map(
        prices.map((p) => [p.engineTierId, p.amountPence]),
      );

      if (priceMap.size) {
        if (!priceMap.has(selected.id)) {
          const matching =
            this.findTierWithPrice(sorted, priceMap, engineSizeCc) ??
            this.findHighestTierWithPrice(sorted, priceMap);
        if (matching) selected = matching;
        }
        pricePence = priceMap.get(selected.id);
      }
    }

    const engineTierCode =
      mapEngineTierNameToCode(selected.name) ??
      mapEngineTierSortOrderToCode(selected.sortOrder) ??
      null;

    return {
      engineSizeCc,
      engineTierId: selected.id,
      engineTierCode,
      engineTierName: selected.name,
      pricePence,
    };
  }

  private pickTier(tiers: EngineTier[], engineSizeCc: number) {
    return tiers.find((tier) => {
      if (tier.maxCc === null || typeof tier.maxCc === 'undefined') return true;
      return engineSizeCc <= tier.maxCc;
    });
  }

  private findTierWithPrice(
    tiers: EngineTier[],
    priceMap: Map<number, number>,
    engineSizeCc: number,
  ) {
    return tiers.find(
      (tier) =>
        priceMap.has(tier.id) &&
        (tier.maxCc === null ||
          typeof tier.maxCc === 'undefined' ||
          engineSizeCc <= tier.maxCc),
    );
  }

  private findHighestTierWithPrice(
    tiers: EngineTier[],
    priceMap: Map<number, number>,
  ) {
    for (let i = tiers.length - 1; i >= 0; i -= 1) {
      const tier = tiers[i];
      if (priceMap.has(tier.id)) return tier;
    }
    return undefined;
  }

  private async getEngineTiers(): Promise<EngineTier[]> {
    const now = Date.now();
    if (this.engineTierCache && this.engineTierCache.expiresAt > now) {
      return this.engineTierCache.tiers;
    }
    const tiers = await this.prisma.engineTier.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    this.engineTierCache = { tiers, expiresAt: now + this.engineTierCacheTtlMs };
    return tiers;
  }

  private async resolveApiKey(): Promise<string | null> {
    // 1) DB (encrypted) via SettingsService
    const decrypted = await this.settingsService.getDecryptedDvlaApiKey();
    if (decrypted) return decrypted;

    // 2) .env fallback (ConfigModule)
    const fromEnv = this.configService.get<string>('DVLA_API_KEY');
    if (typeof fromEnv === 'string') {
      const trimmed = fromEnv.trim();
      if (trimmed.length) return trimmed;
    }
    return null;
  }

  private normalizeVrm(value: string) {
    return value.replace(/\s+/g, '').toUpperCase();
  }

  private extractString(value: unknown) {
    if (typeof value !== 'string') return undefined;
    const t = value.trim();
    return t.length ? t : undefined;
  }

  private sanitizeEngineSize(raw: unknown): number | undefined {
    if (raw === null || typeof raw === 'undefined') return undefined;

    const numeric =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
        ? Number.parseInt(raw, 10)
        : Number.NaN;

    if (!Number.isFinite(numeric)) return undefined;

    const rounded = Math.round(numeric);
    return rounded > 0 ? rounded : undefined;
  }

  private toResponsePayload(
    data: CachedVehicleData,
    recommendation: Recommendation,
  ) {
    const hasRecommendation =
      recommendation.engineTierId !== undefined ||
      recommendation.engineTierCode !== undefined ||
      recommendation.engineTierName !== undefined ||
      recommendation.pricePence !== undefined;

    return {
      make: data.make ?? null,
      model: data.model ?? null,
      engineSizeCc: recommendation.engineSizeCc ?? data.engineSizeCc ?? null,
      recommendation: hasRecommendation
        ? {
            engineTierId: recommendation.engineTierId ?? null,
            engineTierCode: recommendation.engineTierCode ?? null,
            engineTierName: recommendation.engineTierName ?? null,
            pricePence: recommendation.pricePence ?? null,
          }
        : null,
    };
  }
}
