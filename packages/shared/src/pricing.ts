export type ServiceCode = 'SERVICE_1' | 'SERVICE_2' | 'SERVICE_3';
export type EngineTierCode = 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE';

export const SERVICE_CODES: ServiceCode[] = ['SERVICE_1', 'SERVICE_2', 'SERVICE_3'];
export const ENGINE_TIER_CODES: EngineTierCode[] = ['SMALL', 'MEDIUM', 'LARGE', 'XLARGE'];

export function isServiceCode(value: string): value is ServiceCode {
  return SERVICE_CODES.includes(value as ServiceCode);
}

export function isEngineTierCode(value: string): value is EngineTierCode {
  return ENGINE_TIER_CODES.includes(value as EngineTierCode);
}

export const ENGINE_TIER_THRESHOLDS: Array<{ code: EngineTierCode; maxCc: number | null }> = [
  { code: 'SMALL', maxCc: 1200 },
  { code: 'MEDIUM', maxCc: 1600 },
  { code: 'LARGE', maxCc: 2200 },
  { code: 'XLARGE', maxCc: null },
];

export function engineTierFromCc(cc: number | null | undefined): EngineTierCode | null {
  if (cc === null || typeof cc === 'undefined' || Number.isNaN(cc)) {
    return null;
  }

  const rounded = Math.round(cc);
  if (rounded <= 0) {
    return null;
  }

  for (const tier of ENGINE_TIER_THRESHOLDS) {
    if (tier.maxCc === null || rounded <= tier.maxCc) {
      return tier.code;
    }
  }

  return ENGINE_TIER_THRESHOLDS[ENGINE_TIER_THRESHOLDS.length - 1].code;
}

export const SERVICE_DISCLAIMERS = [
  '*Up to 5 litres of standard oil. Certain oil types will incur additional charge.',
  '*Additional costs for parts only and will not incur any labour charges.',
];

export const SERVICE_DETAILS: Record<
  ServiceCode,
  {
    name: string;
    description: string;
    disclaimers: string[];
  }
> = {
  SERVICE_1: {
    name: 'SERVICE 1',
    description: 'Oil change, oil filter change, and check & top up of all fluid levels.',
    disclaimers: SERVICE_DISCLAIMERS,
  },
  SERVICE_2: {
    name: 'SERVICE 2',
    description:
      'SERVICE 1 plus air filter change, visual brake check, battery condition report, and full under body inspections.',
    disclaimers: SERVICE_DISCLAIMERS,
  },
  SERVICE_3: {
    name: 'SERVICE 3',
    description:
      'SERVICE 2 plus cabin filter replacement, spark plug replacement (additional cost for platinum/iridium), full brake and disc check, and optional fuel filter replacement at parts cost.',
    disclaimers: SERVICE_DISCLAIMERS,
  },
};

export const PRICES_PENCE: Record<ServiceCode, Record<EngineTierCode, number>> = {
  SERVICE_1: {
    SMALL: 9995,
    MEDIUM: 10995,
    LARGE: 11995,
    XLARGE: 12995,
  },
  SERVICE_2: {
    SMALL: 13995,
    MEDIUM: 14995,
    LARGE: 15995,
    XLARGE: 17995,
  },
  SERVICE_3: {
    SMALL: 18995,
    MEDIUM: 19995,
    LARGE: 21995,
    XLARGE: 23995,
  },
};

export function getPriceFor(service: ServiceCode, tier: EngineTierCode): number {
  return PRICES_PENCE[service][tier];
}

export function mapEngineTierNameToCode(name: string | null | undefined): EngineTierCode | null {
  if (!name) {
    return null;
  }

  const normalized = name.trim().toLowerCase();
  switch (normalized) {
    case 'small':
      return 'SMALL';
    case 'medium':
      return 'MEDIUM';
    case 'large':
      return 'LARGE';
    case 'ex-large':
    case 'ex large':
    case 'xl':
    case 'xlarge':
    case 'extra large':
    case 'xl large':
      return 'XLARGE';
    default:
      return null;
  }
}

export function mapEngineTierSortOrderToCode(sortOrder: number | null | undefined): EngineTierCode | null {
  switch (sortOrder) {
    case 1:
      return 'SMALL';
    case 2:
      return 'MEDIUM';
    case 3:
      return 'LARGE';
    case 4:
      return 'XLARGE';
    default:
      return null;
  }
}
