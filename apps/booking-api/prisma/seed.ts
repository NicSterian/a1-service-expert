import 'dotenv/config';
import { Prisma, PrismaClient, SequenceKey } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const currentYear = new Date().getFullYear();

  const engineTiersSeed = [
    { name: 'Small', maxCc: 1200, sortOrder: 1 },
    { name: 'Medium', maxCc: 1600, sortOrder: 2 },
    { name: 'Large', maxCc: 2200, sortOrder: 3 },
    { name: 'Ex-Large', maxCc: null, sortOrder: 4 }
  ];

  for (const tier of engineTiersSeed) {
    await prisma.engineTier.upsert({
      where: { name: tier.name },
      update: {
        maxCc: tier.maxCc,
        sortOrder: tier.sortOrder
      },
      create: {
        name: tier.name,
        maxCc: tier.maxCc,
        sortOrder: tier.sortOrder
      }
    });
  }

  const servicesSeed = [
    {
      code: 'SERVICE_1',
      name: 'Service 1',
      description: 'Oil & Oil Filters - oil change, oil filter change, and check & top up of all fluid levels.',
      pricingMode: 'TIERED' as const,
      fixedPricePence: null,
      footnotes:
        '* Up to 5 litres of standard oil included. Certain oil types will incur an additional charge.\n* Additional costs for parts only and will not incur any labour charges.'
    },
    {
      code: 'SERVICE_2',
      name: 'Service 2',
      description:
        'Interim - includes SERVICE 1 plus air filter change, visual brake check, battery condition report, and full under body inspections.',
      pricingMode: 'TIERED' as const,
      fixedPricePence: null,
      footnotes:
        '* Up to 5 litres of standard oil included. Certain oil types will incur an additional charge.\n* Additional costs for parts only and will not incur any labour charges.'
    },
    {
      code: 'SERVICE_3',
      name: 'Service 3',
      description:
        'Full - includes SERVICE 2 plus cabin filter replacement, spark plug replacement (additional cost for platinum/iridium), full brake and disc check, and optional fuel filter replacement at parts cost.',
      pricingMode: 'TIERED' as const,
      fixedPricePence: null,
      footnotes:
        '* Up to 5 litres of standard oil included. Certain oil types will incur an additional charge.\n* Additional costs for parts only and will not incur any labour charges.'
    }
  ];

  for (const service of servicesSeed) {
    await prisma.service.upsert({
      where: { code: service.code },
      update: {
        name: service.name,
        description: service.description,
        pricingMode: service.pricingMode,
        fixedPricePence: service.fixedPricePence,
        footnotes: service.footnotes,
        isActive: true
      },
      create: {
        code: service.code,
        name: service.name,
        description: service.description,
        pricingMode: service.pricingMode,
        fixedPricePence: service.fixedPricePence,
        footnotes: service.footnotes,
        isActive: true
      }
    });
  }

  const tiers = await prisma.engineTier.findMany();
  const services = await prisma.service.findMany();

  const priceSeed: Array<{ serviceCode: string; tierName: string; amountPence: number }> = [
    { serviceCode: 'SERVICE_1', tierName: 'Small', amountPence: 7995 },
    { serviceCode: 'SERVICE_1', tierName: 'Medium', amountPence: 8995 },
    { serviceCode: 'SERVICE_1', tierName: 'Large', amountPence: 9995 },
    { serviceCode: 'SERVICE_1', tierName: 'Ex-Large', amountPence: 10995 },
    { serviceCode: 'SERVICE_2', tierName: 'Small', amountPence: 11995 },
    { serviceCode: 'SERVICE_2', tierName: 'Medium', amountPence: 12995 },
    { serviceCode: 'SERVICE_2', tierName: 'Large', amountPence: 13995 },
    { serviceCode: 'SERVICE_2', tierName: 'Ex-Large', amountPence: 15995 },
    { serviceCode: 'SERVICE_3', tierName: 'Small', amountPence: 17995 },
    { serviceCode: 'SERVICE_3', tierName: 'Medium', amountPence: 17995 },
    { serviceCode: 'SERVICE_3', tierName: 'Large', amountPence: 19995 },
    { serviceCode: 'SERVICE_3', tierName: 'Ex-Large', amountPence: 21995 }
  ];

  for (const price of priceSeed) {
    const service = services.find((s) => s.code === price.serviceCode);
    const tier = tiers.find((t) => t.name === price.tierName);
    if (!service || !tier) {
      throw new Error(`Missing service or tier for price seed: ${price.serviceCode} - ${price.tierName}`);
    }

    await prisma.servicePrice.upsert({
      where: {
        serviceId_engineTierId: {
          serviceId: service.id,
          engineTierId: tier.id
        }
      },
      update: {
        amountPence: price.amountPence
      },
      create: {
        serviceId: service.id,
        engineTierId: tier.id,
        amountPence: price.amountPence
      }
    });
  }

  const settingsData = {
    id: 1,
    companyName: 'A1 Service Expert',
    vatRatePercent: new Prisma.Decimal('20.00'),
    timezone: 'Europe/London',
    defaultSlotsJson: ['09:00', '10:00', '11:00'] as Prisma.JsonArray,
    bankHolidayRegion: 'England & Wales',
    logoUrl: '/admin/settings/logo/logo.webp',
    holdMinutes: 10,
    captchaEnabled: true,
    captchaRequireInDev: false,
    vrmLookupRateLimitPerMinute: 10,
    signupRateLimitPerHour: 5,
    bookingConfirmRateLimitPerDay: 5,
    dvlaApiKey: process.env.DVLA_API_KEY ?? null,
    dvlaApiKeyEnc: null as string | null,
    dvlaApiKeyIv: null as string | null,
    dvlaApiKeyTag: null as string | null
  };

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      companyName: settingsData.companyName,
      vatRatePercent: settingsData.vatRatePercent,
      timezone: settingsData.timezone,
      defaultSlotsJson: settingsData.defaultSlotsJson,
      bankHolidayRegion: settingsData.bankHolidayRegion,
      logoUrl: settingsData.logoUrl,
      holdMinutes: settingsData.holdMinutes,
      captchaEnabled: settingsData.captchaEnabled,
      captchaRequireInDev: settingsData.captchaRequireInDev,
      vrmLookupRateLimitPerMinute: settingsData.vrmLookupRateLimitPerMinute,
      signupRateLimitPerHour: settingsData.signupRateLimitPerHour,
      bookingConfirmRateLimitPerDay: settingsData.bookingConfirmRateLimitPerDay,
      dvlaApiKey: settingsData.dvlaApiKey,
      dvlaApiKeyEnc: settingsData.dvlaApiKeyEnc,
      dvlaApiKeyIv: settingsData.dvlaApiKeyIv,
      dvlaApiKeyTag: settingsData.dvlaApiKeyTag
    },
    create: {
      id: settingsData.id,
      companyName: settingsData.companyName,
      vatRatePercent: settingsData.vatRatePercent,
      timezone: settingsData.timezone,
      defaultSlotsJson: settingsData.defaultSlotsJson,
      bankHolidayRegion: settingsData.bankHolidayRegion,
      logoUrl: settingsData.logoUrl,
      holdMinutes: settingsData.holdMinutes,
      captchaEnabled: settingsData.captchaEnabled,
      captchaRequireInDev: settingsData.captchaRequireInDev,
      vrmLookupRateLimitPerMinute: settingsData.vrmLookupRateLimitPerMinute,
      signupRateLimitPerHour: settingsData.signupRateLimitPerHour,
      bookingConfirmRateLimitPerDay: settingsData.bookingConfirmRateLimitPerDay,
      dvlaApiKey: settingsData.dvlaApiKey,
      dvlaApiKeyEnc: settingsData.dvlaApiKeyEnc,
      dvlaApiKeyIv: settingsData.dvlaApiKeyIv,
      dvlaApiKeyTag: settingsData.dvlaApiKeyTag
    }
  });

  await prisma.notificationRecipient.upsert({
    where: { email: 'denilsonnick@yahoo.com' },
    update: {},
    create: {
      email: 'denilsonnick@yahoo.com'
    }
  });

  const sequences: Array<{ key: SequenceKey; year: number }> = [
    { key: SequenceKey.INVOICE, year: currentYear },
    { key: SequenceKey.QUOTE, year: currentYear }
  ];

  for (const sequence of sequences) {
    await prisma.sequence.upsert({
      where: {
        key_year: {
          key: sequence.key,
          year: sequence.year
        }
      },
      update: {},
      create: {
        key: sequence.key,
        year: sequence.year,
        counter: 0
      }
    });
  }

  console.log('Database seeded successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });






