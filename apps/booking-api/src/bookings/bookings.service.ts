import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Document, Prisma, ServicePricingMode, User } from '@prisma/client';
import { DocumentSummary, DocumentsService } from '../documents/documents.service';
import { EmailService } from '../email/email.service';
import { HoldsService } from '../holds/holds.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { toUtcDate } from '../common/date-utils';
import { normalisePostcode, sanitisePhone, sanitiseString } from '../common/utils/profile.util';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  EngineTierCode,
  mapEngineTierNameToCode,
  mapEngineTierSortOrderToCode,
} from '@a1/shared/pricing';

type BookingWithServices = Prisma.BookingGetPayload<{
  include: {
    services: {
      include: {
        service: true;
        engineTier: true;
      };
    };
    documents?: true;
  };
}>;

type ConfirmTransactionResult = {
  booking: BookingWithServices;
  invoice: Document;
  quote: Document;
  holdId: string | null;
  totalAmountPence: number;
  vatAmountPence: number;
};

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly holdsService: HoldsService,
    private readonly emailService: EmailService,
    private readonly documentsService: DocumentsService,
    private readonly vehiclesService: VehiclesService,
    private readonly settingsService: SettingsService,
  ) {}

  async listBookingsForUser(user: User) {
    const bookings = await this.prisma.booking.findMany({
      where: { userId: user.id },
      orderBy: [{ slotDate: 'desc' }, { slotTime: 'desc' }, { createdAt: 'desc' }],
      include: {
        services: {
          include: {
            service: true,
            engineTier: true,
          },
        },
        documents: true,
      },
    });

    return bookings.map((booking) => {
      const primaryService = booking.services[0] ?? null;
      const totalAmountPence = booking.services.reduce((sum, service) => sum + service.unitPricePence, 0);

      return {
        id: booking.id,
        status: booking.status,
        slotDate: booking.slotDate.toISOString(),
        slotTime: booking.slotTime,
        createdAt: booking.createdAt.toISOString(),
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        serviceName: primaryService?.service.name ?? null,
        engineTierName: primaryService?.engineTier?.name ?? null,
        totalAmountPence,
        holdId: booking.holdId,
        notes: booking.notes ?? null,
        documents: booking.documents.map((doc) => ({
          id: doc.id,
          type: doc.type,
          number: doc.number,
          status: doc.status,
          totalAmountPence: doc.totalAmountPence,
          vatAmountPence: doc.vatAmountPence,
          pdfUrl: doc.pdfUrl,
          validUntil: doc.validUntil ? doc.validUntil.toISOString() : null,
        })),
      };
    });
  }

  async createBooking(user: User, dto: CreateBookingDto): Promise<{ bookingId: number }> {
    const vehicleRegistration = dto.vehicle?.vrm?.trim().toUpperCase();
    if (!vehicleRegistration) {
      throw new BadRequestException('Vehicle registration is required.');
    }

    const slotDate = toUtcDate(dto.date);

    const existing = await this.prisma.booking.findUnique({
      where: { slotDate_slotTime: { slotDate, slotTime: dto.time } },
    });
    if (existing) {
      throw new ConflictException('Slot already booked');
    }

    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });
    if (!service || !service.isActive) {
      throw new BadRequestException('Selected service is not available.');
    }

    const serviceCodeValue = service.code?.trim();
    if (!serviceCodeValue) {
      throw new BadRequestException('Selected service is not available.');
    }

    const normalizedEngineSize = this.normalizeEngineSize(dto.vehicle?.engineSizeCc);
    const requestedEngineTierId = dto.engineTierId ?? null;
    let resolvedEngineTierId: number | null = requestedEngineTierId;
    let engineTierCode: EngineTierCode | null = null;
    let unitPricePence: number | null = null;

    if (service.pricingMode === ServicePricingMode.FIXED) {
      if (typeof service.fixedPricePence !== 'number' || service.fixedPricePence <= 0) {
        throw new BadRequestException('Service pricing is not configured correctly.');
      }
      unitPricePence = service.fixedPricePence;
      resolvedEngineTierId = null;
    } else {
      if (normalizedEngineSize) {
        try {
          const recommendation = await this.vehiclesService.getRecommendation(dto.serviceId, normalizedEngineSize);
          if (recommendation.engineTierId) {
            resolvedEngineTierId = recommendation.engineTierId;
          }
        } catch (error) {
          this.logger.warn(`Unable to determine engine tier automatically: ${(error as Error).message}`);
        }
      }

      let servicePrice: Prisma.ServicePriceGetPayload<{ include: { engineTier: true } }> | null = null;
      if (resolvedEngineTierId) {
        servicePrice = await this.prisma.servicePrice.findUnique({
          where: {
            serviceId_engineTierId: {
              serviceId: dto.serviceId,
              engineTierId: resolvedEngineTierId,
            },
          },
          include: {
            engineTier: true,
          },
        });
      }

      if (!servicePrice && requestedEngineTierId && requestedEngineTierId !== resolvedEngineTierId) {
        servicePrice = await this.prisma.servicePrice.findUnique({
          where: {
            serviceId_engineTierId: {
              serviceId: dto.serviceId,
              engineTierId: requestedEngineTierId,
            },
          },
          include: {
            engineTier: true,
          },
        });
      }

      if (!servicePrice) {
        servicePrice = await this.prisma.servicePrice.findFirst({
          where: { serviceId: dto.serviceId },
          orderBy: [{ amountPence: 'asc' }],
          include: { engineTier: true },
        });
      }

      if (!servicePrice) {
        throw new BadRequestException('Service pricing is not configured correctly.');
      }

      unitPricePence = servicePrice.amountPence;
      resolvedEngineTierId = servicePrice.engineTierId;

      const tierName = servicePrice.engineTier?.name ?? null;
      const tierSortOrder = servicePrice.engineTier?.sortOrder ?? null;
      engineTierCode = mapEngineTierNameToCode(tierName) ?? mapEngineTierSortOrderToCode(tierSortOrder);
    }

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
    const customerCounty = sanitiseString(dto.customer.county) ?? dto.customer.county.trim();
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

  async confirmBooking(user: User, bookingId: number) {
    const settings = await this.settingsService.getSettings();
    const vatRatePercent = Number(settings.vatRatePercent);

    const result = await this.prisma.$transaction<ConfirmTransactionResult>(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, userId: user.id },
        include: {
          services: {
            include: {
              service: true,
              engineTier: true,
            },
          },
          documents: true,
        },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.status !== BookingStatus.DRAFT && booking.status !== BookingStatus.HELD) {
        throw new BadRequestException('Only draft bookings can be confirmed');
      }

      const services = booking.services;
      if (!services.length) {
        throw new BadRequestException('Booking has no services attached');
      }

      const totalAmountPence = services.reduce((sum, service) => sum + service.unitPricePence, 0);
      const vatAmountPence = this.calculateVatFromGross(totalAmountPence, vatRatePercent);

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CONFIRMED,
          holdId: null,
          documents: {
            deleteMany: {},
          },
        },
        include: {
          services: {
            include: {
              service: true,
              engineTier: true,
            },
          },
          documents: true,
        },
      });

      const [invoice, quote] = await Promise.all([
        this.documentsService.issueInvoiceForBooking({
          bookingId: updatedBooking.id,
          totalAmountPence,
          vatAmountPence,
          tx,
        }),
        this.documentsService.issueQuoteForBooking({
          bookingId: updatedBooking.id,
          totalAmountPence,
          vatAmountPence,
          validUntil: this.computeQuoteValidUntil(),
          tx,
        }),
      ]);

      const holdId = booking.holdId ?? null;

      return {
        booking: updatedBooking,
        invoice,
        quote,
        holdId,
        totalAmountPence,
        vatAmountPence,
      };
    });

    if (result.holdId) {
      try {
        await this.holdsService.releaseHold(result.holdId);
      } catch (error) {
        this.logger.warn(`Failed to release hold ${result.holdId}: ${(error as Error).message}`);
      }
    }

    const bookingServiceItem = result.booking.services[0];
    const summary: DocumentSummary = {
      bookingId: result.booking.id,
      slotDate: result.booking.slotDate,
      slotTime: result.booking.slotTime,
      customerName: result.booking.customerName,
      customerEmail: result.booking.customerEmail,
      customerPhone: result.booking.customerPhone,
      serviceName: bookingServiceItem?.service.name ?? 'Service',
      engineTierName: bookingServiceItem?.engineTier?.name ?? null,
    };

    const [finalInvoice, finalQuote] = await Promise.all([
      this.documentsService.finalizeDocument(
        result.invoice,
        summary,
        {
          totalAmountPence: result.totalAmountPence,
          vatAmountPence: result.vatAmountPence,
        },
        settings,
      ),
      this.documentsService.finalizeDocument(
        result.quote,
        summary,
        {
          totalAmountPence: result.totalAmountPence,
          vatAmountPence: result.vatAmountPence,
        },
        settings,
      ),
    ]);

    await this.sendConfirmationEmails(result.booking, finalInvoice, finalQuote, result.totalAmountPence);

    return this.presentConfirmation(result.booking, finalInvoice, finalQuote, {
      totalAmountPence: result.totalAmountPence,
      vatAmountPence: result.vatAmountPence,
    });
  }

  private normalizeEngineSize(value?: number | null) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null;
    }
    const rounded = Math.round(value);
    return rounded > 0 ? rounded : null;
  }

  private calculateVatFromGross(totalAmountPence: number, vatRatePercent: number): number {
    if (!Number.isFinite(vatRatePercent) || vatRatePercent <= 0) {
      return 0;
    }

    const vatRate = vatRatePercent / 100;
    return Math.round(totalAmountPence * (vatRate / (1 + vatRate)));
  }

  private computeQuoteValidUntil(): Date {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 14);
    return validUntil;
  }

  private presentConfirmation(
    booking: BookingWithServices,
    invoice: Document,
    quote: Document,
    totals: { totalAmountPence: number; vatAmountPence: number },
  ) {
    const primaryService = booking.services[0];

    return {
      reference: invoice.number,
      booking: {
        id: booking.id,
        status: booking.status,
        slotDate: booking.slotDate.toISOString(),
        slotTime: booking.slotTime,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        serviceName: primaryService?.service.name ?? 'Service',
        engineTierName: primaryService?.engineTier?.name ?? null,
        totalAmountPence: totals.totalAmountPence,
        vatAmountPence: totals.vatAmountPence,
      },
      documents: {
        invoice: this.presentDocument(invoice),
        quote: this.presentDocument(quote),
      },
    };
  }

  private presentDocument(doc: Document) {
    return {
      id: doc.id,
      type: doc.type,
      number: doc.number,
      status: doc.status,
      totalAmountPence: doc.totalAmountPence,
      vatAmountPence: doc.vatAmountPence,
      pdfUrl: doc.pdfUrl,
      validUntil: doc.validUntil ? doc.validUntil.toISOString() : null,
    };
  }

  private async sendConfirmationEmails(
    booking: BookingWithServices,
    invoice: Document,
    quote: Document,
    totalAmountPence: number,
  ) {
    const bookingService = booking.services[0];
    const recipients = await this.prisma.notificationRecipient.findMany();

    await this.emailService.sendBookingConfirmation({
      bookingId: booking.id,
      slotDate: booking.slotDate,
      slotTime: booking.slotTime,
      service: {
        name: bookingService?.service.name ?? 'Service',
        engineTier: bookingService?.engineTier?.name ?? null,
      },
      totals: {
        pricePence: totalAmountPence,
      },
      vehicle: {
        registration: booking.vehicleRegistration,
        make: booking.vehicleMake,
        model: booking.vehicleModel,
        engineSizeCc: booking.vehicleEngineSizeCc,
      },
      customer: {
        email: booking.customerEmail,
        name: booking.customerName,
        title: booking.customerTitle,
        firstName: booking.customerFirstName,
        lastName: booking.customerLastName,
        companyName: booking.customerCompany,
        phone: booking.customerPhone,
        mobile: booking.customerMobile,
        landline: booking.customerLandline,
        addressLine1: booking.customerAddressLine1,
        addressLine2: booking.customerAddressLine2,
        addressLine3: booking.customerAddressLine3,
        city: booking.customerCity,
        county: booking.customerCounty,
        postcode: booking.customerPostcode,
        notes: booking.notes ?? null,
      },
      documents: {
        invoiceNumber: invoice.number,
        invoiceUrl: invoice.pdfUrl,
        quoteNumber: quote.number,
        quoteUrl: quote.pdfUrl,
      },
      adminRecipients: recipients.map((recipient) => recipient.email),
    });
  }
}


