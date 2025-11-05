/**
 * DocumentOrchestrator
 *
 * Orchestrates invoice/quote document creation, finalization, issuance,
 * and emailing for bookings. This mirrors existing behaviour from
 * BookingsService without changing messages, sequencing, or outputs.
 */
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { DocumentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService, type DocumentSummary } from '../documents/documents.service';
import { SettingsService } from '../settings/settings.service';
import { EmailService } from '../email/email.service';

// Note: BookingWithServices type is intentionally omitted for now to
// avoid unused symbol lint warnings. The orchestrator focuses on
// documents and uses the BookingWithDocuments type below.

type BookingWithDocuments = Prisma.BookingGetPayload<{
  include: {
    services: {
      include: { service: true; engineTier: true };
    };
    documents: true;
  };
}>;

export class DocumentOrchestrator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly settings: SettingsService,
    private readonly email: EmailService,
    private readonly logger: Logger,
  ) {}

  /** Present a concise summary for documents (customer/service info). */
  private buildDocumentSummary(booking: BookingWithDocuments): DocumentSummary {
    const primaryService = booking.services[0];
    return {
      bookingId: booking.id,
      slotDate: booking.slotDate,
      slotTime: booking.slotTime,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      serviceName: primaryService?.service.name ?? 'Service',
      engineTierName: primaryService?.engineTier?.name ?? null,
    };
  }

  private computeServicesTotal(booking: { services: { unitPricePence: number }[] }): number {
    return booking.services.reduce((sum, s) => sum + s.unitPricePence, 0);
  }

  private calculateVatFromGross(totalAmountPence: number, vatRatePercent: number): number {
    if (!Number.isFinite(vatRatePercent) || vatRatePercent <= 0) return 0;
    const vatRate = vatRatePercent / 100;
    return Math.round(totalAmountPence * (vatRate / (1 + vatRate)));
  }

  async issueInvoice(bookingId: number): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        services: { include: { service: true, engineTier: true } },
        documents: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (!booking.services.length) throw new BadRequestException('Booking has no services configured.');

    const typed = booking as BookingWithDocuments;
    const settings = await this.settings.getSettings();
    const vatRatePercent = Number(settings.vatRatePercent);
    const totalAmountPence = this.computeServicesTotal(typed);
    const vatAmountPence = this.calculateVatFromGross(totalAmountPence, vatRatePercent);

    let invoice = await this.documents.issueInvoiceForBooking({
      bookingId: booking.id,
      totalAmountPence,
      vatAmountPence,
    });

    invoice = await this.documents.finalizeDocument(
      invoice,
      this.buildDocumentSummary(typed),
      { totalAmountPence, vatAmountPence },
      settings,
    );

    if (!invoice.issuedAt) {
      await this.prisma.document.update({ where: { id: invoice.id }, data: { issuedAt: new Date() } });
    }
  }

  async emailInvoice(bookingId: number): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        services: { include: { service: true, engineTier: true } },
        documents: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (!booking.services.length) throw new BadRequestException('Booking has no services configured.');
    if (!booking.customerEmail) throw new BadRequestException('Booking does not have a customer email address.');

    const typed = booking as BookingWithDocuments;
    const totalAmountPence = this.computeServicesTotal(typed);

    let invoice = typed.documents
      .filter((d) => d.type === DocumentType.INVOICE)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (!invoice) throw new BadRequestException('No invoice found. Issue an invoice before emailing.');

    if (!invoice.pdfUrl || invoice.pdfUrl.startsWith('pending://')) {
      const settings = await this.settings.getSettings();
      const vatRatePercent = Number(settings.vatRatePercent);
      const vatAmountPence = this.calculateVatFromGross(totalAmountPence, vatRatePercent);
      invoice = await this.documents.finalizeDocument(
        invoice,
        this.buildDocumentSummary(typed),
        { totalAmountPence, vatAmountPence },
        settings,
      );
      if (!invoice.issuedAt) {
        await this.prisma.document.update({ where: { id: invoice.id }, data: { issuedAt: new Date() } });
      }
    }

    const recipients = await this.prisma.notificationRecipient.findMany();
    const primaryService = typed.services[0];
    await this.email.sendBookingConfirmation({
      bookingId: typed.id,
      slotDate: typed.slotDate,
      slotTime: typed.slotTime,
      service: {
        name: primaryService?.service.name ?? 'Service',
        engineTier: primaryService?.engineTier?.name ?? null,
      },
      totals: { pricePence: totalAmountPence },
      vehicle: {
        registration: typed.vehicleRegistration,
        make: typed.vehicleMake,
        model: typed.vehicleModel,
        engineSizeCc: typed.vehicleEngineSizeCc,
      },
      customer: {
        email: typed.customerEmail,
        name: typed.customerName,
        title: typed.customerTitle,
        firstName: typed.customerFirstName,
        lastName: typed.customerLastName,
        companyName: typed.customerCompany,
        phone: typed.customerPhone,
        mobile: typed.customerMobile,
        landline: typed.customerLandline,
        addressLine1: typed.customerAddressLine1,
        addressLine2: typed.customerAddressLine2,
        addressLine3: typed.customerAddressLine3,
        city: typed.customerCity,
        county: typed.customerCounty,
        postcode: typed.customerPostcode,
        notes: typed.notes ?? null,
      },
      documents: { invoiceNumber: invoice.number, invoiceUrl: invoice.pdfUrl },
      adminRecipients: recipients.map((r) => r.email),
    });
  }

  async createInvoiceDraft(bookingId: number): Promise<{ documentId: number; number: string | null } > {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { services: { include: { service: true, engineTier: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (!booking.services.length) throw new BadRequestException('Booking has no services configured.');

    const settings = await this.settings.getSettings();
    const vatRatePercent = Number(settings.vatRatePercent);

    const lines = booking.services.map((svc) => ({
      description: svc.engineTier ? `${svc.service.name} (${svc.engineTier.name})` : svc.service.name,
      quantity: 1,
      unitPricePence: svc.unitPricePence,
      vatRatePercent,
    }));
    lines.push(
      { description: 'Parts', quantity: 0, unitPricePence: 0, vatRatePercent },
      { description: 'Labour', quantity: 0, unitPricePence: 0, vatRatePercent },
      { description: 'Discount', quantity: 0, unitPricePence: 0, vatRatePercent: 0 },
    );

    const totalAmountPence = lines.reduce((sum, line) => sum + line.quantity * line.unitPricePence, 0);
    const vatAmountPence = this.calculateVatFromGross(totalAmountPence, vatRatePercent);
    const number = `DRF-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const document = await this.prisma.document.create({
      data: {
        type: 'INVOICE',
        status: 'DRAFT',
        number,
        bookingId: booking.id,
        userId: booking.userId,
        totalAmountPence,
        vatAmountPence,
        pdfUrl: 'pending://draft',
        payload: {
          customer: {
            name: booking.customerName,
            email: booking.customerEmail,
            phone: booking.customerPhone,
            addressLine1: booking.customerAddressLine1,
            addressLine2: booking.customerAddressLine2,
            city: booking.customerCity,
            postcode: booking.customerPostcode,
          },
          vehicle: {
            registration: booking.vehicleRegistration,
            make: booking.vehicleMake,
            model: booking.vehicleModel,
            engineSizeCc: booking.vehicleEngineSizeCc,
          },
          lines,
        },
      },
    });
    return { documentId: document.id, number: document.number };
  }

  async createQuoteDraft(bookingId: number): Promise<{ documentId: number; number: string | null } > {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { services: { include: { service: true, engineTier: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (!booking.services.length) throw new BadRequestException('Booking has no services configured.');

    const settings = await this.settings.getSettings();
    const vatRatePercent = Number(settings.vatRatePercent);

    const lines = booking.services.map((svc) => ({
      description: svc.engineTier ? `${svc.service.name} (${svc.engineTier.name})` : svc.service.name,
      quantity: 1,
      unitPricePence: svc.unitPricePence,
      vatRatePercent,
    }));
    lines.push(
      { description: 'Parts', quantity: 0, unitPricePence: 0, vatRatePercent },
      { description: 'Labour', quantity: 0, unitPricePence: 0, vatRatePercent },
      { description: 'Discount', quantity: 0, unitPricePence: 0, vatRatePercent: 0 },
    );

    const totalAmountPence = lines.reduce((sum, line) => sum + line.quantity * line.unitPricePence, 0);
    const vatAmountPence = this.calculateVatFromGross(totalAmountPence, vatRatePercent);
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 14);
    const number = `DRF-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const document = await this.prisma.document.create({
      data: {
        type: 'QUOTE',
        status: 'DRAFT',
        number,
        bookingId: booking.id,
        userId: booking.userId,
        totalAmountPence,
        vatAmountPence,
        validUntil,
        pdfUrl: 'pending://draft',
        payload: {
          customer: {
            name: booking.customerName,
            email: booking.customerEmail,
            phone: booking.customerPhone,
            addressLine1: booking.customerAddressLine1,
            addressLine2: booking.customerAddressLine2,
            city: booking.customerCity,
            postcode: booking.customerPostcode,
          },
          vehicle: {
            registration: booking.vehicleRegistration,
            make: booking.vehicleMake,
            model: booking.vehicleModel,
            engineSizeCc: booking.vehicleEngineSizeCc,
          },
          lines,
        },
      },
    });
    return { documentId: document.id, number: document.number };
  }
}
