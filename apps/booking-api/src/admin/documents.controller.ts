import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DocumentStatus, DocumentType, Prisma, SequenceKey } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { SettingsService } from '../settings/settings.service';
import { EmailService } from '../email/email.service';

type InvoiceLineDto = {
  description: string;
  quantity: number;
  unitPricePence: number;
  vatRatePercent?: number | null; // e.g., 20.0
};

type InvoiceDraftDto = {
  bookingId?: number | null;
  userId?: number | null;
  customer?: {
    name?: string | null;
    email?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    postcode?: string | null;
  };
  lines: InvoiceLineDto[];
  dueAt?: string | null; // ISO date
  validUntil?: string | null; // ISO date (for quotes)
  paymentNotes?: string | null;
  notes?: string | null;
};

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/documents')
export class AdminDocumentsController {
  private readonly logger = new Logger(AdminDocumentsController.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly settings: SettingsService,
    private readonly email: EmailService,
  ) {}

  @Get()
  async list(
    @Query('type') type: DocumentType = DocumentType.INVOICE,
    @Query('status') status?: DocumentStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
  ) {
    const where: Prisma.DocumentWhereInput = { type };
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      };
    }
    if (q && q.trim().length > 0) {
      const term = q.trim();
      where.OR = [
        { number: { contains: term, mode: 'insensitive' } },
        { payload: { path: ['customer', 'name'], string_contains: term } as Prisma.JsonFilter },
        { payload: { path: ['customer', 'email'], string_contains: term } as Prisma.JsonFilter },
      ];
    }

    const items = await this.prisma.document.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        number: true,
        type: true,
        status: true,
        totalAmountPence: true,
        vatAmountPence: true,
        pdfUrl: true,
        createdAt: true,
        issuedAt: true,
        dueAt: true,
        bookingId: true,
        paidAt: true,
        paymentMethod: true,
      },
    });
    return { items };
  }

  @Get('csv')
  async exportCsv(
    @Query('type') type: DocumentType = DocumentType.INVOICE,
    @Query('status') status?: DocumentStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
  ) {
    const where: Prisma.DocumentWhereInput = { type };
    if (status) where.status = status;
    if (from || to) where.createdAt = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
    if (q && q.trim().length > 0) {
      const term = q.trim();
      where.OR = [
        { number: { contains: term, mode: 'insensitive' } },
        { payload: { path: ['customer', 'name'], string_contains: term } as Prisma.JsonFilter },
        { payload: { path: ['customer', 'email'], string_contains: term } as Prisma.JsonFilter },
      ];
    }
    const rows = await this.prisma.document.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });
    const header = [
      'number','type','status','totalPence','vatPence','createdAt','issuedAt','dueAt','paidAt','paymentMethod','bookingId'
    ];
    const csv = [header.join(',')]
      .concat(
        rows.map((r) => [
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
        ].join(',')),
      )
      .join('\n');
    return csv;
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  @Post()
  async createDraft(@Body() dto: InvoiceDraftDto & { type?: string }) {
    // Allow creating with empty lines for initial draft
    const lines = dto.lines || [{ description: '', quantity: 1, unitPricePence: 0 }];

    const settings = await this.settings.getSettings();
    const vatOn = Boolean((settings as any).vatRegistered);
    const defaultVat = Number((settings as any).vatRatePercent?.toString?.() ?? (settings as any).vatRatePercent ?? 0);
    const { total, vat } = this.computeTotals(lines, vatOn, defaultVat);

    const docType = dto.type === 'QUOTE' ? DocumentType.QUOTE : DocumentType.INVOICE;
    const prefix = docType === DocumentType.QUOTE ? 'QUO' : 'DRF';
    const number = `${prefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    return this.prisma.document.create({
      data: {
        type: docType,
        status: DocumentStatus.DRAFT,
        number,
        bookingId: dto.bookingId ?? null,
        userId: dto.userId ?? null,
        totalAmountPence: total,
        vatAmountPence: vat,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        validUntil: docType === DocumentType.QUOTE && dto.validUntil ? new Date(dto.validUntil) : null,
        payload: {
          customer: dto.customer ?? {},
          lines,
          paymentNotes: dto.paymentNotes ?? (settings as any).invoicePaymentNotes ?? null,
          notes: dto.notes ?? null,
        },
        pdfUrl: `pending://${docType.toLowerCase()}/draft`,
      },
    });
  }

  @Patch(':id')
  async updateDraft(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<InvoiceDraftDto>) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status !== DocumentStatus.DRAFT) throw new BadRequestException('Only drafts can be edited');

    const settings = await this.settings.getSettings();
    const vatOn = Boolean((settings as any).vatRegistered);
    const lines: InvoiceLineDto[] = (dto.lines ?? (doc.payload as any)?.lines) || [];
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new BadRequestException('At least one line item is required');
    }
    const defaultVat = Number((settings as any).vatRatePercent?.toString?.() ?? (settings as any).vatRatePercent ?? 0);
    const { total, vat } = this.computeTotals(lines, vatOn, defaultVat);

    return this.prisma.document.update({
      where: { id },
      data: {
        totalAmountPence: total,
        vatAmountPence: vat,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : doc.dueAt,
        payload: {
          ...(doc.payload as any),
          ...(dto as any),
          lines,
        },
      },
    });
  }

  @Post(':id/regenerate')
  async regenerate(@Param('id', ParseIntPipe) id: number) {
    try {
      const doc = await this.prisma.document.findUnique({ where: { id } });
      if (!doc) throw new NotFoundException('Document not found');
      // allow preview for drafts, too
      const res = await this.generateFromPayload(id);
      return res;
    } catch (e) {
      const msg = (e as Error)?.message || String(e);
      this.logger.error(`Regenerate failed for id=${id}: ${msg}`);
      throw new InternalServerErrorException(`Preview failed: ${msg}`);
    }
  }

  @Patch(':id/status')
  async setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: DocumentStatus; paymentMethod?: string | null; paidAt?: string | null; reason?: string | null },
  ) {
    if (!body?.status) throw new BadRequestException('Status is required');
    const allowed: DocumentStatus[] = [DocumentStatus.PAID, DocumentStatus.VOID, DocumentStatus.SENT];
    if (!allowed.includes(body.status)) throw new BadRequestException('Unsupported status');

    const data: Prisma.DocumentUpdateInput = { status: body.status };
    if (body.status === DocumentStatus.PAID) {
      (data as any).paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
      (data as any).paymentMethod = (body.paymentMethod ?? 'OTHER').toUpperCase();
    } else {
      (data as any).paymentMethod = body.paymentMethod ?? undefined;
    }

    // Optionally store reason for VOID in payload.history
    if (body.status === DocumentStatus.VOID && body.reason) {
      const doc = await this.prisma.document.findUnique({ where: { id } });
      const payload = (doc?.payload as any) || {};
      const history = Array.isArray(payload.history) ? payload.history : [];
      history.push({ action: 'VOID', reason: body.reason, at: new Date().toISOString() });
      (data as any).payload = { ...payload, history } as any;
    }

    const updated = await this.prisma.document.update({ where: { id }, data });

    // If marked paid, regenerate PDF so it becomes a receipt
    if (updated.status === DocumentStatus.PAID) {
      await this.generateFromPayload(updated.id);
    }
    return updated;
  }

  @Patch('bulk-status')
  async bulkStatus(@Body() body: { ids: number[]; status: DocumentStatus; paymentMethod?: string | null; paidAt?: string | null }) {
    if (!Array.isArray(body.ids) || body.ids.length === 0) throw new BadRequestException('ids required');
    const updates = await Promise.all(
      body.ids.map((id) =>
        this.setStatus(id as any, { status: body.status, paymentMethod: body.paymentMethod ?? undefined, paidAt: body.paidAt ?? undefined } as any),
      ),
    );
    return { ok: true, count: updates.length } as const;
  }

  @Post(':id/convert-to-invoice')
  async convertToInvoice(@Param('id', ParseIntPipe) id: number) {
    const quote = await this.prisma.document.findUnique({ where: { id } });
    if (!quote || quote.type !== DocumentType.QUOTE) throw new NotFoundException('Quote not found');
    const settings = await this.settings.getSettings();
    const payload = (quote.payload as any) || {};
    const lines = Array.isArray(payload.lines) ? payload.lines : [];
    const subtotal = lines.reduce((s: number, l: any) => s + Math.round((Number(l.quantity ?? 1) * Number(l.unitPricePence ?? 0))), 0);
    const vat = 0; // keep simple for now
    const total = subtotal + vat;

    const sequenceKey = SequenceKey.INVOICE;
    const year = new Date().getFullYear();
    const seq = await this.prisma.sequence.upsert({ where: { key_year: { key: sequenceKey, year } }, update: { counter: { increment: 1 } }, create: { key: sequenceKey, year, counter: 1 }, select: { counter: true } });
    const number = `INV-${year}-${String(seq.counter).padStart(4, '0')}`;

    const created = await this.prisma.document.create({
      data: {
        type: DocumentType.INVOICE,
        status: DocumentStatus.ISSUED,
        number,
        totalAmountPence: total,
        vatAmountPence: vat,
        issuedAt: new Date(),
        bookingId: quote.bookingId,
        payload: payload,
        pdfUrl: 'pending://invoice/converted',
      },
    });
    await this.generateFromPayload(created.id);
    return created;
  }

  @Post(':id/issue')
  async issue(@Param('id', ParseIntPipe) id: number) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.type !== DocumentType.INVOICE) throw new BadRequestException('Only invoices can be issued here');
    if (doc.status !== DocumentStatus.DRAFT && doc.status !== DocumentStatus.SENT) {
      throw new BadRequestException('Only drafts can be issued');
    }

    const settings = await this.settings.getSettings();
    const vatOn = Boolean((settings as any).vatRegistered);
    const lines: InvoiceLineDto[] = (doc.payload as any)?.lines || [];
    if (!Array.isArray(lines) || lines.length === 0) throw new BadRequestException('Invoice has no line items');
    const defaultVat = Number((settings as any).vatRatePercent?.toString?.() ?? (settings as any).vatRatePercent ?? 0);
    const { total, vat } = this.computeTotals(lines, vatOn, defaultVat);

    const sequenceKey = SequenceKey.INVOICE;
    const year = new Date().getFullYear();
    const seq = await this.prisma.sequence.upsert({
      where: { key_year: { key: sequenceKey, year } },
      update: { counter: { increment: 1 } },
      create: { key: sequenceKey, year, counter: 1 },
      select: { counter: true },
    });
    const finalNumber = `INV-${year}-${String(seq.counter).padStart(4, '0')}`;

    const issued = await this.prisma.document.update({
      where: { id },
      data: {
        number: finalNumber,
        status: DocumentStatus.ISSUED,
        issuedAt: new Date(),
        totalAmountPence: total,
        vatAmountPence: vat,
      },
    });

    return this.generateFromPayload(issued.id);
  }

  @Post(':id/send')
  async send(@Param('id', ParseIntPipe) id: number, @Body() body?: { to?: string }) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status === DocumentStatus.DRAFT) throw new BadRequestException('Cannot send draft documents. Please issue first.');

    const payload = (doc.payload as any) || {};
    const customerEmail = payload?.customer?.email || null;
    const to = body?.to || customerEmail;

    if (!to) throw new BadRequestException('Email address is required');

    const customerName = payload?.customer?.name || 'Customer';
    const totalAmount = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(doc.totalAmountPence / 100);

    // Determine document type for email
    let documentType: 'INVOICE' | 'QUOTE' | 'RECEIPT' = 'INVOICE';
    if (doc.type === DocumentType.QUOTE) {
      documentType = 'QUOTE';
    } else if (doc.status === DocumentStatus.PAID) {
      documentType = 'RECEIPT';
    }

    // Get PDF file path
    const pdfPath = this.documents.getDocumentFilePath(doc);

    await this.email.sendDocumentEmail({
      to,
      documentType,
      documentNumber: doc.number,
      customerName,
      totalAmount,
      pdfPath,
    });

    return { ok: true } as const;
  }

  @Post(':id/delete')
  async deleteDraft(@Param('id', ParseIntPipe) id: number) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status !== DocumentStatus.DRAFT) throw new BadRequestException('Only drafts can be deleted');
    await this.prisma.document.delete({ where: { id } });
    return { ok: true } as const;
  }

  @Get('stats')
  async stats(@Query('type') type: DocumentType = DocumentType.INVOICE) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const [draftCount, issuedThisMonth, unpaidTotal, paidThisMonth] = await Promise.all([
      this.prisma.document.count({ where: { type, status: DocumentStatus.DRAFT } }),
      this.prisma.document.aggregate({
        _sum: { totalAmountPence: true },
        where: { type, status: DocumentStatus.ISSUED, issuedAt: { gte: monthStart, lte: monthEnd } },
      }),
      this.prisma.document.aggregate({
        _sum: { totalAmountPence: true },
        where: { type, status: DocumentStatus.ISSUED },
      }),
      this.prisma.document.aggregate({
        _sum: { totalAmountPence: true },
        where: { type, status: DocumentStatus.PAID, paidAt: { gte: monthStart, lte: monthEnd } },
      }),
    ]);

    return {
      draftCount,
      issuedThisMonthTotalPence: issuedThisMonth._sum.totalAmountPence ?? 0,
      unpaidTotalPence: unpaidTotal._sum.totalAmountPence ?? 0,
      paidThisMonthTotalPence: paidThisMonth._sum.totalAmountPence ?? 0,
    };
  }

  @Get('/reports/invoices')
  async invoicesReport(@Query('from') from?: string, @Query('to') to?: string) {
    const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);
    const end = to ? new Date(to) : new Date();
    const items = await this.prisma.document.findMany({
      where: { type: DocumentType.INVOICE, createdAt: { gte: start, lte: end } },
      select: { createdAt: true, totalAmountPence: true, vatAmountPence: true, status: true },
      orderBy: { createdAt: 'asc' },
    });
    const map = new Map<string, { total: number; vat: number; paid: number; issued: number }>();
    for (const it of items) {
      const k = `${it.createdAt.getFullYear()}-${String(it.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const row = map.get(k) ?? { total: 0, vat: 0, paid: 0, issued: 0 };
      row.total += it.totalAmountPence;
      row.vat += it.vatAmountPence;
      if (it.status === DocumentStatus.PAID) row.paid += it.totalAmountPence;
      if (it.status === DocumentStatus.ISSUED) row.issued += it.totalAmountPence;
      map.set(k, row);
    }
    const series = Array.from(map.entries()).map(([month, v]) => ({ month, ...v }));
    return { series };
  }

  @Get('/reports/vat')
  async vatReport(@Query('from') from?: string, @Query('to') to?: string) {
    const start = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const end = to ? new Date(to) : new Date();
    const agg = await this.prisma.document.aggregate({
      _sum: { vatAmountPence: true },
      where: { type: DocumentType.INVOICE, createdAt: { gte: start, lte: end }, status: { in: [DocumentStatus.ISSUED, DocumentStatus.PAID] } },
    });
    return { vatTotalPence: agg._sum.vatAmountPence ?? 0 };
  }

  @Get('/reports/outstanding')
  async outstanding() {
    const now = new Date();
    const items = await this.prisma.document.findMany({
      where: { type: DocumentType.INVOICE, status: DocumentStatus.ISSUED },
      select: { id: true, number: true, totalAmountPence: true, dueAt: true, createdAt: true, payload: true },
      orderBy: { dueAt: 'asc' },
    });
    const rows = items.map((d) => {
      const customer = ((d.payload as any)?.customer?.name as string) || '';
      const due = d.dueAt ?? null;
      const daysOverdue = due ? Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000)) : null;
      return { id: d.id, number: d.number, totalAmountPence: d.totalAmountPence, dueAt: due, daysOverdue, customer };
    });
    return { items: rows };
  }

  @Get('/reports/top-services')
  async topServices(@Query('from') from?: string, @Query('to') to?: string) {
    const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1);
    const end = to ? new Date(to) : new Date();
    const docs = await this.prisma.document.findMany({
      where: { type: DocumentType.INVOICE, createdAt: { gte: start, lte: end } },
      select: { payload: true },
    });
    const map = new Map<string, { total: number; count: number }>();
    for (const d of docs) {
      const lines = (d.payload as any)?.lines as Array<{ description: string; quantity: number; unitPricePence: number }> | undefined;
      if (!Array.isArray(lines)) continue;
      for (const l of lines) {
        const key = (l.description || 'Item').trim();
        const row = map.get(key) ?? { total: 0, count: 0 };
        row.total += Math.round(Number(l.quantity ?? 1) * Number(l.unitPricePence ?? 0));
        row.count += Number(l.quantity ?? 1);
        map.set(key, row);
      }
    }
    const rows = Array.from(map.entries())
      .map(([description, v]) => ({ description, totalPence: v.total, count: v.count }))
      .sort((a, b) => b.totalPence - a.totalPence)
      .slice(0, 10);
    return { items: rows };
  }
  private computeTotals(lines: InvoiceLineDto[], vatOn: boolean, defaultVatRatePercent: number) {
    let net = 0;
    let vat = 0;
    for (const line of lines) {
      const qty = Math.max(0, Number(line.quantity || 0));
      const unit = Math.max(0, Number(line.unitPricePence || 0));
      const lineNet = Math.round(qty * unit);
      const vatRate = vatOn ? Number(line.vatRatePercent ?? defaultVatRatePercent) : 0;
      const lineVat = Math.round(lineNet * (vatRate / 100));
      net += lineNet;
      vat += lineVat;
    }
    return { total: net + vat, vat };
  }

  private async generateFromPayload(id: number) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    const settings = await this.settings.getSettings();
    const payload = (doc.payload as any) || {};

    const summary = {
      bookingId: doc.bookingId ?? 0,
      slotDate: new Date(),
      slotTime: '',
      customerName: payload?.customer?.name || '',
      customerEmail: payload?.customer?.email || '',
      customerPhone: '',
      serviceName: 'Invoice',
      engineTierName: null,
    };
    const totals = { totalAmountPence: doc.totalAmountPence, vatAmountPence: doc.vatAmountPence };

    const final = await this.documents.finalizeDocument(doc, summary, totals, settings);
    return final;
  }
}
