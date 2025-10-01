import { BookingStatus } from '@prisma/client';
import { CatalogService } from '../catalog/catalog.service';
import { BookingsService } from '../bookings/bookings.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Pricing regression', () => {
  const prisma = new PrismaService();
  const holdsService = { releaseHold: jest.fn() } as any;
  const emailService = { sendBookingConfirmation: jest.fn() } as any;
  const documentsService = {
    createInvoice: jest.fn(),
    createQuote: jest.fn(),
    finalizeDocument: jest.fn(),
  } as any;
  const vehiclesService = { getRecommendation: jest.fn().mockResolvedValue({}) } as any;
  const settingsService = { getSettings: jest.fn() } as any;

  const catalogService = new CatalogService(prisma);
  const bookingsService = new BookingsService(
    prisma,
    holdsService,
    emailService,
    documentsService,
    vehiclesService,
    settingsService,
  );

  let serviceId: number;
  let engineTierId: number;
  let originalPrice: number;

  beforeAll(async () => {
    await prisma.$connect();

    const service = await prisma.service.findFirst({ where: { code: 'SERVICE_1' } });
    if (!service) {
      throw new Error('Seeded service SERVICE_1 not found. Run prisma seed before tests.');
    }
    serviceId = service.id;

    const tier = await prisma.engineTier.findFirst({ where: { name: 'Small' } });
    if (!tier) {
      throw new Error('Seeded engine tier "Small" not found.');
    }
    engineTierId = tier.id;

    const priceRow = await prisma.servicePrice.findUnique({
      where: {
        serviceId_engineTierId: {
          serviceId,
          engineTierId,
        },
      },
    });

    if (!priceRow) {
      throw new Error('Service price not found for SERVICE_1 / Small.');
    }

    originalPrice = priceRow.amountPence;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('keeps service pricing consistent between catalog and booking totals', async () => {
    const updatedPrice = originalPrice + 1111;

    await prisma.servicePrice.update({
      where: {
        serviceId_engineTierId: {
          serviceId,
          engineTierId,
        },
      },
      data: {
        amountPence: updatedPrice,
      },
    });

    const catalogSummary = await catalogService.getCatalogSummary();
    const priceEntry = catalogSummary.prices.find(
      (entry) => entry.serviceId === serviceId && entry.engineTierId === engineTierId,
    );
    expect(priceEntry?.amountPence).toBe(updatedPrice);

    const userEmail = `pricing-test-${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash: 'test-hash',
        role: 'CUSTOMER',
        emailVerified: true,
      },
    });

    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 7);

    const bookingCustomerEmail = `pricing-regression-${Date.now()}@example.com`;

    try {
      const { bookingId } = await bookingsService.createBooking(user, {
        serviceId,
        engineTierId,
        date: bookingDate.toISOString().slice(0, 10),
        time: '09:00',
        vehicle: {
          vrm: 'TEST123',
          manualEntry: true,
        },
        customer: {
          name: 'Pricing Regression',
          email: bookingCustomerEmail,
          phone: '07000000000',
        },
      });

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          services: true,
        },
      });

      expect(booking).toBeTruthy();
      expect(booking?.servicePricePence).toBe(updatedPrice);
      expect(booking?.services[0]?.unitPricePence).toBe(updatedPrice);
      expect(booking?.services[0]?.bookingId).toBe(bookingId);
      expect(booking?.status).toBe(BookingStatus.DRAFT);
    } finally {
      await prisma.booking.deleteMany({ where: { customerEmail: bookingCustomerEmail } });
      await prisma.user.deleteMany({ where: { email: userEmail } });
      await prisma.servicePrice.update({
        where: {
          serviceId_engineTierId: {
            serviceId,
            engineTierId,
          },
        },
        data: {
          amountPence: originalPrice,
        },
      });
    }
  });
});

