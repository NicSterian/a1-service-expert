import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

const SUPPORT_EMAIL = 'support@a1serviceexpert.com';

export interface BookingConfirmationEmail {
  bookingId?: number;
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

  private getFromHeader(config: SmtpConfig): string {
    const safeName = config.fromName.replace(/"/g, "'");
    return `"${safeName}" <${config.fromEmail}>`;
  }

  private loadLogoDataUri(): string | null {
    if (this.logoDataUri !== undefined) {
      return this.logoDataUri;
    }

    const candidatePaths = [
      join(process.cwd(), 'apps', 'booking-web', 'src', 'assets', 'logo-a1.png'),
      join(process.cwd(), 'apps', 'booking-api', 'assets', 'logo-a1.png'),
    ];

    for (const path of candidatePaths) {
      if (existsSync(path)) {
        try {
          const buffer = readFileSync(path);
          this.logoDataUri = `data:image/png;base64,${buffer.toString('base64')}`;
          return this.logoDataUri;
        } catch (error) {
          this.logger.warn(`Failed to load logo for emails from ${path}: ${(error as Error).message}`);
        }
      }
    }

    this.logoDataUri = null;
    return null;
  }

  private formatCurrency(pence: number): string {
    const formatter = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    });
    return formatter.format(pence / 100);
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
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

  private renderCustomerBookingHtml(payload: BookingConfirmationEmail): string {
    const logo = this.loadLogoDataUri();
    const serviceLine = payload.service.engineTier ? `${payload.service.name} (${payload.service.engineTier})` : payload.service.name;
    const slotDate = this.formatDate(payload.slotDate);
    const price = this.formatCurrency(payload.totals.pricePence);
    const bookingUrl = this.buildBookingUrl(payload.bookingId);

    return `
      <div style="background-color:#0f172a;padding:32px 16px;font-family:'Inter',Arial,sans-serif;color:#0f172a;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(15,23,42,0.25);">
          <div style="background:linear-gradient(135deg,#020617,#0f172a);padding:32px;text-align:center;">
            ${logo ? `<img src="${logo}" alt="A1 Service Expert" style="height:56px;" />` : '<h1 style="color:#f97316;font-size:24px;margin:0;">A1 Service Expert</h1>'}
            <p style="color:#e2e8f0;font-size:14px;margin:12px 0 0;letter-spacing:0.08em;text-transform:uppercase;">Booking confirmation</p>
          </div>
          <div style="padding:32px 28px 24px;">
            <p style="font-size:16px;color:#0f172a;margin:0 0 16px;">Hi ${payload.customer.name},</p>
            <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
              Your booking is confirmed for <strong>${slotDate}</strong> at <strong>${payload.slotTime}</strong>.
            </p>
            <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;background:#f8fafc;">
              <h2 style="margin:0 0 12px;font-size:16px;color:#0f172a;">Booking summary</h2>
              <table style="width:100%;border-collapse:collapse;color:#334155;font-size:14px;">
                <tbody>
                  <tr>
                    <td style="padding:6px 0;font-weight:600;width:40%;">Service</td>
                    <td style="padding:6px 0;text-align:right;">${serviceLine}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-weight:600;">Vehicle</td>
                    <td style="padding:6px 0;text-align:right;">${payload.vehicle.registration.toUpperCase()}${payload.vehicle.make ? ` - ${payload.vehicle.make}` : ''}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-weight:600;">Date & time</td>
                    <td style="padding:6px 0;text-align:right;">${slotDate} - ${payload.slotTime}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-weight:600;">Total</td>
                    <td style="padding:6px 0;text-align:right;font-size:15px;color:#0f172a;"><strong>${price}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${bookingUrl}" style="display:inline-block;background:#f97316;color:#0f172a;font-weight:600;padding:12px 28px;border-radius:999px;text-decoration:none;">View my booking</a>
            </div>
            <div style="border-top:1px solid #e2e8f0;padding-top:18px;margin-top:18px;font-size:13px;color:#475569;line-height:1.6;">
              <p style="margin:0 0 6px;">A1 Service Expert</p>
              <p style="margin:0 0 6px;">11 Cunliffe Dr, Kettering NN16 8LD</p>
              <p style="margin:0 0 6px;">Phone: 07394 433889 · Email: ${SUPPORT_EMAIL}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderCustomerBookingText(payload: BookingConfirmationEmail): string {
    const slotDate = this.formatDate(payload.slotDate);
    const price = this.formatCurrency(payload.totals.pricePence);
    const bookingUrl = this.buildBookingUrl(payload.bookingId);
    const serviceLine = payload.service.engineTier ? `${payload.service.name} (${payload.service.engineTier})` : payload.service.name;

    return [
      `Booking confirmation for ${payload.customer.name}`,
      `Service: ${serviceLine}`,
      `Vehicle: ${payload.vehicle.registration.toUpperCase()}${payload.vehicle.make ? ` - ${payload.vehicle.make}` : ''}`,
      `Date: ${slotDate} at ${payload.slotTime}`,
      `Total: ${price}`,
      '',
      `View your booking: ${bookingUrl}`,
      '',
      'A1 Service Expert',
      '11 Cunliffe Dr, Kettering NN16 8LD',
      'Phone: 07394 433889',
      `Email: ${SUPPORT_EMAIL}`,
    ].join('\n');
  }

  private renderStaffBookingHtml(payload: BookingConfirmationEmail, staffRecipients: string[]): string {
    const logo = this.loadLogoDataUri();
    const slotDate = this.formatDate(payload.slotDate);
    const price = this.formatCurrency(payload.totals.pricePence);
    const bookingUrl = this.buildBookingUrl(payload.bookingId);
    const serviceLine = payload.service.engineTier ? `${payload.service.name} (${payload.service.engineTier})` : payload.service.name;
    const addressLines = this.formatAddressLines(payload);

    const notesSection = payload.customer.notes
      ? `<div style="margin-top:16px;padding:16px;border:1px solid #fde68a;background:#fef3c7;border-radius:8px;"><strong>Customer notes</strong><p style="margin:8px 0 0;white-space:pre-wrap;color:#78350f;">${payload.customer.notes}</p></div>`
      : '';

    const documents = this.renderDocumentList(payload);

    return `
      <div style="background-color:#0f172a;padding:32px 16px;font-family:'Inter',Arial,sans-serif;color:#0f172a;">
        <div style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(15,23,42,0.3);">
          <div style="background:linear-gradient(135deg,#020617,#0f172a);padding:28px 32px;display:flex;align-items:center;justify-content:space-between;">
            <div>
              ${logo ? `<img src="${logo}" alt="A1 Service Expert" style="height:48px;" />` : '<h1 style="color:#f97316;font-size:22px;margin:0;">A1 Service Expert</h1>'}
              <p style="color:#e2e8f0;font-size:13px;margin:8px 0 0;letter-spacing:0.08em;text-transform:uppercase;">Staff notification</p>
            </div>
            <div style="text-align:right;color:#cbd5f5;font-size:12px;">
              <p style="margin:0;">Recipients:</p>
              <p style="margin:4px 0 0;">${staffRecipients.join(', ')}</p>
            </div>
          </div>
          <div style="padding:32px;">
            <h2 style="margin:0 0 16px;font-size:20px;color:#0f172a;">New booking confirmed</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1e293b;">
              <tbody>
                <tr>
                  <td style="padding:8px 0;font-weight:600;width:32%;">Customer</td>
                  <td style="padding:8px 0;">${payload.customer.name}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:600;">Email</td>
                  <td style="padding:8px 0;">${payload.customer.email}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:600;">Phone</td>
                  <td style="padding:8px 0;">${this.buildPhoneLine(payload)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:600;">Company</td>
                  <td style="padding:8px 0;">${payload.customer.companyName ?? '—'}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:600;">Address</td>
                  <td style="padding:8px 0;">${addressLines.length > 0 ? addressLines.join('<br />') : '—'}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:600;">Service</td>
                  <td style="padding:8px 0;">${serviceLine}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:600;">Schedule</td>
                  <td style="padding:8px 0;">${slotDate} at ${payload.slotTime}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:600;">Vehicle</td>
                  <td style="padding:8px 0;">${this.buildVehicleLine(payload)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:600;">Total</td>
                  <td style="padding:8px 0;">${price}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:600;">Portal link</td>
                  <td style="padding:8px 0;"><a href="${bookingUrl}" style="color:#2563eb;text-decoration:none;">View booking</a></td>
                </tr>
              </tbody>
            </table>
            ${documents}
            ${notesSection}
          </div>
        </div>
      </div>
    `;
  }

  private renderStaffBookingText(payload: BookingConfirmationEmail): string {
    const slotDate = this.formatDate(payload.slotDate);
    const price = this.formatCurrency(payload.totals.pricePence);
    const bookingUrl = this.buildBookingUrl(payload.bookingId);
    const addressLines = this.formatAddressLines(payload);
    const documents = this.buildDocumentLines(payload);

    return [
      'New booking confirmed',
      `Customer: ${payload.customer.name}`,
      `Email: ${payload.customer.email}`,
      `Phone: ${this.buildPhoneLine(payload)}`,
      payload.customer.companyName ? `Company: ${payload.customer.companyName}` : undefined,
      addressLines.length > 0 ? `Address: ${addressLines.join(', ')}` : undefined,
      `Service: ${payload.service.engineTier ? `${payload.service.name} (${payload.service.engineTier})` : payload.service.name}`,
      `Schedule: ${slotDate} at ${payload.slotTime}`,
      `Vehicle: ${this.buildVehicleLine(payload)}`,
      `Total: ${price}`,
      documents.length > 0 ? documents.join('\n') : undefined,
      '',
      `View booking: ${bookingUrl}`,
      payload.customer.notes ? ['', 'Customer notes:', payload.customer.notes].join('\n') : undefined,
    ]
      .filter((line): line is string => Boolean(line))
      .join('\n');
  }

  private renderDocumentList(payload: BookingConfirmationEmail): string {
    if (!payload.documents) {
      return '';
    }

    const rows: string[] = [];
    if (payload.documents.invoiceNumber) {
      const link = payload.documents.invoiceUrl ? `<a href="${payload.documents.invoiceUrl}" style="color:#2563eb;">${payload.documents.invoiceNumber}</a>` : payload.documents.invoiceNumber;
      rows.push(`<tr><td style="padding:6px 0;width:32%;font-weight:600;">Invoice</td><td style="padding:6px 0;">${link}</td></tr>`);
    }
    if (payload.documents.quoteNumber) {
      const link = payload.documents.quoteUrl ? `<a href="${payload.documents.quoteUrl}" style="color:#2563eb;">${payload.documents.quoteNumber}</a>` : payload.documents.quoteNumber;
      rows.push(`<tr><td style="padding:6px 0;width:32%;font-weight:600;">Quote</td><td style="padding:6px 0;">${link}</td></tr>`);
    }

    if (rows.length === 0) {
      return '';
    }

    return `
      <div style="margin-top:24px;">
        <h3 style="margin:0 0 12px;font-size:16px;color:#0f172a;">Documents</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1e293b;">
          <tbody>
            ${rows.join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private buildDocumentLines(payload: BookingConfirmationEmail): string[] {
    if (!payload.documents) {
      return [];
    }

    const result: string[] = [];
    if (payload.documents.invoiceNumber) {
      result.push(`Invoice: ${payload.documents.invoiceNumber}${payload.documents.invoiceUrl ? ` (${payload.documents.invoiceUrl})` : ''}`);
    }
    if (payload.documents.quoteNumber) {
      result.push(`Quote: ${payload.documents.quoteNumber}${payload.documents.quoteUrl ? ` (${payload.documents.quoteUrl})` : ''}`);
    }
    return result;
  }

  private formatAddressLines(payload: BookingConfirmationEmail): string[] {
    const lines = [
      payload.customer.addressLine1,
      payload.customer.addressLine2,
      payload.customer.addressLine3,
      payload.customer.city,
      payload.customer.county,
      payload.customer.postcode,
    ].filter((value): value is string => Boolean(value && value.trim().length > 0));
    return lines;
  }

  private buildPhoneLine(payload: BookingConfirmationEmail): string {
    const phones = [payload.customer.mobile, payload.customer.phone, payload.customer.landline]
      .filter((value): value is string => Boolean(value && value.trim().length > 0));
    if (phones.length === 0) {
      return '—';
    }
    return this.dedupeValues(phones).join(' / ');
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
    const transporter = await this.getTransporter();
    const config = this.loadConfig();
    const staffRecipients = this.dedupeValues([...(payload.adminRecipients ?? []), SUPPORT_EMAIL]);

    if (!transporter || !config) {
      this.logger.log(
        `Booking confirmed for ${payload.customer.name}: ${payload.service.name} at ${payload.slotDate.toISOString()} ${payload.slotTime}. Staff notified: ${staffRecipients.join(', ') || 'none'}`,
      );
      return;
    }

    const customerSubject = `Booking confirmed for ${this.formatDate(payload.slotDate)} at ${payload.slotTime}`;
    const customerHtml = this.renderCustomerBookingHtml(payload);
    const customerText = this.renderCustomerBookingText(payload);

    try {
      await transporter.sendMail({
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

    const staffSubject = `New booking: ${payload.customer.name} on ${this.formatDate(payload.slotDate)} ${payload.slotTime}`;
    const staffHtml = this.renderStaffBookingHtml(payload, staffRecipients);
    const staffText = this.renderStaffBookingText(payload);

    try {
      await transporter.sendMail({
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
    const transporter = await this.getTransporter();
    const config = this.loadConfig();
    const to = payload.recipients.filter((recipient) => recipient.trim().length > 0);

    const subject = `New contact enquiry from ${payload.fromName}`;
    const phoneLine = payload.fromPhone ? `<p>Phone: ${payload.fromPhone}</p>` : '';
    const htmlBody = `
      <p>You received a new contact request from the website.</p>
      <p><strong>Name:</strong> ${payload.fromName}</p>
      <p><strong>Email:</strong> ${payload.fromEmail}</p>
      ${phoneLine}
      <p><strong>Message:</strong></p>
      <p>${payload.message.replace(/\n/g, '<br />')}</p>
    `;
    const textBody = [
      'You received a new contact request from the website.',
      `Name: ${payload.fromName}`,
      `Email: ${payload.fromEmail}`,
      payload.fromPhone ? `Phone: ${payload.fromPhone}` : undefined,
      'Message:',
      payload.message,
    ]
      .filter(Boolean)
      .join('\n');

    if (!transporter || !config || to.length === 0) {
      this.logger.log(`Contact request from ${payload.fromName} <${payload.fromEmail}>: ${payload.message}`);
      return;
    }

    try {
      await transporter.sendMail({
        from: this.getFromHeader(config),
        to,
        replyTo: `${payload.fromName} <${payload.fromEmail}>`,
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

