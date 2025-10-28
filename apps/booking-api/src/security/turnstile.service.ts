import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const TURNSTILE_ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(private readonly configService: ConfigService) {}

  get secret(): string | undefined {
    const secret = this.configService.get<string>('TURNSTILE_SECRET');
    if (!secret) {
      this.logger.warn('TURNSTILE_SECRET not set. CAPTCHA verification will be skipped.');
    }
    return secret;
  }

  async verify(token: string, remoteIp?: string): Promise<boolean> {
    const secret = this.secret;
    if (!secret) {
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
      const response = await fetch(TURNSTILE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        this.logger.warn(`Turnstile verification failed with status ${response.status}`);
        return false;
      }

      const result = (await response.json()) as { success: boolean; [key: string]: unknown };
      if (!result.success) {
        this.logger.warn(`Turnstile verification unsuccessful: ${JSON.stringify(result)}`);
      }
      return result.success === true;
    } catch (error) {
      this.logger.error('Turnstile verification error', error as Error);
      return false;
    }
  }
}

