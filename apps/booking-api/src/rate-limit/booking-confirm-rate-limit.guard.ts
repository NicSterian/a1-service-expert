import { ExecutionContext, Injectable } from '@nestjs/common';
import { Settings } from '@prisma/client';
import { AbstractRateLimitGuard } from './abstract-rate-limit.guard';
import { RateLimitService } from './rate-limit.service';
import { SettingsService } from '../settings/settings.service';

const DEFAULT_BOOKING_LIMIT = 5;
const BOOKING_WINDOW_MS = 24 * 60 * 60 * 1000; // 1 day

@Injectable()
export class BookingConfirmRateLimitGuard extends AbstractRateLimitGuard {
  constructor(
    rateLimitService: RateLimitService,
    settingsService: SettingsService,
  ) {
    super(rateLimitService, settingsService);
  }

  protected resolveKey(context: ExecutionContext): string | null {
    const request = context.switchToHttp().getRequest();
    const userId: number | undefined = request.user?.id;
    if (userId) {
      return `booking-confirm:user:${userId}`;
    }
    const ip = request.ip ?? request.headers['x-forwarded-for'];
    return ip ? `booking-confirm:ip:${ip}` : null;
  }

  protected resolveLimit(settings: Settings): number {
    return settings.bookingConfirmRateLimitPerDay ?? DEFAULT_BOOKING_LIMIT;
  }

  protected resolveWindowMs(_: Settings): number {
    return BOOKING_WINDOW_MS;
  }
}
