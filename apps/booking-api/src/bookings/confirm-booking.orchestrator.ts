/**
 * ConfirmBookingOrchestrator
 *
 * Confirms a draft/held booking: assigns reference, clears hold, and sends
 * notifications. Mirrors previous behaviour from BookingsService.
 */
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { SequenceKey, BookingStatus, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { AvailabilityCoordinator } from './availability.coordinator';
import { BookingNotifier } from './booking.notifier';
import { calculateVatFromGross, nextSequence, formatBookingReference, resolveBookingReference } from './bookings.utils';
import { presentConfirmation } from './bookings.presenter';

type BookingWithServices = Prisma.BookingGetPayload<{
  include: {
    services: { include: { service: true; engineTier: true } };
    documents?: true;
  };
}>;

export class ConfirmBookingOrchestrator {
  private readonly logger = new Logger(ConfirmBookingOrchestrator.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly availability: AvailabilityCoordinator,
    private readonly notifier: BookingNotifier,
  ) {}

  async confirm(user: User, bookingId: number) {
    const vatRatePercent = Number((await this.settings.getSettings()).vatRatePercent);

    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, userId: user.id },
        include: {
          services: { include: { service: true, engineTier: true } },
          documents: true,
        },
      });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.status !== BookingStatus.DRAFT && booking.status !== BookingStatus.HELD) {
        throw new BadRequestException('Only draft bookings can be confirmed');
      }

      const services = booking.services;
      if (!services.length) throw new BadRequestException('Booking has no services attached');

      const totalAmountPence = services.reduce((sum, s) => sum + s.unitPricePence, 0);
      const vatAmountPence = calculateVatFromGross(totalAmountPence, vatRatePercent);

      let reference = booking.reference ?? null;
      if (!reference) {
        const sequence = await nextSequence(tx, SequenceKey.BOOKING_REFERENCE);
        reference = formatBookingReference(sequence.year, sequence.counter);
      }

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CONFIRMED,
          holdId: null,
          reference,
          documents: { deleteMany: {} },
        },
        include: {
          services: { include: { service: true, engineTier: true } },
          documents: true,
        },
      });

      return {
        booking: updatedBooking as BookingWithServices,
        holdId: booking.holdId ?? null,
        totalAmountPence,
        vatAmountPence,
      };
    });

    // Release hold if present (non-fatal)
    await this.availability.releaseHoldIfPresent(result.holdId);

    // Send notifications (non-fatal)
    try {
      await this.notifier.sendBookingConfirmation(result.booking, { totalAmountPence: result.totalAmountPence, vatAmountPence: result.vatAmountPence }, (b) => resolveBookingReference(b));
    } catch (err) {
      this.logger.error(`Failed to send booking confirmation emails for booking ${result.booking.id}`, (err as Error)?.stack ?? String(err));
    }

    return presentConfirmation(result.booking, { totalAmountPence: result.totalAmountPence, vatAmountPence: result.vatAmountPence });
  }
}

