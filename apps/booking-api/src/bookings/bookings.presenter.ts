/**
 * Bookings presenters
 *
 * Pure mapping functions that shape Prisma booking records into API responses.
 * Behaviour lock: Do not change field names, value derivations, or ordering.
 */
import type { Prisma } from '@prisma/client';
import { DocumentType } from '@prisma/client';
import { mapEngineTierSortOrderToCode } from '@a1/shared/pricing';
import { presentDocument, normalizeEngineSize } from './bookings.helpers';

type BookingWithServices = Prisma.BookingGetPayload<{
  include: {
    services: { include: { service: true; engineTier: true } };
    documents?: true;
  };
}>;

type BookingWithDocsBasic = Prisma.BookingGetPayload<{
  include: {
    services: { include: { service: true; engineTier: true } };
    documents: true;
  };
}>;

/**
 * Present a booking item for user list view.
 */
export function presentListItem(booking: BookingWithDocsBasic) {
  const primaryService = booking.services[0] ?? null;
  const totalAmountPence = booking.services.reduce((sum, s) => sum + s.unitPricePence, 0);
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
}

/**
 * Present a single booking for user detail view.
 */
export function presentUserBooking(booking: BookingWithDocsBasic) {
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

  const totalAmountPence = services.reduce((sum, s) => sum + s.unitPricePence, 0);
  const invoiceDocument = booking.documents.find((d) => d.type === 'INVOICE') ?? null;

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

/**
 * Present admin view of a booking, including user summary and document list.
 */
type BookingWithDocsAdmin = Prisma.BookingGetPayload<{
  include: {
    services: { include: { service: true; engineTier: true } };
    documents: true;
    user: {
      select: {
        id: true;
        email: true;
        firstName: true;
        lastName: true;
        mobileNumber: true;
        landlineNumber: true;
      };
    };
  };
}>;

export function presentAdminBooking(booking: BookingWithDocsAdmin) {
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

  const servicesAmountPence = booking.services.reduce((sum, s) => sum + s.unitPricePence, 0);
  const latestInvoice = booking.documents
    .filter((doc) => doc.type === DocumentType.INVOICE)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;

  const statusHistory = [
    { status: booking.status, changedAt: booking.updatedAt.toISOString() },
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

/**
 * Present confirmation payload after confirming a booking.
 */
export function presentConfirmation(
  booking: BookingWithServices,
  totals: { totalAmountPence: number; vatAmountPence: number },
) {
  const primaryService = booking.services[0];
  const reference = booking.reference ?? formatBookingReference(new Date().getFullYear(), booking.id);
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
    documents: { invoice: null, quote: null },
  };
}

function formatBookingReference(year: number, counter: number): string {
  return `BK-A1-${year}-${counter.toString().padStart(4, '0')}`;
}
