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
  paymentNotes?: string | null;
};

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/documents')
export class AdminDocumentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly settings: SettingsService,
    private readonly email: EmailService,
  ) {}

  @Get()
  async list(@Query('type') type: DocumentType = DocumentType.INVOICE, @Query('status') status?: DocumentStatus) {
    const where: Prisma.DocumentWhereInput = { type };
    if (status) where.status = status;

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
      },
    });
    return { items };
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  @Post()
  async createDraft(@Body() dto: InvoiceDraftDto) {
    if (!dto || !Array.isArray(dto.lines) || dto.lines.length === 0) {
      throw new BadRequestException('At least one line item is required');
    }

    const settings = await this.settings.getSettings();
    const vatOn = Boolean((settings as any).vatRegistered);

    const { total, vat } = this.computeTotals(dto.lines, vatOn, settings.vatRatePercent as unknown as number);

    const number = `DRF-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const created = await this.prisma.document.create({
      data: {
        type: DocumentType.INVOICE,
        status: DocumentStatus.DRAFT,
        number,
        bookingId: dto.bookingId ?? null,
        userId: dto.userId ?? null,
        totalAmountPence: total,
        vatAmountPence: vat,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        payload: {
          customer: dto.customer ?? {},
          lines: dto.lines,
          paymentNotes: dto.paymentNotes ?? (settings as any).invoicePaymentNotes ?? null,
        },
        pdfUrl: 'pending://invoice/draft',
      },
    });
    return created;
  }

  @Patch(':id')
  async updateDraft(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<InvoiceDraftDto>) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status !== DocumentStatus.DRAFT) throw new BadRequestException('Only drafts can be edited');

    const mergedPayload = { ...(doc.payload as any), ...(dto as any) };

    const settings = await this.settings.getSettings();
    const vatOn = Boolean((settings as any).vatRegistered);
    const lines: InvoiceLineDto[] = (dto.lines ?? (doc.payload as any)?.lines) || [];
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new BadRequestException('At least one line item is required');
    }
    const { total, vat } = this.computeTotals(lines, vatOn, settings.vatRatePercent as unknown as number);

    const updated = await this.prisma.document.update({
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
    return updated;
  }

  @Post(':id/issue')
  async issue(@Param('id', ParseIntPipe) id: number) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.type !== DocumentType.INVOICE) throw new BadRequestException('Only invoices can be issued here');
    if (doc.status !== DocumentStatus.DRAFT && doc.status !== DocumentStatus.SENT) {
      throw new BadRequestException('Only drafts can be issued');
    }

    // Assign final number via sequence, set issuedAt, generate PDF from payload
    const settings = await this.settings.getSettings();

    // Compute totals from payload to ensure consistency
    const vatOn = Boolean((settings as any).vatRegistered);
    const lines: InvoiceLineDto[] = (doc.payload as any)?.lines || [];
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new BadRequestException('Invoice has no line items');
    }
    const { total, vat } = this.computeTotals(lines, vatOn, settings.vatRatePercent as unknown as number);

    // Reserve sequence by creating temp invoice via service, then overwrite our draft
    const number = (this as any).tmpNumber || undefined; // placeholder to hint logic
    // Use internal sequence by creating and discarding? Prefer using a special method:
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

    // Generate and persist PDF URL
    const pdf = await this.generateFromPayload(issued.id);
    return pdf;
  }

  @Post(':id/regenerate')
  async regenerate(@Param('id', ParseIntPipe) id: number) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    // Allow generating a PDF for drafts as a preview as well
    const updated = await this.generateFromPayload(id);
    return updated;
  }

  @Post(':id/send')
  async send(@Param('id', ParseIntPipe) id: number) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    const payload = (doc.payload as any) || {};
    const to = payload?.customer?.email || null;
    if (!to) throw new BadRequestException('Customer email is required to send invoice');
    const subject = `Invoice ${doc.number} from A1 Service Expert Ltd`;
    const link = doc.pdfUrl || `/documents/${doc.id}/download`;
    const text = `Dear ${payload?.customer?.name || 'Customer'},\n\nPlease find your invoice ${doc.number}.\n\nDownload: ${link}\n\nThank you,\nA1 Service Expert`;
    const html = `<p>Dear ${payload?.customer?.name || 'Customer'},</p><p>Please find your invoice <strong>${doc.number}</strong>.</p><p><a href="${link}">Download your invoice (PDF)</a></p><p>Thank you,<br/>A1 Service Expert</p>`;
    await (this.email as any).sendInvoiceEmail?.(to, subject, text, html);
    return { ok: true } as const;
  }

  @Patch(':id/status')
  async setStatus(@Param('id', ParseIntPipe) id: number, @Body() body: { status: DocumentStatus }) {
    if (!body?.status) throw new BadRequestException('Status is required');
    const allowed: DocumentStatus[] = [DocumentStatus.PAID, DocumentStatus.VOID, DocumentStatus.SENT];
    if (!allowed.includes(body.status)) {
      throw new BadRequestException('Unsupported status');
    }
    const updated = await this.prisma.document.update({ where: { id }, data: { status: body.status } });
    return updated;
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
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new BadRequestException('Invoice has no line items');
    }
    const { total, vat } = this.computeTotals(lines, vatOn, settings.vatRatePercent as unknown as number);

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

    const pdf = await this.generateFromPayload(issued.id);
    return pdf;
  }

  @Post(':id/send')
  async send(@Param('id', ParseIntPipe) id: number) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    const payload = (doc.payload as any) || {};
    const to = payload?.customer?.email || null;
    if (!to) throw new BadRequestException('Customer email is required to send invoice');
    const subject = `Invoice ${doc.number} from A1 Service Expert Ltd`;
    const link = doc.pdfUrl || `/documents/${doc.id}/download`;
    const text = `Dear ${payload?.customer?.name || 'Customer'},\n\nPlease find your invoice ${doc.number}.\n\nDownload: ${link}\n\nThank you,\nA1 Service Expert`;
    const html = `<p>Dear ${payload?.customer?.name || 'Customer'},</p><p>Please find your invoice <strong>${doc.number}</strong>.</p><p><a href="${link}">Download your invoice (PDF)</a></p><p>Thank you,<br/>A1 Service Expert</p>`;
    await (this.email as any).sendInvoiceEmail?.(to, subject, text, html);
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

    // Build minimal summary fields to reuse PDF generator
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

    // Let DocumentsService write the PDF and persist pdfUrl
    const storageDir = await (this.documents as any).ensureStorageDirectory?.();
    const final = await this.documents.finalizeDocument(doc, summary, totals, settings);
    return final;
  }
}

