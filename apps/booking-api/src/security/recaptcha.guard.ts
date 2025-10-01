import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SettingsService } from '../settings/settings.service';
import { RECAPTCHA_FIELD_KEY } from './recaptcha.decorator';
import { RecaptchaService } from './recaptcha.service';

@Injectable()
export class RecaptchaGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly settingsService: SettingsService,
    private readonly recaptchaService: RecaptchaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const fieldName =
      this.reflector.get<string | undefined>(RECAPTCHA_FIELD_KEY, context.getHandler()) ??
      this.reflector.get<string | undefined>(RECAPTCHA_FIELD_KEY, context.getClass()) ??
      'captchaToken';

    const settings = await this.settingsService.getSettings();
    if (!settings.recaptchaEnabled) {
      return true;
    }

    const token = (request.body?.[fieldName] as string | undefined)?.trim();
    if (!token) {
      throw new BadRequestException(`Missing reCAPTCHA token in field '${fieldName}'.`);
    }

    const remoteIp = request.ip;
    const isValid = await this.recaptchaService.verify(token, remoteIp);
    if (!isValid) {
      throw new ForbiddenException('reCAPTCHA verification failed.');
    }

    return true;
  }
}
