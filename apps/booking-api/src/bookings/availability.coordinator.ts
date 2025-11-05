/**
 * AvailabilityCoordinator
 *
 * Encapsulates slot availability checks and hold lifecycle interactions.
 * Mirrors existing behaviour from BookingsService without changing
 * messages or control flow.
 */
import { ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HoldsService } from '../holds/holds.service';

export class AvailabilityCoordinator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly holds: HoldsService,
    private readonly logger: Logger,
  ) {}

  /**
   * Throws ConflictException if a booking already exists for the slot.
   */
  async assertSlotAvailable(slotDate: Date, slotTime: string): Promise<void> {
    const existing = await this.prisma.booking.findUnique({
      where: { slotDate_slotTime: { slotDate, slotTime } },
    });
    if (existing) {
      throw new ConflictException('Slot already booked');
    }
  }

  /**
   * Release a hold if present, logging (same message) on failure.
   */
  async releaseHoldIfPresent(holdId: string | null): Promise<void> {
    if (!holdId) return;
    try {
      await this.holds.releaseHold(holdId);
    } catch (error) {
      this.logger.warn(`Failed to release hold ${holdId}: ${(error as Error).message}`);
    }
  }
}

