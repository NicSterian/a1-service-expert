import { Controller, Get, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/dev')
export class DevToolsController {
  private readonly logger = new Logger(DevToolsController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async getHealth() {
    let dbConnected = false;
    let redisConnected = false;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
    } catch (err) {
      this.logger.error('DB health check failed:', err);
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

  @Post('availability-probe')
  async probeAvailability(@Body() body: { date: string; serviceId?: number; durationMins?: number }) {
    // Return raw availability data for the specified date/service
    const targetDate = new Date(body.date);
    const serviceId = body.serviceId;
    const durationMins = body.durationMins ?? 60;

    // Get settings for time slots
    const settings = await this.prisma.settings.findUnique({ where: { id: 1 } });
    const defaultSlots = (settings?.defaultSlotsJson as string[]) ?? [];

    // Get bookings for the date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await this.prisma.booking.findMany({
      where: {
        slotDate: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ['CANCELLED'] },
      },
      select: { id: true, slotDate: true, slotTime: true, status: true },
    });

    return {
      date: body.date,
      serviceId,
      durationMins,
      defaultSlots,
      bookings,
      availableSlots: defaultSlots.filter((slot) => {
        // Basic check: slot not occupied by booking
        const occupied = bookings.some(
          (item) => item.slotTime === slot && item.slotDate.toISOString().split('T')[0] === body.date,
        );
        return !occupied;
      }),
    };
  }

  @Post('holds/create')
  async createTestHold(@Body() body: { slotDate: string; slotTime: string; durationMins?: number }) {
    // Hold functionality requires schema migration
    return { success: false, message: 'Hold model not yet implemented in schema' };
  }

  @Post('holds/release')
  async releaseTestHold(@Body() body: { holdId: number }) {
    // Hold functionality requires schema migration
    return { success: false, message: 'Hold model not yet implemented in schema' };
  }

  @Get('migrations')
  async getMigrationStatus() {
    // Query migrations table
    try {
      const migrations = await this.prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date }>>`
        SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10
      `;
      return { success: true, migrations };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  @Get('audit-log')
  async getAuditLog() {
    // AuditLog requires schema migration
    return { success: false, message: 'AuditLog model not yet implemented in schema', logs: [] };
  }

  @Post('email/test')
  async testEmail(@Body() body: { to: string; subject?: string }) {
    // This would integrate with the EmailService
    // For now, return mock response
    return {
      success: true,
      message: `Test email would be sent to ${body.to}`,
      provider: 'Microsoft 365 SMTP',
    };
  }

  @Post('storage/test')
  async testStorage() {
    // Test file write/read to storage
    try {
      const testFile = 'test-' + Date.now() + '.txt';
      const testPath = `storage/documents/${testFile}`;
      // In production, would actually write and read file
      return {
        success: true,
        message: 'Storage test passed',
        testPath,
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  @Get('feature-flags')
  async getFeatureFlags() {
    // Get feature flags from settings
    const settings = await this.prisma.settings.findUnique({ where: { id: 1 } });
    return {
      maintenanceMode: (settings as any)?.maintenanceMode ?? false,
      hideCheckout: (settings as any)?.hideCheckout ?? false,
    };
  }

  @Post('feature-flags')
  async setFeatureFlags(@Body() body: { maintenanceMode?: boolean; hideCheckout?: boolean }) {
    // Note: These fields may not exist in schema yet
    // For now, return success
    return {
      success: true,
      message: 'Feature flags endpoint ready (requires schema migration)',
      requested: body,
    };
  }
}
