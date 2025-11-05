/**
 * Bookings helpers
 *
 * Pure presentation and normalization helpers extracted from BookingsService.
 * Behavior must remain unchanged. Keep these functions small and side‑effect free.
 */
import type { Document } from '@prisma/client';

/**
 * Normalize an engine size value (cc):
 * - Non-finite/undefined/null → null
 * - Rounded to nearest integer
 * - ≤ 0 → null
 */
export function normalizeEngineSize(value?: number | null): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}

export type PresentedDocument = {
  id: number;
  type: Document['type'];
  number: string | null;
  status: Document['status'];
  totalAmountPence: number | null;
  vatAmountPence: number | null;
  pdfUrl: string | null;
  validUntil: string | null;
};

/**
 * Present a Document record for API responses.
 * Dates are rendered as ISO strings; nullable fields preserved.
 */
export function presentDocument(doc: Document): PresentedDocument {
  return {
    id: doc.id,
    type: doc.type,
    number: doc.number,
    status: doc.status,
    totalAmountPence: doc.totalAmountPence,
    vatAmountPence: doc.vatAmountPence,
    pdfUrl: doc.pdfUrl,
    validUntil: doc.validUntil ? doc.validUntil.toISOString() : null,
  };
}

