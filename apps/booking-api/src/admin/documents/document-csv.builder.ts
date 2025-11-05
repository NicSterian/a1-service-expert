import type { Document } from '@prisma/client';

/**
 * Builds a CSV string for documents export. Mirrors the controller's shape/order.
 */
export function buildDocumentsCsv(rows: Document[]): string {
  const header = [
    'number','type','status','totalPence','vatPence','createdAt','issuedAt','dueAt','paidAt','paymentMethod','bookingId'
  ];
  const lines = rows.map((r) => [
    r.number,
    r.type,
    r.status,
    r.totalAmountPence,
    r.vatAmountPence,
    r.createdAt.toISOString(),
    r.issuedAt ? r.issuedAt.toISOString() : '',
    r.dueAt ? r.dueAt.toISOString() : '',
    (r as any).paidAt ? (r as any).paidAt.toISOString() : '',
    (r as any).paymentMethod ?? '',
    r.bookingId ?? '',
  ].join(','));
  return [header.join(','), ...lines].join('\n');
}

