import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { CreateManualBookingDto } from './dto/create-manual-booking.dto';
import {
  UpdateBookingStatusDto,
  UpdateInternalNotesDto,
  UpdatePaymentStatusDto,
  UpdateCustomerDto,
  UpdateVehicleDto,
  UpdateServiceLineDto,
} from './dto/update-admin-booking.dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Get()
  async listBookings(
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('q') search?: string,
    @Query('serviceId') serviceIdStr?: string,
    @Query('engineTierId') engineTierIdStr?: string,
    @Query('sort') sortBy: 'slot' | 'created' | 'customer' = 'slot',
    @Query('order') sortOrderParam: 'asc' | 'desc' = 'asc',
    @Query('deleted') deletedParam?: string,
    @Query('page') pageStr: string = '1',
    @Query('pageSize') pageSizeStr: string = '50',
  ) {
    const page = Math.max(1, parseInt(pageStr, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr, 10) || 50));
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = {};

    // Date filters
    if (fromStr) {
      where.slotDate = { ...where.slotDate, gte: new Date(fromStr) };
    }
    if (toStr) {
      where.slotDate = { ...where.slotDate, lte: new Date(toStr) };
    }

    // Status filter
    if (status && status !== 'ALL') {
      const statuses = status
        .split(',')
        .map((value) => value.trim().toUpperCase())
        .filter((value) => value.length > 0);
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else if (statuses.length > 1) {
        where.status = { in: statuses };
      }
    }

    // Source filter
    if (source && source !== 'ALL') {
      where.source = source;
    }

    // Service filter
    const serviceId = serviceIdStr ? parseInt(serviceIdStr, 10) : undefined;
    if (serviceId && Number.isFinite(serviceId)) {
      where.services = { ...(where.services ?? {}), some: { serviceId } };
    }

    // Engine tier filter
    const engineTierId = engineTierIdStr ? parseInt(engineTierIdStr, 10) : undefined;
    if (engineTierId && Number.isFinite(engineTierId)) {
      where.services = {
        ...(where.services ?? {}),
        some: { ...(where.services?.some ?? {}), engineTierId },
      };
    }

    // Search filter (customer name, email, VRM)
    if (search) {
      const trimmed = search.trim();
      const orFilters: Prisma.BookingWhereInput[] = [
        { customerName: { contains: trimmed, mode: 'insensitive' } },
        { customerEmail: { contains: trimmed, mode: 'insensitive' } },
        { vehicleRegistration: { contains: trimmed, mode: 'insensitive' } },
      ];

      const bookingId = Number(trimmed);
      if (!Number.isNaN(bookingId)) {
        orFilters.push({ id: bookingId });
      }

      where.OR = orFilters;
    }

    // Deleted filter (soft-delete simulated via paymentStatus='DELETED')
    const showDeleted = String(deletedParam).toLowerCase() === 'true';
    if (showDeleted) {
      where.paymentStatus = 'DELETED';
    } else {
      // Keep non-deleted only, while preserving any existing OR/filters
      // Include records where paymentStatus is null OR not 'DELETED'
      // Use AND to avoid interfering with search OR conditions
      where.AND = [
        ...(where.AND ?? []),
        { OR: [{ paymentStatus: null }, { paymentStatus: { not: 'DELETED' } }] },
      ];
    }

    // Sorting
    const sortOrder = sortOrderParam === 'desc' ? 'desc' : 'asc';
    const orderBy: any[] = [];
    if (sortBy === 'created') {
      orderBy.push({ createdAt: sortOrder });
    } else if (sortBy === 'customer') {
      orderBy.push({ customerName: sortOrder });
    } else {
      orderBy.push({ slotDate: sortOrder });
      orderBy.push({ slotTime: sortOrder });
    }

    // Fetch bookings
    const [records, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          services: {
            orderBy: { id: 'asc' },
            select: {
              serviceId: true,
              unitPricePence: true,
              engineTierId: true,
              service: {
                select: {
                  id: true,
                  name: true,
                },
              },
              engineTier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    const bookings = records.map((booking) => {
      const primaryService = booking.services[0] ?? null;
      const totalAmountPence = booking.services.reduce((sum, item) => sum + (item.unitPricePence ?? 0), 0);
      return {
        id: booking.id,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        vehicleRegistration: booking.vehicleRegistration,
        slotDate: booking.slotDate,
        slotTime: booking.slotTime,
        status: booking.status,
        source: booking.source,
        createdAt: booking.createdAt,
        serviceId: primaryService?.serviceId ?? null,
        serviceName: primaryService?.service?.name ?? null,
        engineTierId: primaryService?.engineTierId ?? null,
        engineTierName: primaryService?.engineTier?.name ?? null,
        totalAmountPence,
      };
    });

    return {
      bookings,
      total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize),
    };
  }

  @Get(':id')
  async getBooking(@Param('id', ParseIntPipe) bookingId: number) {
    return this.bookingsService.getBookingForAdmin(bookingId);
  }

  @Get('engine-tiers')
  async listEngineTiers() {
    const tiers = await this.prisma.engineTier.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return tiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      maxCc: tier.maxCc,
      sortOrder: tier.sortOrder,
    }));
  }

  @Post('manual')
  async createManualBooking(@Body() dto: CreateManualBookingDto) {
    return this.bookingsService.createManualBooking(dto);
  }

  @Patch(':id/delete')
  async softDelete(@Param('id', ParseIntPipe) bookingId: number) {
    return this.bookingsService.adminSoftDeleteBooking(bookingId);
  }

  @Patch(':id/restore')
  async restore(@Param('id', ParseIntPipe) bookingId: number) {
    return this.bookingsService.adminRestoreBooking(bookingId);
  }

  @Post(':id/hard-delete')
  async hardDeletePost(@Param('id', ParseIntPipe) bookingId: number) {
    await this.bookingsService.adminHardDeleteBooking(bookingId);
    return { ok: true };
  }

  @Patch(':id/status')
  async updateStatus(@Param('id', ParseIntPipe) bookingId: number, @Body() dto: UpdateBookingStatusDto) {
    return this.bookingsService.adminUpdateStatus(bookingId, dto.status);
  }

  @Patch(':id/internal-notes')
  async updateInternalNotes(
    @Param('id', ParseIntPipe) bookingId: number,
    @Body() dto: UpdateInternalNotesDto,
  ) {
    return this.bookingsService.adminUpdateInternalNotes(bookingId, dto.internalNotes ?? null);
  }

  @Patch(':id/payment-status')
  async updatePaymentStatus(
    @Param('id', ParseIntPipe) bookingId: number,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.bookingsService.adminUpdatePaymentStatus(bookingId, dto.paymentStatus ?? null);
  }

  @Patch(':id/customer')
  async updateCustomer(
    @Param('id', ParseIntPipe) bookingId: number,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.bookingsService.adminUpdateCustomer(bookingId, dto);
  }

  @Patch(':id/vehicle')
  async updateVehicle(
    @Param('id', ParseIntPipe) bookingId: number,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.bookingsService.adminUpdateVehicle(bookingId, dto);
  }

  @Patch(':id/services/:serviceLineId')
  async updateServiceLine(
    @Param('id', ParseIntPipe) bookingId: number,
    @Param('serviceLineId', ParseIntPipe) serviceLineId: number,
    @Body() dto: UpdateServiceLineDto,
  ) {
    return this.bookingsService.adminUpdateServiceLine(bookingId, serviceLineId, dto);
  }

  @Post(':id/documents/invoice-draft')
  async createInvoiceDraft(@Param('id', ParseIntPipe) bookingId: number) {
    return this.bookingsService.adminCreateInvoiceDraft(bookingId);
  }

  @Post(':id/documents/quote-draft')
  async createQuoteDraft(@Param('id', ParseIntPipe) bookingId: number) {
    return this.bookingsService.adminCreateQuoteDraft(bookingId);
  }

  @Post(':id/documents/invoice')
  async issueInvoice(@Param('id', ParseIntPipe) bookingId: number) {
    return this.bookingsService.adminIssueInvoice(bookingId);
  }

  @Post(':id/documents/invoice/email')
  async emailInvoice(@Param('id', ParseIntPipe) bookingId: number) {
    return this.bookingsService.adminEmailInvoice(bookingId);
  }
}
