import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { SettingsService } from '../settings/settings.service';
import { TURNSTILE_FIELD_KEY } from './turnstile.decorator';
import { TurnstileService } from './turnstile.service';

@Injectable()
export class TurnstileGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly settingsService: SettingsService,
    private readonly turnstileService: TurnstileService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const fieldName =
      this.reflector.get<string | undefined>(TURNSTILE_FIELD_KEY, context.getHandler()) ??
      this.reflector.get<string | undefined>(TURNSTILE_FIELD_KEY, context.getClass()) ??
      'captchaToken';

    const settings = await this.settingsService.getSettings();
    const isDev = process.env.NODE_ENV !== 'production';

    if (!settings.captchaEnabled) {
      return true;
    }

    if (isDev && !settings.captchaRequireInDev) {
      return true;
    }

    const token = (request.body?.[fieldName] as string | undefined)?.trim();
    if (!token) {
      throw new BadRequestException(`Missing CAPTCHA token in field '${fieldName}'.`);
    }

    const remoteIp = request.ip;
    const isValid = await this.turnstileService.verify(token, remoteIp);
    if (!isValid) {
      throw new ForbiddenException('CAPTCHA verification failed.');
    }

    return true;
  }
}

