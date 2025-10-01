import { ExecutionContext, Injectable } from '@nestjs/common';
import { Settings } from '@prisma/client';
import { AbstractRateLimitGuard } from './abstract-rate-limit.guard';
import { RateLimitService } from './rate-limit.service';
import { SettingsService } from '../settings/settings.service';

const DEFAULT_VRM_LIMIT = 10;
const VRM_WINDOW_MS = 60 * 1000; // 1 minute

@Injectable()
export class VrmLookupRateLimitGuard extends AbstractRateLimitGuard {
  constructor(
    rateLimitService: RateLimitService,
    settingsService: SettingsService,
  ) {
    super(rateLimitService, settingsService);
  }

  protected resolveKey(context: ExecutionContext): string | null {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip ?? request.headers['x-forwarded-for'];
    return ip ? `vrm:${ip}` : null;
  }

  protected resolveLimit(settings: Settings): number {
    return settings.vrmLookupRateLimitPerMinute ?? DEFAULT_VRM_LIMIT;
  }

  protected resolveWindowMs(_: Settings): number {
    return VRM_WINDOW_MS;
  }
}
