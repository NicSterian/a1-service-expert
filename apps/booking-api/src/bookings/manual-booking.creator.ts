/**
 * ManualBookingCreator
 *
 * Creates manual bookings for admin/staff flow. Mirrors previous logic in
 * BookingsService without changing messages, sequencing, or outputs.
 */
import { BadRequestException } from '@nestjs/common';
import { BookingSource, ServicePricingMode, SequenceKey, BookingStatus, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { toUtcDate } from '../common/date-utils';
import { normalisePostcode, sanitisePhone, sanitiseString } from '../common/utils/profile.util';
import { normalizeEngineSize } from './bookings.helpers';
import { calculateVatFromGross, nextSequence, formatBookingReference, resolveBookingReference } from './bookings.utils';
import { BookingNotifier } from './booking.notifier';
import { AvailabilityCoordinator } from './availability.coordinator';
import type { CreateManualBookingDto } from '../admin/dto/create-manual-booking.dto';
import { mapEngineTierNameToCode, mapEngineTierSortOrderToCode, EngineTierCode } from '@a1/shared/pricing';

export class ManualBookingCreator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly availability: AvailabilityCoordinator,
    private readonly notifier: BookingNotifier,
  ) {}

  async create(dto: CreateManualBookingDto) {
    const settings = await this.settings.getSettings();
    const vatRatePercent = Number(settings.vatRatePercent);

    // Parse scheduling
    let slotDate: Date;
    let slotTime: string;
    if (dto.scheduling.mode === 'SLOT') {
      if (!dto.scheduling.slotDate || !dto.scheduling.slotTime) {
        throw new BadRequestException('slotDate and slotTime required for SLOT mode');
      }
      slotDate = toUtcDate(dto.scheduling.slotDate);
      slotTime = dto.scheduling.slotTime;
    } else {
      if (!dto.scheduling.customDate) {
        throw new BadRequestException('customDate required for CUSTOM mode');
      }
      const customDateTime = new Date(dto.scheduling.customDate);
      slotDate = toUtcDate(customDateTime.toISOString().split('T')[0]);
      slotTime = customDateTime.toISOString().split('T')[1].substring(0, 5);
    }

    // Availability only for SLOT mode
    if (dto.scheduling.mode === 'SLOT') {
      await this.availability.assertSlotAvailable(slotDate, slotTime);
    }

    // Validate and resolve services
    if (!dto.services.length) {
      throw new BadRequestException('At least one service is required');
    }
    const serviceItem = dto.services[0];
    const service = await this.prisma.service.findUnique({ where: { id: serviceItem.serviceId } });
    if (!service || !service.isActive) throw new BadRequestException('Selected service is not available');
    const serviceCodeValue = service.code?.trim();
    if (!serviceCodeValue) throw new BadRequestException('Selected service is not available');

    // Determine pricing
    let unitPricePence: number;
    let resolvedEngineTierId: number | null = null;
    let engineTierCode: EngineTierCode | null = null;
    if (serviceItem.priceOverridePence !== undefined && serviceItem.priceOverridePence !== null) {
      unitPricePence = serviceItem.priceOverridePence;
    } else if (service.pricingMode === ServicePricingMode.FIXED) {
      if (typeof service.fixedPricePence !== 'number' || service.fixedPricePence <= 0) {
        throw new BadRequestException('Service pricing is not configured correctly');
      }
      unitPricePence = service.fixedPricePence;
    } else {
      if (!serviceItem.engineTierId) {
        throw new BadRequestException('Engine tier is required for tiered services');
      }
      const servicePrice = await this.prisma.servicePrice.findUnique({
        where: { serviceId_engineTierId: { serviceId: serviceItem.serviceId, engineTierId: serviceItem.engineTierId } },
        include: { engineTier: true },
      });
      if (!servicePrice) throw new BadRequestException('Service pricing is not configured correctly');
      unitPricePence = servicePrice.amountPence;
      resolvedEngineTierId = servicePrice.engineTierId;
      const tierName = servicePrice.engineTier?.name ?? null;
      const tierSortOrder = servicePrice.engineTier?.sortOrder ?? null;
      engineTierCode = mapEngineTierNameToCode(tierName) ?? mapEngineTierSortOrderToCode(tierSortOrder);
    }

    // Find or create user by email
    const customerEmail = dto.customer.email?.trim().toLowerCase();
    let user: User | null = null;
    if (customerEmail) {
      user = await this.prisma.user.findUnique({ where: { email: customerEmail } });
    }
    if (!user) {
      const guestEmail = customerEmail || `guest-${Date.now()}-${Math.random().toString(36).substring(7)}@local.booking`;
      const randomPassword = `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const passwordHash = await bcrypt.hash(randomPassword, 12);
      user = await this.prisma.user.create({
        data: {
          email: guestEmail,
          passwordHash,
          firstName: dto.customer.name,
          mobileNumber: dto.customer.phone,
          emailVerified: true,
        },
      });
    }

    // Normalize vehicle and customer
    const vehicleRegistration = dto.vehicle.registration.trim().toUpperCase();
    const normalizedEngineSize = normalizeEngineSize(dto.vehicle.engineSizeCc);
    const customerName = sanitiseString(dto.customer.name) ?? dto.customer.name.trim();
    const customerPhone = sanitisePhone(dto.customer.phone) ?? dto.customer.phone.trim();
    const addressLine1 = dto.customer.addressLine1 ? sanitiseString(dto.customer.addressLine1) : null;
    const customerCity = dto.customer.city ? sanitiseString(dto.customer.city) : null;
    const customerPostcode = dto.customer.postcode ? normalisePostcode(dto.customer.postcode) : null;

    // Create booking and related entities in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const sequence = await nextSequence(tx, SequenceKey.BOOKING_REFERENCE);
      const reference = formatBookingReference(sequence.year, sequence.counter);

      const booking = await tx.booking.create({
        data: {
          userId: user!.id,
          status: BookingStatus.CONFIRMED,
          source: BookingSource.MANUAL,
          slotDate,
          slotTime,
          holdId: null,
          reference,
          customerName,
          customerEmail: customerEmail ?? user!.email,
          customerPhone,
          customerMobile: customerPhone,
          customerAddressLine1: addressLine1,
          customerCity,
          customerPostcode,
          vehicleRegistration,
          vehicleMake: dto.vehicle.make ? sanitiseString(dto.vehicle.make) : null,
          vehicleModel: dto.vehicle.model ? sanitiseString(dto.vehicle.model) : null,
          vehicleEngineSizeCc: normalizedEngineSize,
          serviceCode: serviceCodeValue,
          engineTierCode,
          servicePricePence: unitPricePence,
          notes: dto.internalNotes ? sanitiseString(dto.internalNotes) : null,
          acceptedTermsAt: new Date(),
        },
      });

      await tx.bookingService.create({
        data: {
          bookingId: booking.id,
          serviceId: service.id,
          engineTierId: resolvedEngineTierId ?? undefined,
          unitPricePence,
        },
      });

      const totalAmountPence = unitPricePence;
      const vatAmountPence = calculateVatFromGross(totalAmountPence, vatRatePercent);

      return {
        booking: await tx.booking.findUnique({
          where: { id: booking.id },
          include: {
            services: { include: { service: true, engineTier: true } },
            documents: true,
          },
        }),
        totalAmountPence,
        vatAmountPence,
      };
    });

    if (!result.booking) throw new Error('Failed to create booking');

    try {
      await this.notifier.sendBookingConfirmation(
        result.booking as import('./bookings.ports').BookingWithServicesPort,
        { totalAmountPence: result.totalAmountPence, vatAmountPence: result.vatAmountPence },
        (b) => resolveBookingReference(b),
      );
    } catch {
      // Keep previous behaviour: warn but do not fail the request
    }

    return {
      bookingId: result.booking.id,
      reference: result.booking.reference ?? resolveBookingReference(result.booking as import('./bookings.ports').BookingWithServicesPort),
      status: result.booking.status,
      slotDate: result.booking.slotDate.toISOString(),
      slotTime: result.booking.slotTime,
    };
  }
}
