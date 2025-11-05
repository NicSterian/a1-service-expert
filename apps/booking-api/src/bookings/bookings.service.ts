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
import { BookingSource, BookingStatus, SequenceKey, ServicePricingMode, User } from '@prisma/client';
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
import { normalizeEngineSize } from './bookings.helpers';
import { presentListItem, presentUserBooking, presentAdminBooking } from './bookings.presenter';
import { calculateVatFromGross, nextSequence, formatBookingReference, resolveBookingReference } from './bookings.utils';
// Pricing delegate (Phase 2).
import { PricingPolicy } from './pricing.policy';
// Document orchestrator (Phase 3).
import { DocumentOrchestrator } from './document.orchestrator';
import { ConfirmBookingOrchestrator } from './confirm-booking.orchestrator';
// Availability coordinator (Phase 4).
import { AvailabilityCoordinator } from './availability.coordinator';
// Booking notifier (Phase 5).
import { BookingNotifier } from './booking.notifier';
// Admin manager (Phase 6).
import { AdminBookingManager } from './admin-booking.manager';
// Booking repository (Phase 7).
import { BookingRepository } from './booking.repository';
import { BookingCreator } from './booking.creator';
// Ports (Phase 8).
import type {
  IPricingPolicy,
  IDocumentOrchestrator,
  IAvailabilityCoordinator,
  IBookingNotifier,
  IAdminBookingManager,
} from './bookings.ports';

// Note: BookingWithServices used by historical in-service confirm flow; confirm now delegated.
// Removed unused local type and ConfirmTransactionResult alias.

@Injectable()
export class BookingsService {
  // Service overview
  // - Customer flows: list/get, create (DRAFT), confirm (assign reference, notify)
  // - Admin flows: rich read, status/payment/notes updates, customer/vehicle edits,
  //   service-line edits, soft/restore/hard delete, document actions
  // - Delegates: PricingPolicy, AvailabilityCoordinator, BookingNotifier,
  //   DocumentOrchestrator, BookingRepository
  private readonly logger = new Logger(BookingsService.name);
  // Lazy delegates to avoid DI changes during refactor.
  private pricingPolicy: IPricingPolicy | null = null;
  private documentOrchestrator: IDocumentOrchestrator | null = null;
  private availabilityCoordinator: IAvailabilityCoordinator | null = null;
  private bookingNotifier: IBookingNotifier | null = null;
  private adminManager: IAdminBookingManager | null = null;
  private bookingRepository: BookingRepository | null = null;
  private bookingCreator: BookingCreator | null = null;
  private confirmBookingOrchestrator: ConfirmBookingOrchestrator | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly holdsService: HoldsService,
    private readonly emailService: EmailService,
    private readonly documentsService: DocumentsService,
    private readonly vehiclesService: VehiclesService,
    private readonly settingsService: SettingsService,
  ) {}

  // Delegates (lazy getters)
  // Keep DI surface stable while we extract collaborators incrementally.
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

  private getBookingCreator(): BookingCreator {
    if (!this.bookingCreator) {
      this.bookingCreator = new BookingCreator(
        this.prisma,
        this.getAvailabilityCoordinator() as AvailabilityCoordinator,
        this.getPricingPolicy() as PricingPolicy,
      );
    }
    return this.bookingCreator;
  }

  private getConfirmOrchestrator(): ConfirmBookingOrchestrator {
    if (!this.confirmBookingOrchestrator) {
      this.confirmBookingOrchestrator = new ConfirmBookingOrchestrator(
        this.prisma,
        this.settingsService,
        this.getAvailabilityCoordinator() as AvailabilityCoordinator,
        this.getBookingNotifier() as BookingNotifier,
      );
    }
    return this.confirmBookingOrchestrator;
  }

  // Customer API: list all bookings for current user
  async listBookingsForUser(user: User) {
    const bookings = await this.getBookingRepository().listForUser(user.id);

    return bookings.map((booking) => presentListItem(booking));
  }

  // Customer API: fetch a single booking for current user
  async getBookingForUser(user: User, bookingId: number) {
    const booking = await this.getBookingRepository().findForUser(bookingId, user.id);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return presentUserBooking(booking);
  }

  // Customer API: create a DRAFT booking record and attach service line
  async createBooking(user: User, dto: CreateBookingDto): Promise<{ bookingId: number }> {
    return this.getBookingCreator().create(user, dto);
  }
  async confirmBooking(user: User, bookingId: number) {
    return this.getConfirmOrchestrator().confirm(user, bookingId);
  }

  // normalizeEngineSize moved to bookings.helpers.ts (Phase 1)

  // calculateVatFromGross, nextSequence, formatBookingReference, and
  // resolveBookingReference moved to bookings.utils.ts (Step 2)

  // presentConfirmation moved to bookings.presenter.ts (Step 1)

  // presentDocument moved to bookings.helpers.ts (Phase 1)

  // buildDocumentSummary moved to DocumentOrchestrator (Phase 3)

  // computeServicesTotal inlined in presenter (Step 1)

  // sendConfirmationEmails moved to BookingNotifier (Phase 5)

  // Admin API: rich view of a booking with documents and shallow user profile
  async getBookingForAdmin(bookingId: number) {
    const booking = await this.getBookingRepository().findByIdWithAdmin(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return presentAdminBooking(booking);
  }

  // Admin API: update status (also releases holds when relevant)
  async adminUpdateStatus(bookingId: number, status: BookingStatus) {
    await this.getAdminManager().updateStatus(bookingId, status);
    return this.getBookingForAdmin(bookingId);
  }

  // Admin API: update internal notes
  async adminUpdateInternalNotes(bookingId: number, internalNotes: string | null) {
    await this.getAdminManager().updateInternalNotes(bookingId, internalNotes);
    return this.getBookingForAdmin(bookingId);
  }

  // Admin API: update payment status (UNPAID/PAID/PARTIAL/null)
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
  // Admin API: create a manual booking (delegate)
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
      const vatAmountPence = calculateVatFromGross(totalAmountPence, vatRatePercent);

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
        (b) => resolveBookingReference(b),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send confirmation emails for manual booking ${result.booking.id}`,
        (error as Error)?.stack ?? String(error),
      );
    }

    return {
      bookingId: result.booking.id,
      reference: result.booking.reference ?? resolveBookingReference(result.booking),
      status: result.booking.status,
      slotDate: result.booking.slotDate.toISOString(),
      slotTime: result.booking.slotTime,
    };
  }

  // Admin API: soft delete (mark as CANCELLED/DELETED)
  async adminSoftDeleteBooking(bookingId: number) {
    await this.getAdminManager().softDelete(bookingId);
    return this.getBookingForAdmin(bookingId);
  }

  // Admin API: restore (clear DELETED flag)
  async adminRestoreBooking(bookingId: number) {
    await this.getAdminManager().restore(bookingId);
    return this.getBookingForAdmin(bookingId);
  }

  // Admin API: hard delete cascade
  async adminHardDeleteBooking(bookingId: number) {
    await this.getAdminManager().hardDelete(bookingId);
  }

  // Admin API: update customer fields
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

  // Admin API: update vehicle fields
  async adminUpdateVehicle(
    bookingId: number,
    dto: { registration?: string; make?: string; model?: string; engineSizeCc?: number | null },
  ) {
    await this.getAdminManager().updateVehicle(bookingId, dto);
    return this.getBookingForAdmin(bookingId);
  }

  // Admin API: update unit price/engine tier/service for a line
  async adminUpdateServiceLine(
    bookingId: number,
    serviceLineId: number,
    dto: { unitPricePence?: number; engineTierId?: number | null; serviceId?: number },
  ) {
    await this.getAdminManager().updateServiceLine(bookingId, serviceLineId, dto);
    return this.getBookingForAdmin(bookingId);
  }
}

