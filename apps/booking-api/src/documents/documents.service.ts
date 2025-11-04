import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Document,
  DocumentStatus,
  DocumentType,
  Prisma,
  SequenceKey,
  Settings,
} from '@prisma/client';
// pdfkit is CommonJS; use require-style import to get constructor
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');
import { createWriteStream, promises as fs, existsSync, readFileSync } from 'fs';
import { join, basename, dirname } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';

export type DocumentSummary = {
  bookingId: number;
  slotDate: Date;
  slotTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  engineTierName?: string | null;
};

type IssueDocumentParams = {
  bookingId: number;
  totalAmountPence: number;
  vatAmountPence: number;
  validUntil?: Date | null;
  status?: DocumentStatus;
  pdfUrl?: string;
  tx?: Prisma.TransactionClient;
};

type SequenceResult = {
  year: number;
  counter: number;
};

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private storageDir: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly pdfService: PdfService,
  ) {}

  async issueQuoteForBooking(params: IssueDocumentParams): Promise<Document> {
    return this.issueDocument(DocumentType.QUOTE, {
      ...params,
      status: params.status ?? DocumentStatus.ISSUED,
    });
  }

  async issueInvoiceForBooking(params: IssueDocumentParams): Promise<Document> {
    return this.issueDocument(DocumentType.INVOICE, {
      ...params,
      status: params.status ?? DocumentStatus.ISSUED,
    });
  }

  async finalizeDocument(
    document: Document,
    summary: DocumentSummary,
    totals: { totalAmountPence: number; vatAmountPence: number },
    settings: Settings,
  ): Promise<Document> {
    const storageDir = await this.ensureStorageDirectory();
    const filePath = this.getDocumentFilePathFromDir(storageDir, document);

    await this.generatePdf(filePath, document, summary, totals, settings);

    // Extra safety: ensure file is present before exposing URL
    try {
      await fs.stat(filePath);
    } catch (e) {
      this.logger.error(`PDF not found after generation: ${filePath}`);
      throw e;
    }

    const pdfUrl = this.buildPublicUrl(`${document.number}.pdf`);

    return this.prisma.document.update({
      where: { id: document.id },
      data: { pdfUrl },
    });
  }

  getDocumentFilePath(document: Document): string {
    const storageDir = this.storageDir ?? this.resolveStorageDirectory();
    return this.getDocumentFilePathFromDir(storageDir, document);
  }

  private async issueDocument(type: DocumentType, params: IssueDocumentParams): Promise<Document> {
    const client = params.tx ?? this.prisma;
    const sequenceKey = this.resolveSequenceKey(type);
    const sequence = await this.nextSequence(client, sequenceKey);
    const number = this.formatDocumentNumber(sequenceKey, sequence.year, sequence.counter);
    const pdfUrl = params.pdfUrl ?? `pending://${type.toLowerCase()}/${number}`;

    return client.document.create({
      data: {
        bookingId: params.bookingId,
        type,
        number,
        status: params.status ?? DocumentStatus.ISSUED,
        totalAmountPence: params.totalAmountPence,
        vatAmountPence: params.vatAmountPence,
        pdfUrl,
        validUntil: params.validUntil ?? null,
      },
    });
  }

  private resolveSequenceKey(type: DocumentType): SequenceKey {
    switch (type) {
      case DocumentType.QUOTE:
        return SequenceKey.QUOTE;
      case DocumentType.INVOICE:
        return SequenceKey.INVOICE;
      default:
        throw new Error(`Unsupported document type: ${type}`);
    }
  }

  private formatDocumentNumber(key: SequenceKey, year: number, counter: number): string {
    // Default formats
    const prefix = key === SequenceKey.QUOTE ? 'QUO' : 'INV';
    const defaultFormat = `${prefix}-{{YYYY}}-{{0000}}`;
    const yearStr = String(year);
    const pad = (n: number, len: number) => n.toString().padStart(len, '0');
    const apply = (fmt: string) => fmt
      .replace(/\{\{YYYY\}\}/g, yearStr)
      .replace(/\{\{0+\}\}/g, (m) => pad(counter, m.length - 4));
    try {
      if (key === SequenceKey.INVOICE) {
        // Try custom invoice number format from settings
    const settings = (globalThis as { __a1SettingsCache?: Settings }).__a1SettingsCache as Settings | undefined;
        const fmt = settings?.invoiceNumberFormat;
        if (fmt && fmt.includes('{{')) {
          return apply(fmt);
        }
      }
    } catch {}
    return apply(defaultFormat);
  }

  private async nextSequence(
    client: PrismaService | Prisma.TransactionClient,
    key: SequenceKey,
  ): Promise<SequenceResult> {
    const year = new Date().getFullYear();
    const sequence = await client.sequence.upsert({
      where: { key_year: { key, year } },
      update: { counter: { increment: 1 } },
      create: { key, year, counter: 1 },
    });

    return { year, counter: sequence.counter };
  }

  private async ensureStorageDirectory(): Promise<string> {
    if (!this.storageDir) {
      const dir = this.resolveStorageDirectory();
      await fs.mkdir(dir, { recursive: true });
      this.storageDir = dir;
    }
    return this.storageDir;
  }

  private resolveStorageDirectory(): string {
    const configured = this.configService.get<string>('DOCUMENTS_STORAGE_DIR');
    if (configured && configured.trim().length > 0) {
      return configured.trim();
    }
    return join(process.cwd(), 'storage', 'invoices');
  }

  private getDocumentFilePathFromDir(dir: string, document: Document): string {
    const filename = `${document.number}.pdf`;
    return join(dir, filename);
  }

  private buildPublicUrl(filename: string): string {
    const configured = (this.configService.get<string>('DOCUMENTS_BASE_URL') || '').trim();
    const base = (configured || 'http://localhost:3000').replace(/\/+$/, '');
    return `${base}/files/invoices/${filename}`;
  }

  private async generatePdf(
    filePath: string,
    document: Document,
    summary: DocumentSummary,
    totals: { totalAmountPence: number; vatAmountPence: number },
    settings: Settings,
  ) {
    await fs.mkdir(dirname(filePath), { recursive: true }).catch(() => undefined);
    type PayloadLine = { description: string; quantity?: number; unitPricePence?: number; vatRatePercent?: number };
    const payloadObj = (document.payload as unknown) as Record<string, unknown> | null;
    const payloadLines = (payloadObj?.lines as PayloadLine[] | undefined);
    const lines = Array.isArray(payloadLines) && payloadLines.length > 0
      ? payloadLines.map((l) => ({
          description: l.description,
          qty: Number(l.quantity ?? 1),
          unitPricePence: Number(l.unitPricePence ?? 0),
          vatPercent: Number(l.vatRatePercent ?? 0),
          totalPence: Math.round(Number(l.quantity ?? 1) * Number(l.unitPricePence ?? 0) * (1 + Number(l.vatRatePercent ?? 0) / 100)),
        }))
      : [{
          description: `${summary.serviceName}${summary.engineTierName ? ` (${summary.engineTierName})` : ''}`,
          qty: 1,
          unitPricePence: Math.max(0, totals.totalAmountPence - totals.vatAmountPence),
          vatPercent: 0,
          totalPence: totals.totalAmountPence,
        }];

    const subtotal = lines.reduce((s, l) => s + Math.round((l.qty ?? 1) * (l.unitPricePence ?? 0)), 0);
    const logoUrl = this.resolveLogoPath(settings.logoUrl || null);
    const data = {
      company: {
        name: settings.companyName ?? 'A1 Service Expert',
        address1: settings.companyAddress ?? '',
        phone: settings.companyPhone ?? undefined,
        logoUrl: logoUrl || undefined,
        companyNo: (settings as unknown as { companyRegNumber?: string }).companyRegNumber ?? undefined,
      },
      customer: { name: summary.customerName, email: summary.customerEmail },
      invoice: {
        number: document.number,
        issueDate: document.issuedAt ?? new Date(),
        dueDate: document.dueAt ?? undefined,
        currency: 'GBP',
        status: document.status,
        paymentMethod: (document as unknown as { paymentMethod?: string }).paymentMethod ?? undefined,
        paidAt: document.status === 'PAID' ? ((document as unknown as { paidAt?: Date }).paidAt ?? document.updatedAt) : undefined,
      },
      vat: { enabled: (settings as unknown as { vatRegistered?: boolean }).vatRegistered ?? false },
      lines,
      totals: {
        subtotalPence: subtotal,
        vatPence: Math.max(0, totals.vatAmountPence ?? 0),
        totalPence: Math.max(subtotal, totals.totalAmountPence ?? subtotal),
      },
      branding: { primary: ((settings as unknown as { brandPrimaryColor?: string }).brandPrimaryColor as string) || '#f97316' },
      notes: (payloadObj?.paymentNotes as string | undefined) ?? undefined,
    };
    await this.pdfService.renderInvoiceToFile(data, filePath);
  }

  private formatCurrency(amountPence: number): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amountPence / 100);
  }

  private resolveLogoPath(logoUrl: string | null): string | null {
    if (!logoUrl) {
      this.logger.warn('No logo URL provided in settings');
      return null;
    }

    // logoUrl is now just the filename (e.g., "logo.png")
    // But also support legacy format "/admin/settings/logo/filename"
    const file = logoUrl.includes('/') ? basename(logoUrl) : logoUrl;
    if (!file) {
      this.logger.warn(`Logo filename could not be extracted from: ${logoUrl}`);
      return null;
    }

    // Build path based on current working directory
    const cwd = process.cwd();
    const fullPath = cwd.endsWith('booking-api')
      ? join(cwd, 'storage', 'uploads', file)
      : join(cwd, 'apps', 'booking-api', 'storage', 'uploads', file);

    // Check if file exists and convert to base64 data URL for better Puppeteer compatibility
    try {
      if (!existsSync(fullPath)) {
        this.logger.error(`Logo file does not exist at: ${fullPath}`);
        return null;
      }

      // Read file and convert to base64 data URL
      const buffer = readFileSync(fullPath);
      const ext = file.split('.').pop()?.toLowerCase() || 'png';
      const mimeType = ext === 'webp' ? 'image/webp' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;
      return dataUrl;
    } catch (error) {
      this.logger.error(`Failed to load logo file: ${(error as Error).message}`);
      return null;
    }
  }
}

