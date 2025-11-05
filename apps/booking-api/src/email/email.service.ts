/**
 * EmailService
 *
 * Facade for building and sending transactional emails (booking confirmations,
 * documents, contact notifications). Behaviour is locked during refactors.
 *
 * Delegates (Phase 1)
 * - DefaultTransportGateway: wraps nodemailer transport.
 * - DefaultTemplateRenderer: delegates to existing HTML/text builders.
 * - email.utils: small pure helpers (date/currency/asset loading).
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import type { TransportGateway, SendRequest, SendResult } from './transport-gateway';
import type { TemplateRenderer } from './template-renderer';
import { DefaultTransportGateway } from './adapters/default-transport.gateway';
import { DefaultTemplateRenderer } from './adapters/default-template.renderer';
import { formatCurrencyGBP, formatDateLong, tryLoadLogoDataUri } from './email.utils';

const SUPPORT_EMAIL = 'support@a1serviceexpert.com';

export interface BookingConfirmationEmail {
  bookingId?: number;
  reference?: string;
  slotDate: Date;
  slotTime: string;
  service: {
    name: string;
    engineTier?: string | null;
  };
  totals: {
    pricePence: number;
  };
  vehicle: {
    registration: string;
    make?: string | null;
    model?: string | null;
    engineSizeCc?: number | null;
  };
  customer: {
    email: string;
    name: string;
    title?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
    phone?: string | null;
    mobile?: string | null;
    landline?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    addressLine3?: string | null;
    city?: string | null;
    county?: string | null;
    postcode?: string | null;
    notes?: string | null;
  };
  documents?: {
    invoiceNumber?: string | null;
    invoiceUrl?: string | null;
    quoteNumber?: string | null;
    quoteUrl?: string | null;
  };
  adminRecipients?: string[];
}

export interface ContactMessage {
  fromName: string;
  fromEmail: string;
  fromPhone?: string;
  message: string;
  recipients: string[];
}

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private cachedConfig: SmtpConfig | null = null;
  private configLoaded = false;
  private logoDataUri: string | null | undefined;
  // Optional seams for future refactor. Defaults keep current behaviour.
  private renderer: TemplateRenderer | null = null;
  private gateway: TransportGateway | null = null;

  constructor(private readonly configService: ConfigService) {}

  private loadConfig(): SmtpConfig | null {
    if (this.configLoaded) {
      return this.cachedConfig;
    }

    this.configLoaded = true;

    const host = this.configService.get<string>('SMTP_HOST')?.trim();
    const portRaw = this.configService.get<string>('SMTP_PORT') ?? '';
    const secureRaw = this.configService.get<string>('SMTP_SECURE') ?? 'false';
    const user = this.configService.get<string>('SMTP_USER')?.trim();
    const pass = this.configService.get<string>('SMTP_PASS') ?? '';
    const fromName = this.configService.get<string>('MAIL_FROM_NAME')?.trim() ?? 'A1 Service Expert';
    const fromEmail = this.configService.get<string>('MAIL_FROM_EMAIL')?.trim();

    const port = Number.parseInt(portRaw, 10);
    const secure = secureRaw === 'true' || secureRaw === '1';

    if (!host || Number.isNaN(port) || port <= 0 || !user || !pass || !fromEmail) {
      this.logger.warn('SMTP configuration incomplete. Emails will be logged but not sent.');
      this.cachedConfig = null;
      return null;
    }

    this.cachedConfig = { host, port, secure, user, pass, fromName, fromEmail };
    return this.cachedConfig;
  }

  private async getTransporter(): Promise<Transporter | null> {
    if (this.transporter) {
      return this.transporter;
    }

    const config = this.loadConfig();
    if (!config) {
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    return this.transporter;
  }

  private async getTransportGateway(): Promise<TransportGateway | null> {
    if (this.gateway) return this.gateway;
    const transporter = await this.getTransporter();
    if (!transporter) return null;
    // Minimal adapter that preserves current behaviour
    this.gateway = new DefaultTransportGateway(transporter);
    return this.gateway;
  }

  // Built-in renderer that delegates to existing builders to avoid behaviour change
  private getTemplateRenderer(): TemplateRenderer {
    if (this.renderer) return this.renderer;
    this.renderer = new DefaultTemplateRenderer({
      formatDate: (d: Date) => this.formatDate(d),
      formatCurrency: (p: number) => this.formatCurrency(p),
      buildBookingUrl: (id?: number) => this.buildBookingUrl(id),
      loadLogoDataUri: () => this.loadLogoDataUri(),
      supportEmail: SUPPORT_EMAIL,
    });
    return this.renderer;
  }

  async sendInvoiceEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
    const transporter = await this.getTransporter();
    const config = this.loadConfig();
    if (!transporter || !config) {
      this.logger.log(`Would send invoice email to ${to}: ${subject}`);
      return;
    }
    try {
      await transporter.sendMail({ from: this.getFromHeader(config), to, subject, text, html: html ?? text });
    } catch (error) {
      this.logger.error('Failed to send invoice email via SMTP', error as Error);
    }
  }

  async sendDocumentEmail(params: {
    to: string;
    documentType: 'INVOICE' | 'QUOTE' | 'RECEIPT';
    documentNumber: string;
    customerName: string;
    totalAmount: string;
    pdfPath?: string;
  }): Promise<void> {
    const transporter = await this.getTransporter();
    const config = this.loadConfig();

    if (!transporter || !config) {
      this.logger.log(`Would send ${params.documentType} email to ${params.to}: ${params.documentNumber}`);
      return;
    }

    const docTypeLabel = params.documentType === 'RECEIPT' ? 'Receipt' : params.documentType === 'QUOTE' ? 'Quote' : 'Invoice';
    const subject = `Your ${docTypeLabel} ${params.documentNumber} from A1 Service Expert`;

    const html = `
      <div style="background-color:#0f172a;padding:32px 16px;font-family:'Inter',Arial,sans-serif;color:#0f172a;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(15,23,42,0.25);">
          <div style="background:linear-gradient(135deg,#020617,#0f172a);padding:32px;text-align:center;">
            <h1 style="color:#f97316;font-size:24px;margin:0;">A1 Service Expert</h1>
            <p style="color:#e2e8f0;font-size:14px;margin:12px 0 0;letter-spacing:0.08em;text-transform:uppercase;">${docTypeLabel}</p>
          </div>
          <div style="padding:32px 28px 24px;">
            <p style="font-size:16px;color:#0f172a;margin:0 0 16px;">Hi ${params.customerName},</p>
            <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
              Please find attached your ${docTypeLabel.toLowerCase()} <strong>${params.documentNumber}</strong> for <strong>${params.totalAmount}</strong>.
            </p>
            ${params.documentType === 'INVOICE' ? `
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
                Thank you for your business. If you have any questions, please don't hesitate to contact us.
              </p>
            ` : params.documentType === 'RECEIPT' ? `
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
                Thank you for your payment. This serves as confirmation of your transaction.
              </p>
            ` : `
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
                Please review the attached quote. We look forward to working with you.
              </p>
            `}
            <div style="border-top:1px solid #e2e8f0;padding-top:18px;margin-top:18px;font-size:13px;color:#475569;line-height:1.6;">
              <p style="margin:0 0 6px;">A1 Service Expert</p>
              <p style="margin:0 0 6px;">11 Cunliffe Dr, Kettering NN16 8LD</p>
              <p style="margin:0 0 6px;">Phone: 07394 433889 � Email: ${SUPPORT_EMAIL}</p>
            </div>
          </div>
        </div>
      </div>
    `;

    const text = `
${docTypeLabel} ${params.documentNumber}

Hi ${params.customerName},

Please find attached your ${docTypeLabel.toLowerCase()} ${params.documentNumber} for ${params.totalAmount}.

${params.documentType === 'INVOICE' ? 'Thank you for your business. If you have any questions, please don\'t hesitate to contact us.' : params.documentType === 'RECEIPT' ? 'Thank you for your payment. This serves as confirmation of your transaction.' : 'Please review the attached quote. We look forward to working with you.'}

A1 Service Expert
11 Cunliffe Dr, Kettering NN16 8LD
Phone: 07394 433889
Email: ${SUPPORT_EMAIL}
    `.trim();

    const attachments: Array<{ filename: string; path: string }> = [];
    if (params.pdfPath) {
      attachments.push({
        filename: `${params.documentNumber}.pdf`,
        path: params.pdfPath,
      });
    }

    try {
      await transporter.sendMail({
        from: this.getFromHeader(config),
        to: params.to,
        subject,
        html,
        text,
        attachments,
      });
      this.logger.log(`Sent ${params.documentType} email to ${params.to}: ${params.documentNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send ${params.documentType} email via SMTP`, error as Error);
      throw error;
    }
  }

  private getFromHeader(config: SmtpConfig): string {
    const safeName = config.fromName.replace(/"/g, "'");
    return `"${safeName}" <${config.fromEmail}>`;
  }

  private loadLogoDataUri(): string | null {
    if (this.logoDataUri !== undefined) {
      return this.logoDataUri;
    }
    this.logoDataUri = tryLoadLogoDataUri(this.logger);
    return this.logoDataUri;
  }

  private formatCurrency(pence: number): string {
    return formatCurrencyGBP(pence);
  }

  private formatDate(date: Date): string {
    return formatDateLong(date);
  }

  private getPortalBaseUrl(): string {
    const fallback = 'http://localhost:5173';
    const envUrl = this.configService.get<string>('PORTAL_BASE_URL');
    if (!envUrl) {
      return fallback;
    }
    try {
      const parsed = new URL(envUrl);
      return parsed.origin;
    } catch {
      return fallback;
    }
  }

  private buildBookingUrl(bookingId?: number): string {
    const portalBase = this.getPortalBaseUrl().replace(/\/$/, '');
    if (!bookingId) {
      return `${portalBase}/account/bookings`;
    }
    return `${portalBase}/account/bookings/${bookingId}`;
  }

  private dedupeValues(emails: Array<string | null | undefined>): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of emails) {
      if (!value) {
        continue;
      }
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        continue;
      }
      const lower = trimmed.toLowerCase();
      if (seen.has(lower)) {
        continue;
      }
      seen.add(lower);
      result.push(trimmed);
    }
    return result;
  }

  private buildVehicleLine(payload: BookingConfirmationEmail): string {
    const parts = [
      payload.vehicle.registration.toUpperCase(),
      payload.vehicle.make ?? undefined,
      payload.vehicle.model ?? undefined,
      payload.vehicle.engineSizeCc ? `${payload.vehicle.engineSizeCc}cc` : undefined,
    ].filter((value): value is string => Boolean(value && value.trim().length > 0));
    return parts.join(' - ');
  }

  // Verification emails are not used; users are auto-verified on registration.

  async sendBookingConfirmation(payload: BookingConfirmationEmail): Promise<void> {
    const gateway = await this.getTransportGateway();
    const config = this.loadConfig();
    const staffRecipients = this.dedupeValues([...(payload.adminRecipients ?? []), SUPPORT_EMAIL]);

    if (!gateway || !config) {
      this.logger.log(
        `Booking confirmed for ${payload.customer.name}: ${payload.service.name} at ${payload.slotDate.toISOString()} ${payload.slotTime}. Staff notified: ${staffRecipients.join(', ') || 'none'}`,
      );
      return;
    }
    const renderer = this.getTemplateRenderer();
    const { subject: customerSubject, html: customerHtml, text: customerText } = await renderer.render({
      template: 'booking-customer',
      data: payload as unknown as Record<string, unknown>,
    });

    try {
      await gateway.send({
        from: this.getFromHeader(config),
        to: payload.customer.email,
        subject: customerSubject,
        html: customerHtml,
        text: customerText,
      });
    } catch (error) {
      this.logger.error('Failed to send customer booking confirmation via SMTP', error as Error);
    }

    if (staffRecipients.length === 0) {
      return;
    }

    const { subject: staffSubject, html: staffHtml, text: staffText } = await renderer.render({
      template: 'booking-staff',
      data: payload as unknown as Record<string, unknown>,
    });

    try {
      await gateway.send({
        from: this.getFromHeader(config),
        to: staffRecipients,
        subject: staffSubject,
        html: staffHtml,
        text: staffText,
      });
    } catch (error) {
      this.logger.error('Failed to send staff booking notification via SMTP', error as Error);
    }
  }

  async sendContactMessage(payload: ContactMessage): Promise<void> {
    const gateway = await this.getTransportGateway();
    const config = this.loadConfig();
    const to = payload.recipients.filter((recipient) => recipient.trim().length > 0);

    const renderer = this.getTemplateRenderer();
    const { subject, html: htmlBody, text: textBody } = await renderer.render({
      template: 'contact-message',
      data: payload as unknown as Record<string, unknown>,
    });

    if (!gateway || !config || to.length === 0) {
      this.logger.log(`Contact request from ${payload.fromName} <${payload.fromEmail}>: ${payload.message}`);
      return;
    }

    try {
      await gateway.send({
        from: this.getFromHeader(config),
        to,
        subject,
        html: htmlBody,
        text: textBody,
      });
    } catch (error) {
      this.logger.error('Failed to send contact notification email via SMTP', error as Error);
      this.logger.log(`Contact request from ${payload.fromName} <${payload.fromEmail}>: ${payload.message}`);
    }
  }

}

/**
 * EmailService
 *
 * Purpose
 * - Builds and sends transactional emails (booking confirmations, invoices,
 *   quotes, reminders) using templates and provider transport.
 *
 * Notes
 * - File contains transport config, template rendering, and message assembly.
 * - Consider separating template building from transport sending.
 *
 * Safe Refactor Plan
 * - Extract TemplateRenderer (inputs: template id + data ? subject/body).
 * - Extract TransportGateway (sendMail abstraction with provider config).
 * - Keep EmailService as a fa�ade composing renderer + transport.
 */
