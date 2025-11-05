/**
 * email.utils
 *
 * Small, pure utilities used by EmailService and adapters.
 */
import type { Logger } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function formatCurrencyGBP(pence: number): string {
  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  });
  return formatter.format(pence / 100);
}

export function formatDateLong(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Attempts to load the logo image and return a data URI for embedding.
 * Returns null if not found or on failure.
 */
export function tryLoadLogoDataUri(logger?: Logger): string | null {
  const candidatePaths = [
    join(process.cwd(), 'apps', 'booking-web', 'src', 'assets', 'logo-a1.png'),
    join(process.cwd(), 'apps', 'booking-api', 'assets', 'logo-a1.png'),
  ];

  for (const path of candidatePaths) {
    if (existsSync(path)) {
      try {
        const buffer = readFileSync(path);
        return `data:image/png;base64,${buffer.toString('base64')}`;
      } catch (error) {
        if (logger) {
          logger.warn(`Failed to load logo for emails from ${path}: ${(error as Error).message}`);
        }
      }
    }
  }
  return null;
}

