import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { AuthUser } from '../auth/auth-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BookingConfirmRateLimitGuard } from '../rate-limit/booking-confirm-rate-limit.guard';
import { RecaptchaProtected } from '../security/recaptcha.decorator';
import { RecaptchaGuard } from '../security/recaptcha.guard';
import { BookingsService } from './bookings.service';
import { ConfirmBookingDto, CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  listMine(@AuthUser() user: User) {
    return this.bookingsService.listBookingsForUser(user);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  createBooking(@AuthUser() user: User, @Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking(user, dto);
  }

  @Patch(':id/confirm')
  @UseGuards(JwtAuthGuard, BookingConfirmRateLimitGuard, RecaptchaGuard)
  @RecaptchaProtected('captchaToken')
  confirmBooking(
    @AuthUser() user: User,
    @Param('id', ParseIntPipe) bookingId: number,
    @Body() _body: ConfirmBookingDto,
  ) {
    return this.bookingsService.confirmBooking(user, bookingId);
  }
}
