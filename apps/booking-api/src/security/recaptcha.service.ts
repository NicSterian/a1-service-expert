import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const RECAPTCHA_ENDPOINT = 'https://www.google.com/recaptcha/api/siteverify';

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);

  constructor(private readonly configService: ConfigService) {}

  async verify(token: string, remoteIp?: string): Promise<boolean> {
    const secret = this.configService.get<string>('RECAPTCHA_SECRET');

    if (!secret) {
      this.logger.warn('RECAPTCHA_SECRET not set. Skipping verification.');
      return true;
    }

    const params = new URLSearchParams({
      secret,
      response: token,
    });

    if (remoteIp) {
      params.append('remoteip', remoteIp);
    }

    try {
      const response = await fetch(RECAPTCHA_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        this.logger.warn(`reCAPTCHA verification failed with status ${response.status}`);
        return false;
      }

      const result = (await response.json()) as { success: boolean; [key: string]: unknown };
      if (!result.success) {
        this.logger.warn(`reCAPTCHA verification unsuccessful: ${JSON.stringify(result)}`);
      }
      return result.success === true;
    } catch (error) {
      this.logger.error('reCAPTCHA verification error', error as Error);
      return false;
    }
  }
}
