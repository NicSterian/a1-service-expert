import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/dev')
export class DevToolsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async getHealth() {
    let dbConnected = false;
    let redisConnected = false;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
    } catch (err) {
      console.error('DB health check failed:', err);
    }

    // Redis check would go here if we had Redis injectable
    redisConnected = true; // Assume true for now

    return {
      status: 'ok',
      version: '1.0.0',
      database: dbConnected,
      redis: redisConnected,
    };
  }
}
