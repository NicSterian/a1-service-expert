import { DocumentStatus, DocumentType, Prisma } from '@prisma/client';

/**
 * Builds a Prisma DocumentWhereInput from query params.
 * Behaviour preserved from AdminDocumentsController.
 */
export function buildDocumentWhere({
  type = DocumentType.INVOICE,
  status,
  from,
  to,
  q,
}: {
  type?: DocumentType;
  status?: DocumentStatus;
  from?: string;
  to?: string;
  q?: string;
}): Prisma.DocumentWhereInput {
  const where: Prisma.DocumentWhereInput = { type };
  if (status) where.status = status;
  if (from || to) {
    where.createdAt = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
  }
  if (q && q.trim().length > 0) {
    const term = q.trim();
    where.OR = [
      { number: { contains: term, mode: 'insensitive' } },
      // NOTE: JSON path filters kept as `any` to preserve exact behaviour
      { payload: { path: ['customer', 'name'], string_contains: term } as any },
      { payload: { path: ['customer', 'email'], string_contains: term } as any },
    ];
  }
  return where;
}

