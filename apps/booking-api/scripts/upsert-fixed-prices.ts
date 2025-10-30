import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const services = await prisma.service.findMany();
  const tiers = await prisma.engineTier.findMany();

  const byCode = new Map(services.map((s) => [s.code!, s.id] as const));
  const tierId = new Map(tiers.map((t) => [t.name, t.id] as const));

  const table: Array<{ code: string; tier: string; pence: number }> = [
    { code: 'SERVICE_1', tier: 'Small', pence: 7995 },
    { code: 'SERVICE_1', tier: 'Medium', pence: 8995 },
    { code: 'SERVICE_1', tier: 'Large', pence: 9995 },
    { code: 'SERVICE_1', tier: 'Ex-Large', pence: 10995 },
    { code: 'SERVICE_2', tier: 'Small', pence: 11995 },
    { code: 'SERVICE_2', tier: 'Medium', pence: 12995 },
    { code: 'SERVICE_2', tier: 'Large', pence: 13995 },
    { code: 'SERVICE_2', tier: 'Ex-Large', pence: 15995 },
    { code: 'SERVICE_3', tier: 'Small', pence: 17995 },
    { code: 'SERVICE_3', tier: 'Medium', pence: 17995 },
    { code: 'SERVICE_3', tier: 'Large', pence: 19995 },
    { code: 'SERVICE_3', tier: 'Ex-Large', pence: 21995 },
  ];

  for (const row of table) {
    const sid = byCode.get(row.code);
    const tid = tierId.get(row.tier);
    if (!sid || !tid) continue;
    await prisma.servicePrice.upsert({
      where: { serviceId_engineTierId: { serviceId: sid, engineTierId: tid } },
      update: { amountPence: row.pence },
      create: { serviceId: sid, engineTierId: tid, amountPence: row.pence },
    });
  }

  console.log('Fixed menu prices upserted.');
}

run().finally(async () => {
  await prisma.$disconnect();
});

