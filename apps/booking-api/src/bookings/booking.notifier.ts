/**
 * BookingNotifier
 *
 * Composes and sends booking confirmation notifications to the customer and
 * staff recipients. Preserves existing payload shape and behaviour.
 */
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import type { BookingWithServicesPort } from './bookings.ports';

export class BookingNotifier {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async sendBookingConfirmation(
    booking: BookingWithServicesPort,
    totals: { totalAmountPence: number; vatAmountPence: number },
    resolveReference: (b: BookingWithServicesPort) => string,
  ): Promise<void> {
    const bookingService = booking.services[0];
    const recipients = await this.prisma.notificationRecipient.findMany();

    await this.email.sendBookingConfirmation({
      bookingId: booking.id,
      reference: resolveReference(booking),
      slotDate: booking.slotDate,
      slotTime: booking.slotTime,
      service: {
        name: bookingService?.service.name ?? 'Service',
        engineTier: bookingService?.engineTier?.name ?? null,
      },
      totals: {
        pricePence: totals.totalAmountPence,
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
      adminRecipients: recipients.map((r) => r.email),
    });
  }
}
