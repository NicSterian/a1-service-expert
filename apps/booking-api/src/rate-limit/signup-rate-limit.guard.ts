import { ExecutionContext, Injectable } from '@nestjs/common';
import { Settings } from '@prisma/client';
import { AbstractRateLimitGuard } from './abstract-rate-limit.guard';
import { RateLimitService } from './rate-limit.service';
import { SettingsService } from '../settings/settings.service';

const DEFAULT_SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class SignupRateLimitGuard extends AbstractRateLimitGuard {
  constructor(
    rateLimitService: RateLimitService,
    settingsService: SettingsService,
  ) {
    super(rateLimitService, settingsService);
  }

  protected resolveKey(context: ExecutionContext): string | null {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip ?? request.headers['x-forwarded-for'];
    return ip ? `signup:${ip}` : null;
  }

  protected resolveLimit(settings: Settings): number {
    return settings.signupRateLimitPerHour ?? DEFAULT_SIGNUP_LIMIT;
  }

  protected resolveWindowMs(_: Settings): number {
    return SIGNUP_WINDOW_MS;
  }
}
