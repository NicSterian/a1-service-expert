/**
 * Booking utilities
 *
 * Pure helpers for VAT calculation, booking reference formatting, and
 * sequence generation. Mirrors previous logic in BookingsService.
 */
import type { Prisma } from '@prisma/client';
import { SequenceKey } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export function calculateVatFromGross(totalAmountPence: number, vatRatePercent: number): number {
  if (!Number.isFinite(vatRatePercent) || vatRatePercent <= 0) {
    return 0;
  }
  const vatRate = vatRatePercent / 100;
  return Math.round(totalAmountPence * (vatRate / (1 + vatRate)));
}

export async function nextSequence(
  client: PrismaService | Prisma.TransactionClient,
  key: SequenceKey,
): Promise<{ year: number; counter: number }> {
  const year = new Date().getFullYear();
  const sequence = await client.sequence.upsert({
    where: { key_year: { key, year } },
    update: { counter: { increment: 1 } },
    create: { key, year, counter: 1 },
  });
  return { year, counter: sequence.counter };
}

export function formatBookingReference(year: number, counter: number): string {
  return `BK-A1-${year}-${counter.toString().padStart(4, '0')}`;
}

export function resolveBookingReference(booking: { id: number; reference: string | null }): string {
  if (booking.reference) return booking.reference;
  return formatBookingReference(new Date().getFullYear(), booking.id);
}

