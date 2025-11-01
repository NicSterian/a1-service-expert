import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { normalisePostcode, sanitisePhone, sanitiseString } from '../common/utils/profile.util';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listUsers(
    @Query('search') search?: string,
    @Query('sort') sort: string = 'createdAt',
    @Query('order') order: 'asc' | 'desc' = 'desc',
    @Query('page') pageStr: string = '1',
    @Query('pageSize') pageSizeStr: string = '20',
  ) {
    const page = Math.max(1, parseInt(pageStr, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr, 10) || 20));
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    let orderBy: any = {};
    if (sort === 'name') {
      orderBy = [{ firstName: order }, { lastName: order }];
    } else if (sort === 'bookings') {
      // For booking count, we'll sort after fetching since we need aggregation
      orderBy = { createdAt: order };
    } else {
      orderBy = { [sort]: order };
    }

    // Fetch users
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          mobileNumber: true,
          landlineNumber: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              bookings: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // If sorting by bookings, sort in memory
    if (sort === 'bookings') {
      users.sort((a, b) => {
        const aCount = a._count.bookings;
        const bCount = b._count.bookings;
        return order === 'desc' ? bCount - aCount : aCount - bCount;
      });
    }

    return {
      users,
      total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize),
    };
  }

  @Get(':id')
  async getUser(@Param('id', ParseIntPipe) userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        title: true,
        companyName: true,
        mobileNumber: true,
        landlineNumber: true,
        addressLine1: true,
        addressLine2: true,
        addressLine3: true,
        city: true,
        county: true,
        postcode: true,
        lastLoginAt: true,
        createdAt: true,
        deletedAt: true,
      },
    });
    if (!user) return null;

    const [bookings, invoicesSum, documents] = await Promise.all([
      this.prisma.booking.findMany({
        where: { userId },
        orderBy: [{ slotDate: 'desc' }, { slotTime: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          status: true,
          source: true,
          slotDate: true,
          slotTime: true,
          createdAt: true,
          services: {
            select: { unitPricePence: true, service: { select: { name: true } } },
          },
        },
      }),
      this.prisma.document.aggregate({
        _sum: { totalAmountPence: true },
        where: { booking: { userId }, type: 'INVOICE' },
      }),
      this.prisma.document.findMany({
        where: { booking: { userId } },
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          type: true,
          number: true,
          status: true,
          totalAmountPence: true,
          vatAmountPence: true,
          pdfUrl: true,
          createdAt: true,
          issuedAt: true,
        },
      }),
    ]);

    const bookingsMapped = bookings.map((b) => ({
      id: b.id,
      status: b.status,
      source: b.source,
      slotDate: b.slotDate.toISOString(),
      slotTime: b.slotTime,
      createdAt: b.createdAt.toISOString(),
      serviceNames: b.services.map((s) => s.service?.name).filter(Boolean) as string[],
      totalAmountPence: b.services.reduce((sum, s) => sum + (s.unitPricePence ?? 0), 0),
    }));

    const totalSpentPence = invoicesSum._sum.totalAmountPence ?? 0;

    return {
      user,
      summary: {
        registeredAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        totalBookings: bookings.length,
        totalSpentPence,
        deletedAt: user.deletedAt,
      },
      bookings: bookingsMapped,
      documents,
    };
  }

  @Patch(':id')
  async updateUser(@Param('id', ParseIntPipe) userId: number, @Body() dto: UpdateAdminUserDto) {
    const data: any = {};
    if (dto.title !== undefined) data.title = sanitiseString(dto.title);
    if (dto.firstName !== undefined) data.firstName = sanitiseString(dto.firstName);
    if (dto.lastName !== undefined) data.lastName = sanitiseString(dto.lastName);
    if (dto.companyName !== undefined) data.companyName = sanitiseString(dto.companyName);
    if (dto.email !== undefined) data.email = sanitiseString(dto.email)?.toLowerCase();
    if (dto.mobileNumber !== undefined) data.mobileNumber = sanitisePhone(dto.mobileNumber);
    if (dto.landlineNumber !== undefined) data.landlineNumber = sanitisePhone(dto.landlineNumber);
    if (dto.addressLine1 !== undefined) data.addressLine1 = sanitiseString(dto.addressLine1);
    if (dto.addressLine2 !== undefined) data.addressLine2 = sanitiseString(dto.addressLine2);
    if (dto.addressLine3 !== undefined) data.addressLine3 = sanitiseString(dto.addressLine3);
    if (dto.city !== undefined) data.city = sanitiseString(dto.city);
    if (dto.county !== undefined) data.county = sanitiseString(dto.county);
    if (dto.postcode !== undefined) data.postcode = normalisePostcode(dto.postcode);

    await this.prisma.user.update({ where: { id: userId }, data });
    return this.getUser(userId);
  }

  @Post(':id/send-password-reset')
  async sendPasswordReset(@Param('id', ParseIntPipe) userId: number) {
    // Create a reset token valid for 24 hours
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.passwordResetToken.create({ data: { userId, token, expiresAt } });
    return { ok: true };
  }

  @Delete(':id')
  async softDeleteUser(@Param('id', ParseIntPipe) userId: number) {
    await this.prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
    return { ok: true };
  }
}
