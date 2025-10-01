import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Settings } from '@prisma/client';
import { RateLimitService } from './rate-limit.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export abstract class AbstractRateLimitGuard implements CanActivate {
  constructor(
    protected readonly rateLimitService: RateLimitService,
    protected readonly settingsService: SettingsService,
  ) {}

  protected abstract resolveKey(context: ExecutionContext): string | null | Promise<string | null>;
  protected abstract resolveLimit(settings: Settings): number;
  protected abstract resolveWindowMs(settings: Settings): number;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = await this.resolveKey(context);
    if (!key) {
      return true;
    }

    const settings = await this.settingsService.getSettings();
    const limit = this.resolveLimit(settings);
    const windowMs = this.resolveWindowMs(settings);

    if (limit <= 0 || windowMs <= 0) {
      return true;
    }

    this.rateLimitService.consume(key, limit, windowMs);
    return true;
  }
}
