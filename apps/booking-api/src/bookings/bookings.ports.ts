/**
 * Ports (interfaces) for Bookings delegates
 *
 * These lean interfaces enable dependency inversion without affecting the
 * current concrete implementations. Behavior and method signatures match
 * what BookingsService expects, with simple, precise types.
 */
import type { EngineTierCode } from '@a1/shared/pricing';
import type { ServicePricingMode, BookingStatus, Prisma } from '@prisma/client';

export type BookingWithServicesPort = Prisma.BookingGetPayload<{
  include: {
    services: { include: { service: true; engineTier: true } };
    documents?: true;
  };
}>;

export interface IPricingPolicy {
  resolveForService(params: {
    service: { id: number; pricingMode: ServicePricingMode; fixedPricePence: number | null };
    requestedEngineTierId: number | null;
    engineSizeCc: number | null;
  }): Promise<{ unitPricePence: number; resolvedEngineTierId: number | null; engineTierCode: EngineTierCode | null }>;
}

export interface IDocumentOrchestrator {
  issueInvoice(bookingId: number): Promise<void>;
  emailInvoice(bookingId: number): Promise<void>;
  createInvoiceDraft(bookingId: number): Promise<{ documentId: number; number: string | null }>;
  createQuoteDraft(bookingId: number): Promise<{ documentId: number; number: string | null }>;
}

export interface IAvailabilityCoordinator {
  assertSlotAvailable(slotDate: Date, slotTime: string): Promise<void>;
  releaseHoldIfPresent(holdId: string | null): Promise<void>;
}

export interface IBookingNotifier {
  sendBookingConfirmation(
    booking: BookingWithServicesPort,
    totals: { totalAmountPence: number; vatAmountPence: number },
    resolveReference: (b: BookingWithServicesPort) => string,
  ): Promise<void>;
}

export interface IAdminBookingManager {
  updateStatus(bookingId: number, status: BookingStatus): Promise<void>;
  updateInternalNotes(bookingId: number, internalNotes: string | null): Promise<void>;
  updatePaymentStatus(bookingId: number, paymentStatus: string | null): Promise<void>;
  updateCustomer(
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
  ): Promise<void>;
  updateVehicle(
    bookingId: number,
    dto: { registration?: string; make?: string; model?: string; engineSizeCc?: number | null },
  ): Promise<void>;
  updateServiceLine(
    bookingId: number,
    serviceLineId: number,
    dto: { unitPricePence?: number; engineTierId?: number | null; serviceId?: number },
  ): Promise<void>;
  softDelete(bookingId: number): Promise<void>;
  restore(bookingId: number): Promise<void>;
  hardDelete(bookingId: number): Promise<void>;
}
