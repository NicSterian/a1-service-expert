/**
 * AdminBookingManager
 *
 * Extracted admin-only mutations for bookings. Keeps validation, messages,
 * and side effects identical to previous in-service implementations.
 */
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HoldsService } from '../holds/holds.service';
import { normalisePostcode, sanitisePhone, sanitiseString } from '../common/utils/profile.util';

export class AdminBookingManager {
  constructor(
    private readonly prisma: PrismaService,
    private readonly holds: HoldsService,
    private readonly logger: Logger,
  ) {}

  /** Update booking status and handle hold release when applicable. */
  async updateStatus(bookingId: number, status: BookingStatus): Promise<void> {
    const allowed = new Set<BookingStatus>([
      BookingStatus.CONFIRMED,
      BookingStatus.CANCELLED,
      BookingStatus.COMPLETED,
      BookingStatus.NO_SHOW,
      BookingStatus.HELD,
    ]);
    if (!allowed.has(status)) {
      throw new BadRequestException('Status cannot be updated to the requested value.');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, holdId: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === status) return;

    const shouldReleaseHold =
      !!booking.holdId &&
      (status === BookingStatus.CANCELLED || status === BookingStatus.COMPLETED || status === BookingStatus.NO_SHOW);

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status, holdId: shouldReleaseHold ? null : booking.holdId },
    });

    if (shouldReleaseHold && booking.holdId) {
      try {
        await this.holds.releaseHold(booking.holdId);
      } catch (error) {
        this.logger.warn(
          `Failed to release hold ${booking.holdId} when updating booking ${bookingId}: ${(error as Error).message}`,
        );
      }
    }
  }

  /** Update internal notes. */
  async updateInternalNotes(bookingId: number, internalNotes: string | null): Promise<void> {
    const bookingExists = await this.prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true } });
    if (!bookingExists) throw new NotFoundException('Booking not found');
    const cleaned = sanitiseString(internalNotes ?? undefined);
    await this.prisma.booking.update({ where: { id: bookingId }, data: { internalNotes: cleaned } });
  }

  /** Update payment status (UNPAID/PAID/PARTIAL/null). */
  async updatePaymentStatus(bookingId: number, paymentStatus: string | null): Promise<void> {
    const allowed = new Set(['UNPAID', 'PAID', 'PARTIAL']);
    const normalized = paymentStatus ? paymentStatus.toUpperCase() : null;
    if (normalized && !allowed.has(normalized)) {
      throw new BadRequestException('Invalid payment status.');
    }
    const bookingExists = await this.prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true } });
    if (!bookingExists) throw new NotFoundException('Booking not found');
    await this.prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus: normalized } });
  }

  /** Update customer fields (sanitised). */
  async updateCustomer(
    bookingId: number,
    dto: {
      name?: string;
      email?: string;
      phone?: string;
      mobile?: string;
      landline?: string;
      company?: string;
      title?: string;
      firstName?: string;
      lastName?: string;
      addressLine1?: string;
      addressLine2?: string;
      addressLine3?: string;
      city?: string;
      county?: string;
      postcode?: string;
    },
  ): Promise<void> {
    const exists = await this.prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Booking not found');

    const data: Prisma.BookingUpdateInput = {};
    if (dto.name !== undefined) {
      const v = sanitiseString(dto.name);
      if (v !== null) data.customerName = v;
    }
    if (dto.email !== undefined) {
      const v = sanitiseString(dto.email);
      if (v !== null) data.customerEmail = v.toLowerCase();
    }
    if (dto.phone !== undefined) {
      const v = sanitisePhone(dto.phone);
      if (v !== null) data.customerPhone = v;
    }
    if (dto.mobile !== undefined) {
      const v = sanitisePhone(dto.mobile);
      if (v !== null) data.customerMobile = v;
    }
    if (dto.landline !== undefined) {
      const v = sanitisePhone(dto.landline);
      if (v !== null) data.customerLandline = v;
    }
    if (dto.company !== undefined) {
      const v = sanitiseString(dto.company);
      if (v !== null) data.customerCompany = v;
    }
    if (dto.title !== undefined) {
      const v = sanitiseString(dto.title);
      if (v !== null) data.customerTitle = v;
    }
    if (dto.firstName !== undefined) {
      const v = sanitiseString(dto.firstName);
      if (v !== null) data.customerFirstName = v;
    }
    if (dto.lastName !== undefined) {
      const v = sanitiseString(dto.lastName);
      if (v !== null) data.customerLastName = v;
    }
    if (dto.addressLine1 !== undefined) {
      const v = sanitiseString(dto.addressLine1);
      if (v !== null) data.customerAddressLine1 = v;
    }
    if (dto.addressLine2 !== undefined) {
      const v = sanitiseString(dto.addressLine2);
      if (v !== null) data.customerAddressLine2 = v;
    }
    if (dto.addressLine3 !== undefined) {
      const v = sanitiseString(dto.addressLine3);
      if (v !== null) data.customerAddressLine3 = v;
    }
    if (dto.city !== undefined) {
      const v = sanitiseString(dto.city);
      if (v !== null) data.customerCity = v;
    }
    if (dto.county !== undefined) {
      const v = sanitiseString(dto.county);
      if (v !== null) data.customerCounty = v;
    }
    if (dto.postcode !== undefined) {
      const v = normalisePostcode(dto.postcode);
      if (v !== null) data.customerPostcode = v;
    }

    await this.prisma.booking.update({ where: { id: bookingId }, data });
  }

  /** Update vehicle fields (sanitised). */
  async updateVehicle(
    bookingId: number,
    dto: { registration?: string; make?: string; model?: string; engineSizeCc?: number | null },
  ): Promise<void> {
    const exists = await this.prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Booking not found');

    const data: Prisma.BookingUpdateInput = {};
    if (dto.registration !== undefined) {
      const v = sanitiseString(dto.registration);
      if (v !== null) data.vehicleRegistration = v;
    }
    if (dto.make !== undefined) {
      const v = sanitiseString(dto.make);
      if (v !== null) data.vehicleMake = v;
    }
    if (dto.model !== undefined) {
      const v = sanitiseString(dto.model);
      if (v !== null) data.vehicleModel = v;
    }
    if (dto.engineSizeCc !== undefined) data.vehicleEngineSizeCc = dto.engineSizeCc;

    await this.prisma.booking.update({ where: { id: bookingId }, data });
  }

  /** Update a specific service line. */
  async updateServiceLine(
    bookingId: number,
    serviceLineId: number,
    dto: { unitPricePence?: number; engineTierId?: number | null; serviceId?: number },
  ): Promise<void> {
    const line = await this.prisma.bookingService.findUnique({ where: { id: serviceLineId } });
    if (!line || line.bookingId !== bookingId) {
      throw new NotFoundException('Service line not found for this booking');
    }

    const data: Prisma.BookingServiceUpdateInput = {};
    if (dto.unitPricePence !== undefined) data.unitPricePence = dto.unitPricePence;
    if (dto.engineTierId !== undefined)
      data.engineTier = dto.engineTierId ? { connect: { id: dto.engineTierId } } : { disconnect: true };
    if (dto.serviceId !== undefined) data.service = { connect: { id: dto.serviceId } };

    await this.prisma.bookingService.update({ where: { id: serviceLineId }, data });
  }

  /** Soft-delete by marking as CANCELLED/DELETED. */
  async softDelete(bookingId: number): Promise<void> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED, holdId: null, paymentStatus: 'DELETED' },
    });
  }

  /** Restore by clearing paymentStatus only (matches previous behaviour). */
  async restore(bookingId: number): Promise<void> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    await this.prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus: null } });
  }

  /** Hard delete booking and associated lines/documents in a transaction. */
  async hardDelete(bookingId: number): Promise<void> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.bookingService.deleteMany({ where: { bookingId } });
      await tx.document.deleteMany({ where: { bookingId } });
      await tx.booking.delete({ where: { id: bookingId } });
    });
  }
}
