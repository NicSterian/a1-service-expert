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
import PDFDocument from 'pdfkit';
import { createWriteStream, promises as fs } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

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

    const pdfUrl = this.buildDownloadUrl(document.id);

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
    const prefix = key === SequenceKey.QUOTE ? 'QUO' : 'INV';
    const sequence = counter.toString().padStart(4, '0');
    return `${prefix}-${year}-${sequence}`;
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
    return join(process.cwd(), 'storage', 'documents');
  }

  private getDocumentFilePathFromDir(dir: string, document: Document): string {
    const filename = `${document.number}.pdf`;
    return join(dir, filename);
  }

  private buildDownloadUrl(documentId: number): string {
    const base = this.configService.get<string>('DOCUMENTS_BASE_URL');
    const path = `/documents/${documentId}/download`;
    if (!base || base.trim().length === 0) {
      return path;
    }
    return `${base.replace(/\/+$/, '')}${path}`;
  }

  private async generatePdf(
    filePath: string,
    document: Document,
    summary: DocumentSummary,
    totals: { totalAmountPence: number; vatAmountPence: number },
    settings: Settings,
  ) {
    await fs.mkdir(join(filePath, '..'), { recursive: true }).catch(() => undefined);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = createWriteStream(filePath);
    doc.pipe(stream);

    const formattedTotal = this.formatCurrency(totals.totalAmountPence);
    const formattedVat = this.formatCurrency(totals.vatAmountPence);
    const netAmount = this.formatCurrency(totals.totalAmountPence - totals.vatAmountPence);

    doc.fontSize(20).text('A1 Service Expert', { align: 'left' });
    if (settings.companyAddress) {
      doc.fontSize(10).moveDown(0.5).text(settings.companyAddress, { width: 250 });
    }
    if (settings.companyPhone) {
      doc.fontSize(10).text(`Phone: ${settings.companyPhone}`);
    }
    if (settings.vatNumber) {
      doc.fontSize(10).text(`VAT: ${settings.vatNumber}`);
    }

    doc.moveDown();
    doc.fontSize(16).text(document.type === 'INVOICE' ? 'Invoice' : 'Quote', { align: 'left' });
    doc.fontSize(10).text(`Document number: ${document.number}`);
    doc.fontSize(10).text(`Date: ${new Date().toLocaleDateString('en-GB')}`);
    doc.fontSize(10).text(`Booking reference: ${summary.bookingId}`);

    doc.moveDown();
    doc.fontSize(12).text('Customer details', { underline: true });
    doc.fontSize(10).text(summary.customerName);
    doc.fontSize(10).text(summary.customerEmail);
    doc.fontSize(10).text(summary.customerPhone);

    doc.moveDown();
    doc.fontSize(12).text('Booking details', { underline: true });
    doc.fontSize(10).text(`Appointment: ${summary.slotDate.toLocaleDateString('en-GB')} at ${summary.slotTime}`);
    doc.fontSize(10).text(`Service: ${summary.serviceName}${summary.engineTierName ? ` (${summary.engineTierName})` : ''}`);

    doc.moveDown();
    doc.fontSize(12).text('Charges', { underline: true });
    doc.fontSize(10).text(`Net amount: ${netAmount}`);
    doc.fontSize(10).text(`VAT: ${formattedVat}`);
    doc.fontSize(10).text(`Total: ${formattedTotal}`);

    if (document.type === 'QUOTE' && document.validUntil) {
      doc.moveDown();
      doc.fontSize(10).text(`Quote valid until: ${document.validUntil.toLocaleDateString('en-GB')}`);
    }

    doc.moveDown();
    doc.fontSize(9).fillColor('gray').text('Thank you for choosing A1 Service Expert.', { align: 'center' });

    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    }).catch((error) => {
      this.logger.error(`Failed to generate PDF for document ${document.id}`, error as Error);
      throw error;
    });
  }

  private formatCurrency(amountPence: number): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amountPence / 100);
  }
}

