import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Document, Prisma, User } from '@prisma/client';
import { DocumentSummary, DocumentsService } from '../documents/documents.service';
import { EmailService } from '../email/email.service';
import { HoldsService } from '../holds/holds.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { toUtcDate } from '../common/date-utils';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  EngineTierCode,
  ServiceCode,
  isServiceCode,
  mapEngineTierNameToCode,
  mapEngineTierSortOrderToCode,
} from '../../../../packages/shared/src/pricing';

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
    const vehicleRegistration = dto.vehicle?.vrm?.trim();
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

    const normalizedEngineSize = this.normalizeEngineSize(dto.vehicle?.engineSizeCc);
    const requestedEngineTierId = dto.engineTierId;
    let resolvedEngineTierId = requestedEngineTierId;

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

    let servicePrice = await this.prisma.servicePrice.findUnique({
      where: {
        serviceId_engineTierId: {
          serviceId: dto.serviceId,
          engineTierId: resolvedEngineTierId,
        },
      },
      include: {
        service: true,
        engineTier: true,
      },
    });

    if (!servicePrice && resolvedEngineTierId !== requestedEngineTierId) {
      servicePrice = await this.prisma.servicePrice.findUnique({
        where: {
          serviceId_engineTierId: {
            serviceId: dto.serviceId,
            engineTierId: requestedEngineTierId,
          },
        },
        include: {
          service: true,
          engineTier: true,
        },
      });

      if (servicePrice) {
        resolvedEngineTierId = servicePrice.engineTierId;
      }
    }
    if (!servicePrice) {
      throw new BadRequestException('Invalid service or engine tier selection.');
    }

    const serviceEntity = servicePrice.service;
    if (!isServiceCode(serviceEntity.code)) {
      throw new BadRequestException('Selected service is not available.');
    }
    const serviceCode: ServiceCode = serviceEntity.code;

    const tierEntity = servicePrice.engineTier;
    const engineTierCode: EngineTierCode | null =
      mapEngineTierNameToCode(tierEntity.name) ?? mapEngineTierSortOrderToCode(tierEntity.sortOrder);
    if (!engineTierCode) {
      throw new BadRequestException('Selected engine tier is not supported.');
    }

    const unitPricePence = servicePrice.amountPence;
    if (!Number.isFinite(unitPricePence)) {
      throw new BadRequestException('Service pricing is not configured correctly.');
    }

    const booking = await this.prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          userId: user.id,
          status: BookingStatus.DRAFT,
          slotDate,
          slotTime: dto.time,
          holdId: dto.holdId,
          customerName: dto.customer.name.trim(),
          customerEmail: dto.customer.email.trim(),
          customerPhone: dto.customer.phone.trim(),
          notes: dto.customer.notes,
          vehicleRegistration,
          vehicleMake: dto.vehicle.make?.trim(),
          vehicleModel: dto.vehicle.model?.trim(),
          vehicleEngineSizeCc: normalizedEngineSize ?? null,
          serviceCode,
          engineTierCode,
          servicePricePence: unitPricePence,
        },
      });

      await tx.bookingService.create({
        data: {
          bookingId: created.id,
          serviceId: servicePrice.serviceId,
          engineTierId: servicePrice.engineTierId,
          unitPricePence,
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
      customerEmail: booking.customerEmail,
      customerName: booking.customerName,
      slotDate: booking.slotDate,
      slotTime: booking.slotTime,
      serviceName: bookingService?.service.name ?? 'Service',
      engineTier: bookingService?.engineTier?.name,
      pricePence: totalAmountPence,
      invoiceNumber: invoice.number,
      invoiceUrl: invoice.pdfUrl,
      quoteNumber: quote.number,
      quoteUrl: quote.pdfUrl,
      adminRecipients: recipients.map((r) => r.email),
    });
  }
}
