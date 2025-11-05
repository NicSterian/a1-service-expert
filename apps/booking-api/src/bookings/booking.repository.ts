/**
 * BookingRepository
 *
 * Centralises common Prisma queries for bookings to reduce duplication.
 * Behaviour, includes, and ordering mirror existing calls in BookingsService.
 */
import { PrismaService } from '../prisma/prisma.service';

type AdminUserSelect = {
  id: true;
  email: true;
  firstName: true;
  lastName: true;
  mobileNumber: true;
  landlineNumber: true;
};

export class BookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** List bookings for a user with services + documents, ordered newest first. */
  async listForUser(userId: number) {
    return this.prisma.booking.findMany({
      where: { userId },
      orderBy: [{ slotDate: 'desc' }, { slotTime: 'desc' }, { createdAt: 'desc' }],
      include: {
        services: { include: { service: true, engineTier: true } },
        documents: true,
      },
    });
  }

  /** Get a booking for a user by id with services + documents. */
  async findForUser(bookingId: number, userId: number) {
    return this.prisma.booking.findFirst({
      where: { id: bookingId, userId },
      include: {
        services: { include: { service: true, engineTier: true } },
        documents: true,
      },
    });
  }

  /** Get a booking by id with admin view includes (services, documents, user subset). */
  async findByIdWithAdmin(bookingId: number) {
    return this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        services: {
          orderBy: { id: 'asc' },
          include: { service: true, engineTier: true },
        },
        documents: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            mobileNumber: true,
            landlineNumber: true,
          } as AdminUserSelect,
        },
      },
    });
  }
}
