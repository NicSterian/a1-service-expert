/**
 * BookingCreator
 *
 * Creates customer bookings (DRAFT). Mirrors previous logic from
 * BookingsService.createBooking without changing messages or outputs.
 */
import { BadRequestException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toUtcDate } from '../common/date-utils';
import { normalisePostcode, sanitisePhone, sanitiseString } from '../common/utils/profile.util';
import { normalizeEngineSize } from './bookings.helpers';
import type { CreateBookingDto } from './dto/create-booking.dto';
import { AvailabilityCoordinator } from './availability.coordinator';
import { PricingPolicy } from './pricing.policy';

export class BookingCreator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityCoordinator,
    private readonly pricing: PricingPolicy,
  ) {}

  async create(user: User, dto: CreateBookingDto): Promise<{ bookingId: number }> {
    const vehicleRegistration = dto.vehicle?.vrm?.trim().toUpperCase();
    if (!vehicleRegistration) {
      throw new BadRequestException('Vehicle registration is required.');
    }

    const slotDate = toUtcDate(dto.date);
    await this.availability.assertSlotAvailable(slotDate, dto.time);

    const service = await this.prisma.service.findUnique({ where: { id: dto.serviceId } });
    if (!service || !service.isActive) {
      throw new BadRequestException('Selected service is not available.');
    }

    const serviceCodeValue = service.code?.trim();
    if (!serviceCodeValue) {
      throw new BadRequestException('Selected service is not available.');
    }

    const normalizedEngineSize = normalizeEngineSize(dto.vehicle?.engineSizeCc);
    const requestedEngineTierId = dto.engineTierId ?? null;
    const { unitPricePence, resolvedEngineTierId, engineTierCode } = await this.pricing.resolveForService({
      service,
      requestedEngineTierId,
      engineSizeCc: normalizedEngineSize,
    });

    if (unitPricePence === null || !Number.isFinite(unitPricePence)) {
      throw new BadRequestException('Service pricing is not configured correctly.');
    }

    const customerTitleRaw = dto.customer.title?.trim();
    const customerTitle = customerTitleRaw ? customerTitleRaw.toUpperCase() : null;
    const customerFirstName = sanitiseString(dto.customer.firstName) ?? dto.customer.firstName.trim();
    const customerLastName = sanitiseString(dto.customer.lastName) ?? dto.customer.lastName.trim();
    const computedName = [customerTitle, customerFirstName, customerLastName]
      .filter((part) => part && part.length > 0)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const customerEmail = dto.customer.email.trim().toLowerCase();
    const customerCompany = sanitiseString(dto.customer.companyName);
    const customerMobile = sanitisePhone(dto.customer.mobileNumber) ?? dto.customer.mobileNumber.trim();
    const customerLandline = sanitisePhone(dto.customer.landlineNumber);
    const addressLine1 = sanitiseString(dto.customer.addressLine1) ?? dto.customer.addressLine1.trim();
    const addressLine2 = sanitiseString(dto.customer.addressLine2);
    const addressLine3 = sanitiseString(dto.customer.addressLine3);
    const customerCity = sanitiseString(dto.customer.city) ?? dto.customer.city.trim();
    const customerCounty = sanitiseString(dto.customer.county) ?? dto.customer.county?.trim() ?? null;
    const customerPostcode = normalisePostcode(dto.customer.postcode);
    const marketingOptIn = dto.customer.marketingOptIn ?? false;
    const acceptedTermsAt = dto.customer.acceptedTerms ? new Date() : null;
    const bookingNotes = sanitiseString(dto.bookingNotes);

    const booking = await this.prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          userId: user.id,
          status: BookingStatus.DRAFT,
          slotDate,
          slotTime: dto.time,
          holdId: dto.holdId,
          customerName: computedName || `${customerFirstName} ${customerLastName}`.trim(),
          customerTitle,
          customerFirstName,
          customerLastName,
          customerCompany,
          customerEmail,
          customerPhone: customerMobile,
          customerMobile,
          customerLandline: customerLandline ?? null,
          customerAddressLine1: addressLine1,
          customerAddressLine2: addressLine2,
          customerAddressLine3: addressLine3,
          customerCity,
          customerCounty,
          customerPostcode,
          wantsSmsReminder: marketingOptIn,
          acceptedTermsAt,
          notes: bookingNotes,
          vehicleRegistration,
          vehicleMake: sanitiseString(dto.vehicle.make),
          vehicleModel: sanitiseString(dto.vehicle.model),
          vehicleEngineSizeCc: normalizedEngineSize ?? null,
          serviceCode: serviceCodeValue,
          engineTierCode,
          servicePricePence: unitPricePence,
        },
      });

      await tx.bookingService.create({
        data: {
          bookingId: created.id,
          serviceId: service.id,
          engineTierId: resolvedEngineTierId ?? undefined,
          unitPricePence,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          title: customerTitle,
          firstName: customerFirstName,
          lastName: customerLastName,
          companyName: customerCompany,
          mobileNumber: customerMobile,
          landlineNumber: customerLandline ?? null,
          addressLine1,
          addressLine2,
          addressLine3,
          city: customerCity,
          county: customerCounty,
          postcode: customerPostcode,
          marketingOptIn,
          notes: bookingNotes,
          profileUpdatedAt: new Date(),
        },
      });

      return created;
    });

    return { bookingId: booking.id };
  }
}

