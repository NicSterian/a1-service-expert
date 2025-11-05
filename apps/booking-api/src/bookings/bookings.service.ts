/**
 * BookingsService
 *
 * Facade for booking operations (customer + admin). This service currently
 * owns orchestration logic for pricing, availability, documents, email, and
 * persistence. Ongoing refactor extracts cohesive delegates while preserving
 * behavior and public method signatures.
 *
 * Behavior lock: Do not change field mappings, error messages, or sequencing
 * of side effects during refactors unless explicitly approved.
 */
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  BookingSource,
  BookingStatus,
  DocumentType,
  Prisma,
  SequenceKey,
  ServicePricingMode,
  User,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { DocumentsService } from '../documents/documents.service';
import { EmailService } from '../email/email.service';
import { HoldsService } from '../holds/holds.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { toUtcDate } from '../common/date-utils';
import { normalisePostcode, sanitisePhone, sanitiseString } from '../common/utils/profile.util';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateManualBookingDto } from '../admin/dto/create-manual-booking.dto';
import {
  EngineTierCode,
  mapEngineTierNameToCode,
  mapEngineTierSortOrderToCode,
} from '@a1/shared/pricing';

// Extracted pure helpers (Phase 1).
import { normalizeEngineSize, presentDocument } from './bookings.helpers';
// Pricing delegate (Phase 2).
import { PricingPolicy } from './pricing.policy';
// Document orchestrator (Phase 3).
import { DocumentOrchestrator } from './document.orchestrator';
// Availability coordinator (Phase 4).
import { AvailabilityCoordinator } from './availability.coordinator';
// Booking notifier (Phase 5).
import { BookingNotifier } from './booking.notifier';
// Admin manager (Phase 6).
import { AdminBookingManager } from './admin-booking.manager';
// Booking repository (Phase 7).
import { BookingRepository } from './booking.repository';
// Ports (Phase 8).
import type {
  IPricingPolicy,
  IDocumentOrchestrator,
  IAvailabilityCoordinator,
  IBookingNotifier,
  IAdminBookingManager,
} from './bookings.ports';

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
  holdId: string | null;
  totalAmountPence: number;
  vatAmountPence: number;
};

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
  // Lazy delegates to avoid DI changes during refactor.
  private pricingPolicy: IPricingPolicy | null = null;
  private documentOrchestrator: IDocumentOrchestrator | null = null;
  private availabilityCoordinator: IAvailabilityCoordinator | null = null;
  private bookingNotifier: IBookingNotifier | null = null;
  private adminManager: IAdminBookingManager | null = null;
  private bookingRepository: BookingRepository | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly holdsService: HoldsService,
    private readonly emailService: EmailService,
    private readonly documentsService: DocumentsService,
    private readonly vehiclesService: VehiclesService,
    private readonly settingsService: SettingsService,
  ) {}

  private getPricingPolicy(): IPricingPolicy {
    if (!this.pricingPolicy) {
      this.pricingPolicy = new PricingPolicy(this.prisma, this.vehiclesService, this.logger);
    }
    return this.pricingPolicy;
  }

  private getDocumentOrchestrator(): IDocumentOrchestrator {
    if (!this.documentOrchestrator) {
      this.documentOrchestrator = new DocumentOrchestrator(
        this.prisma,
        this.documentsService,
        this.settingsService,
        this.emailService,
        this.logger,
      );
    }
    return this.documentOrchestrator;
  }

  private getAvailabilityCoordinator(): IAvailabilityCoordinator {
    if (!this.availabilityCoordinator) {
      this.availabilityCoordinator = new AvailabilityCoordinator(this.prisma, this.holdsService, this.logger);
    }
    return this.availabilityCoordinator;
  }

  private getBookingNotifier(): IBookingNotifier {
    if (!this.bookingNotifier) {
      this.bookingNotifier = new BookingNotifier(this.prisma, this.emailService);
    }
    return this.bookingNotifier;
  }

  private getAdminManager(): IAdminBookingManager {
    if (!this.adminManager) {
      this.adminManager = new AdminBookingManager(this.prisma, this.holdsService, this.logger);
    }
    return this.adminManager;
  }

  private getBookingRepository(): BookingRepository {
    if (!this.bookingRepository) {
      this.bookingRepository = new BookingRepository(this.prisma);
    }
    return this.bookingRepository;
  }

  async listBookingsForUser(user: User) {
    const bookings = await this.getBookingRepository().listForUser(user.id);

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

  async getBookingForUser(user: User, bookingId: number) {
    const booking = await this.getBookingRepository().findForUser(bookingId, user.id);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const services = booking.services.map((service) => {
      const engineTier = service.engineTier
        ? {
            id: service.engineTier.id,
            name: service.engineTier.name,
            sortOrder: service.engineTier.sortOrder,
            code: mapEngineTierSortOrderToCode(service.engineTier.sortOrder),
          }
        : null;

      return {
        id: service.id,
        name: service.service.name ?? 'Service',
        description: service.service.description ?? null,
        pricingMode: service.service.pricingMode,
        serviceCode: service.service.code ?? null,
        engineTier,
        unitPricePence: service.unitPricePence,
      };
    });

    const totalAmountPence = services.reduce((sum, service) => sum + service.unitPricePence, 0);

    const invoiceDocument = booking.documents.find((doc) => doc.type === 'INVOICE') ?? null;

    return {
      id: booking.id,
      status: booking.status,
      source: booking.source,
      slotDate: booking.slotDate.toISOString(),
      slotTime: booking.slotTime,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      holdId: booking.holdId ?? null,
      acceptedTermsAt: booking.acceptedTermsAt ? booking.acceptedTermsAt.toISOString() : null,
      notes: booking.notes ?? null,
      totals: {
        servicesAmountPence: totalAmountPence,
        invoiceAmountPence: invoiceDocument?.totalAmountPence ?? null,
        invoiceVatAmountPence: invoiceDocument?.vatAmountPence ?? null,
      },
      customer: {
        title: booking.customerTitle ?? null,
        firstName: booking.customerFirstName ?? null,
        lastName: booking.customerLastName ?? null,
        companyName: booking.customerCompany ?? null,
        email: booking.customerEmail,
        mobileNumber: booking.customerMobile ?? booking.customerPhone,
        landlineNumber: booking.customerLandline ?? null,
        addressLine1: booking.customerAddressLine1 ?? null,
        addressLine2: booking.customerAddressLine2 ?? null,
        addressLine3: booking.customerAddressLine3 ?? null,
        city: booking.customerCity ?? null,
        county: booking.customerCounty ?? null,
        postcode: booking.customerPostcode ?? null,
      },
      vehicle: {
        registration: booking.vehicleRegistration,
        make: booking.vehicleMake ?? null,
        model: booking.vehicleModel ?? null,
        engineSizeCc: normalizeEngineSize(booking.vehicleEngineSizeCc),
      },
      services,
      documents: booking.documents.map((doc) => presentDocument(doc)),
    };
  }

  async createBooking(user: User, dto: CreateBookingDto): Promise<{ bookingId: number }> {
    const vehicleRegistration = dto.vehicle?.vrm?.trim().toUpperCase();
    if (!vehicleRegistration) {
      throw new BadRequestException('Vehicle registration is required.');
    }

    const slotDate = toUtcDate(dto.date);

    await this.getAvailabilityCoordinator().assertSlotAvailable(slotDate, dto.time);

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

    const normalizedEngineSize = normalizeEngineSize(dto.vehicle?.engineSizeCc);
    const requestedEngineTierId = dto.engineTierId ?? null;
    const { unitPricePence, resolvedEngineTierId, engineTierCode } = await this.getPricingPolicy().resolveForService({
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

      let reference = booking.reference ?? null;
      if (!reference) {
        const sequence = await this.nextSequence(tx, SequenceKey.BOOKING_REFERENCE);
        reference = this.formatBookingReference(sequence.year, sequence.counter);
      }

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CONFIRMED,
          holdId: null,
          reference,
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

      const holdId = booking.holdId ?? null;

      return {
        booking: updatedBooking,
        holdId,
        totalAmountPence,
        vatAmountPence,
      };
    });

    await this.getAvailabilityCoordinator().releaseHoldIfPresent(result.holdId);

    try {
      await this.getBookingNotifier().sendBookingConfirmation(result.booking, {
        totalAmountPence: result.totalAmountPence,
        vatAmountPence: result.vatAmountPence,
      }, (b) => this.resolveBookingReference(b));
    } catch (error) {
      this.logger.error(
        `Failed to send booking confirmation emails for booking ${result.booking.id}`,
        (error as Error)?.stack ?? String(error),
      );
    }

    return this.presentConfirmation(result.booking, {
      totalAmountPence: result.totalAmountPence,
      vatAmountPence: result.vatAmountPence,
    });
  }

  // normalizeEngineSize moved to bookings.helpers.ts (Phase 1)

  private calculateVatFromGross(totalAmountPence: number, vatRatePercent: number): number {
    if (!Number.isFinite(vatRatePercent) || vatRatePercent <= 0) {
      return 0;
    }

    const vatRate = vatRatePercent / 100;
    return Math.round(totalAmountPence * (vatRate / (1 + vatRate)));
  }

  private async nextSequence(
    client: PrismaService | Prisma.TransactionClient,
    key: SequenceKey,
  ): Promise<{ year: number; counter: number }> {
    const year = new Date().getFullYear();
    const sequence = await client.sequence.upsert({
      where: { key_year: { key, year } },
      update: { counter: { increment: 1 } },
      create: { key, year, counter: 1 },
    });

    return { year, counter: sequence.counter };
  }

  private formatBookingReference(year: number, counter: number): string {
    return `BK-A1-${year}-${counter.toString().padStart(4, '0')}`;
  }

  private resolveBookingReference(booking: BookingWithServices): string {
    if (booking.reference) {
      return booking.reference;
    }
    return this.formatBookingReference(new Date().getFullYear(), booking.id);
  }

  private presentConfirmation(
    booking: BookingWithServices,
    totals: { totalAmountPence: number; vatAmountPence: number },
  ) {
    const primaryService = booking.services[0];
    const reference = booking.reference ?? this.formatBookingReference(new Date().getFullYear(), booking.id);

    return {
      reference,
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
        invoice: null,
        quote: null,
      },
    };
  }

  // presentDocument moved to bookings.helpers.ts (Phase 1)

  // buildDocumentSummary moved to DocumentOrchestrator (Phase 3)

  private computeServicesTotal(booking: { services: { unitPricePence: number }[] }): number {
    return booking.services.reduce((sum, service) => sum + service.unitPricePence, 0);
  }

  // sendConfirmationEmails moved to BookingNotifier (Phase 5)

  async getBookingForAdmin(bookingId: number) {
    const booking = await this.getBookingRepository().findByIdWithAdmin(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const services = booking.services.map((service) => ({
      id: service.id,
      serviceId: service.serviceId,
      serviceName: service.service?.name ?? null,
      serviceCode: service.service?.code ?? null,
      pricingMode: service.service?.pricingMode ?? null,
      engineTierId: service.engineTierId,
      engineTierName: service.engineTier?.name ?? null,
      unitPricePence: service.unitPricePence,
    }));

    const servicesAmountPence = booking.services.reduce((sum, service) => sum + service.unitPricePence, 0);

    const invoiceDocuments = booking.documents.filter((doc) => doc.type === DocumentType.INVOICE);
    const latestInvoice = invoiceDocuments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;

    const statusHistory = [
      {
        status: booking.status,
        changedAt: booking.updatedAt.toISOString(),
      },
    ];

    return {
      id: booking.id,
      status: booking.status,
      source: booking.source,
      paymentStatus: booking.paymentStatus ?? null,
      internalNotes: booking.internalNotes ?? null,
      notes: booking.notes ?? null,
      slotDate: booking.slotDate.toISOString(),
      slotTime: booking.slotTime,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      holdId: booking.holdId ?? null,
      services,
      customer: {
        name: booking.customerName,
        email: booking.customerEmail,
        phone: booking.customerPhone,
        mobile: booking.customerMobile,
        landline: booking.customerLandline,
        company: booking.customerCompany,
        title: booking.customerTitle,
        firstName: booking.customerFirstName,
        lastName: booking.customerLastName,
        addressLine1: booking.customerAddressLine1,
        addressLine2: booking.customerAddressLine2,
        addressLine3: booking.customerAddressLine3,
        city: booking.customerCity,
        county: booking.customerCounty,
        postcode: booking.customerPostcode,
        wantsSmsReminder: booking.wantsSmsReminder,
        profile: booking.user,
      },
      vehicle: {
        registration: booking.vehicleRegistration,
        make: booking.vehicleMake,
        model: booking.vehicleModel,
        engineSizeCc: booking.vehicleEngineSizeCc,
      },
      totals: {
        servicesAmountPence,
        invoiceAmountPence: latestInvoice?.totalAmountPence ?? null,
        invoiceVatAmountPence: latestInvoice?.vatAmountPence ?? null,
      },
      documents: booking.documents
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((document) => ({
          id: document.id,
          type: document.type,
          status: document.status,
          number: document.number,
          totalAmountPence: document.totalAmountPence,
          vatAmountPence: document.vatAmountPence,
          pdfUrl: document.pdfUrl,
          issuedAt: document.issuedAt ? document.issuedAt.toISOString() : null,
          dueAt: document.dueAt ? document.dueAt.toISOString() : null,
          createdAt: document.createdAt.toISOString(),
          updatedAt: document.updatedAt.toISOString(),
        })),
      statusHistory,
    };
  }

  async adminUpdateStatus(bookingId: number, status: BookingStatus) {
    await this.getAdminManager().updateStatus(bookingId, status);
    return this.getBookingForAdmin(bookingId);
  }

  async adminUpdateInternalNotes(bookingId: number, internalNotes: string | null) {
    await this.getAdminManager().updateInternalNotes(bookingId, internalNotes);
    return this.getBookingForAdmin(bookingId);
  }

  async adminUpdatePaymentStatus(bookingId: number, paymentStatus: string | null) {
    await this.getAdminManager().updatePaymentStatus(bookingId, paymentStatus);
    return this.getBookingForAdmin(bookingId);
  }

  async adminIssueInvoice(bookingId: number) {
    await this.getDocumentOrchestrator().issueInvoice(bookingId);
    return this.getBookingForAdmin(bookingId);
  }

  async adminEmailInvoice(bookingId: number) {
    await this.getDocumentOrchestrator().emailInvoice(bookingId);
    return this.getBookingForAdmin(bookingId);
  }

  /**
   * Create an invoice draft from a booking (manual flow)
   */
  async adminCreateInvoiceDraft(bookingId: number) {
    return this.getDocumentOrchestrator().createInvoiceDraft(bookingId);
  }

  /**
   * Create a quote draft from a booking (manual flow)
   */
  async adminCreateQuoteDraft(bookingId: number) {
    return this.getDocumentOrchestrator().createQuoteDraft(bookingId);
  }

  /**
   * Create a manual booking (admin/staff only)
   * Bypasses hold system, creates user if needed, sets source to MANUAL
   */
  async createManualBooking(dto: CreateManualBookingDto) {
    const settings = await this.settingsService.getSettings();
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
      // CUSTOM mode
      if (!dto.scheduling.customDate) {
        throw new BadRequestException('customDate required for CUSTOM mode');
      }
      const customDateTime = new Date(dto.scheduling.customDate);
      slotDate = toUtcDate(customDateTime.toISOString().split('T')[0]);
      slotTime = customDateTime.toISOString().split('T')[1].substring(0, 5); // HH:mm
    }

    // Check slot availability (only if SLOT mode)
    if (dto.scheduling.mode === 'SLOT') {
      await this.getAvailabilityCoordinator().assertSlotAvailable(slotDate, slotTime);
    }

    // Validate and resolve services
    if (!dto.services.length) {
      throw new BadRequestException('At least one service is required');
    }

    const serviceItem = dto.services[0]; // Currently only supporting one service
    const service = await this.prisma.service.findUnique({
      where: { id: serviceItem.serviceId },
    });

    if (!service || !service.isActive) {
      throw new BadRequestException('Selected service is not available');
    }

    const serviceCodeValue = service.code?.trim();
    if (!serviceCodeValue) {
      throw new BadRequestException('Selected service is not available');
    }

    // Determine pricing
    let unitPricePence: number;
    let resolvedEngineTierId: number | null = null;
    let engineTierCode: EngineTierCode | null = null;

    // If price override is provided, use it
    if (serviceItem.priceOverridePence !== undefined && serviceItem.priceOverridePence !== null) {
      unitPricePence = serviceItem.priceOverridePence;
    } else if (service.pricingMode === ServicePricingMode.FIXED) {
      if (typeof service.fixedPricePence !== 'number' || service.fixedPricePence <= 0) {
        throw new BadRequestException('Service pricing is not configured correctly');
      }
      unitPricePence = service.fixedPricePence;
    } else {
      // TIERED pricing
      if (!serviceItem.engineTierId) {
        throw new BadRequestException('Engine tier is required for tiered services');
      }

      const servicePrice = await this.prisma.servicePrice.findUnique({
        where: {
          serviceId_engineTierId: {
            serviceId: serviceItem.serviceId,
            engineTierId: serviceItem.engineTierId,
          },
        },
        include: { engineTier: true },
      });

      if (!servicePrice) {
        throw new BadRequestException('Service pricing is not configured correctly');
      }

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
      user = await this.prisma.user.findUnique({
        where: { email: customerEmail },
      });
    }

    // If no user found and no email, create a guest user with a random password hash
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

    // Normalize vehicle registration
    const vehicleRegistration = dto.vehicle.registration.trim().toUpperCase();
    const normalizedEngineSize = normalizeEngineSize(dto.vehicle.engineSizeCc);

    // Prepare customer data
    const customerName = sanitiseString(dto.customer.name) ?? dto.customer.name.trim();
    const customerPhone = sanitisePhone(dto.customer.phone) ?? dto.customer.phone.trim();
    const addressLine1 = dto.customer.addressLine1 ? sanitiseString(dto.customer.addressLine1) : null;
    const customerCity = dto.customer.city ? sanitiseString(dto.customer.city) : null;
    const customerPostcode = dto.customer.postcode ? normalisePostcode(dto.customer.postcode) : null;

    // Create booking and related entities in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const sequence = await this.nextSequence(tx, SequenceKey.BOOKING_REFERENCE);
      const reference = this.formatBookingReference(sequence.year, sequence.counter);

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
          acceptedTermsAt: new Date(), // Manual bookings auto-accept terms
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

      // Calculate totals
      const totalAmountPence = unitPricePence;
      const vatAmountPence = this.calculateVatFromGross(totalAmountPence, vatRatePercent);

      return {
        booking: await tx.booking.findUnique({
          where: { id: booking.id },
          include: {
            services: {
              include: {
                service: true,
                engineTier: true,
              },
            },
            documents: true,
          },
        }),
        totalAmountPence,
        vatAmountPence,
      };
    });

    if (!result.booking) {
      throw new Error('Failed to create booking');
    }

    // Send confirmation emails (optional - can fail silently)
    try {
      await this.getBookingNotifier().sendBookingConfirmation(
        result.booking,
        {
          totalAmountPence: result.totalAmountPence,
          vatAmountPence: result.vatAmountPence,
        },
        (b) => this.resolveBookingReference(b),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send confirmation emails for manual booking ${result.booking.id}`,
        (error as Error)?.stack ?? String(error),
      );
    }

    return {
      bookingId: result.booking.id,
      reference: result.booking.reference ?? this.resolveBookingReference(result.booking),
      status: result.booking.status,
      slotDate: result.booking.slotDate.toISOString(),
      slotTime: result.booking.slotTime,
    };
  }

  async adminSoftDeleteBooking(bookingId: number) {
    await this.getAdminManager().softDelete(bookingId);
    return this.getBookingForAdmin(bookingId);
  }

  async adminRestoreBooking(bookingId: number) {
    await this.getAdminManager().restore(bookingId);
    return this.getBookingForAdmin(bookingId);
  }

  async adminHardDeleteBooking(bookingId: number) {
    await this.getAdminManager().hardDelete(bookingId);
  }

  async adminUpdateCustomer(
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
  ) {
    await this.getAdminManager().updateCustomer(bookingId, dto);
    return this.getBookingForAdmin(bookingId);
  }

  async adminUpdateVehicle(
    bookingId: number,
    dto: { registration?: string; make?: string; model?: string; engineSizeCc?: number | null },
  ) {
    await this.getAdminManager().updateVehicle(bookingId, dto);
    return this.getBookingForAdmin(bookingId);
  }

  async adminUpdateServiceLine(
    bookingId: number,
    serviceLineId: number,
    dto: { unitPricePence?: number; engineTierId?: number | null; serviceId?: number },
  ) {
    await this.getAdminManager().updateServiceLine(bookingId, serviceLineId, dto);
    return this.getBookingForAdmin(bookingId);
  }
}
/**
 * BookingsService
 *
 * Purpose
 * - Core domain service orchestrating booking lifecycle: availability checks,
 *   holds/reservations, creation, updates, cancellation, and completion.
 * - Integrates with pricing, vehicle metadata, notifications, and documents.
 *
 * Notes
 * - This file is large and mixes orchestration, validation, and persistence.
 * - Consider extracting focused collaborators to reduce surface area.
 *
 * Safe Refactor Plan (incremental)
 * 1) Extract availability/holds to AvailabilityCoordinator (pure service).
 * 2) Extract pricing computation to PricingGateway (wraps shared pricing).
 * 3) Extract notification triggers to BookingNotifier (integration glue).
 * 4) Extract document issuance to DocumentOrchestrator (issue/send).
 * 5) Leave repository calls and high-level flows in BookingsService.
 */
