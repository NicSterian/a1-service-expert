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
import { BookingStatus, Prisma, SequenceKey, User } from '@prisma/client';
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

// Extracted pure helpers (Phase 1).
import { normalizeEngineSize } from './bookings.helpers';
import { presentListItem, presentUserBooking, presentAdminBooking, presentConfirmation } from './bookings.presenter';
import { calculateVatFromGross, nextSequence, formatBookingReference, resolveBookingReference } from './bookings.utils';
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
import { ManualBookingCreator } from './manual-booking.creator';

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
  private manualBookingCreator: ManualBookingCreator | null = null;

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

  private getManualBookingCreator(): ManualBookingCreator {
    if (!this.manualBookingCreator) {
      this.manualBookingCreator = new ManualBookingCreator(
        this.prisma,
        this.settingsService,
        this.getAvailabilityCoordinator() as AvailabilityCoordinator,
        this.getBookingNotifier() as BookingNotifier,
      );
    }
    return this.manualBookingCreator;
  }

  async listBookingsForUser(user: User) {
    const bookings = await this.getBookingRepository().listForUser(user.id);

    return bookings.map((booking) => presentListItem(booking));
  }

  async getBookingForUser(user: User, bookingId: number) {
    const booking = await this.getBookingRepository().findForUser(bookingId, user.id);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return presentUserBooking(booking);
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
      }, (b) => resolveBookingReference(b));
    } catch (error) {
      this.logger.error(
        `Failed to send booking confirmation emails for booking ${result.booking.id}`,
        (error as Error)?.stack ?? String(error),
      );
    }

    return presentConfirmation(result.booking, {
      totalAmountPence: result.totalAmountPence,
      vatAmountPence: result.vatAmountPence,
    });
  }

  // normalizeEngineSize moved to bookings.helpers.ts (Phase 1)

  // calculateVatFromGross, nextSequence, formatBookingReference, and
  // resolveBookingReference moved to bookings.utils.ts (Step 2)

  // presentConfirmation moved to bookings.presenter.ts (Step 1)

  // presentDocument moved to bookings.helpers.ts (Phase 1)

  // buildDocumentSummary moved to DocumentOrchestrator (Phase 3)

  // computeServicesTotal inlined in presenter (Step 1)

  // sendConfirmationEmails moved to BookingNotifier (Phase 5)

  async getBookingForAdmin(bookingId: number) {
    const booking = await this.getBookingRepository().findByIdWithAdmin(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return presentAdminBooking(booking);
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
    return this.getManualBookingCreator().create(dto);
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

