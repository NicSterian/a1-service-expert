import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminLookupsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('engine-tiers')
  async listEngineTiers() {
    const tiers = await this.prisma.engineTier.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return tiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      maxCc: tier.maxCc,
      sortOrder: tier.sortOrder,
    }));
  }
}

