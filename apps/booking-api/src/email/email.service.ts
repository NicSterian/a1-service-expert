import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface BookingConfirmationEmail {
  customerEmail: string;
  customerName: string;
  slotDate: Date;
  slotTime: string;
  serviceName: string;
  engineTier?: string | null;
  pricePence: number;
  invoiceNumber?: string;
  invoiceUrl?: string;
  quoteNumber?: string;
  quoteUrl?: string;
  adminRecipients?: string[];
}

export interface ContactMessage {
  fromName: string;
  fromEmail: string;
  fromPhone?: string;
  message: string;
  recipients: string[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  private getClient(): Resend | null {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not set. Emails will be logged but not sent.');
      return null;
    }

    return new Resend(apiKey);
  }

  private buildVerificationUrl(token: string): string {
    const base = this.configService.get<string>('EMAIL_VERIFICATION_URL');
    const defaultUrl = 'http://localhost:5173/verify-email';
    const url = base ?? defaultUrl;

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(token)}`;
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = this.buildVerificationUrl(token);
    const resend = this.getClient();

    if (!resend) {
      this.logger.log(`Verification link for ${email}: ${verificationUrl}`);
      return;
    }

    try {
      await resend.emails.send({
        from: '"A1 Service Expert" <no-reply@a1serviceexpert.com>',
        to: email,
        subject: 'Verify your email address',
        html: `
          <p>Hi,</p>
          <p>Please verify your email address to finish creating your account.</p>
          <p><a href="${verificationUrl}">Verify Email</a></p>
          <p>If the button does not work, copy and paste this URL into your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link expires in 24 hours.</p>
        `,
        text: `Hi,\n\nPlease verify your email address to finish creating your account.\n${verificationUrl}\n\nThis link expires in 24 hours.`,
      });
    } catch (error) {
      this.logger.error('Failed to send verification email', error as Error);
      this.logger.log(`Verification link for ${email}: ${verificationUrl}`);
    }
  }

  async sendBookingConfirmation(payload: BookingConfirmationEmail): Promise<void> {
    const resend = this.getClient();
    const formatter = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    });
    const price = formatter.format(payload.pricePence / 100);
    const slotDate = payload.slotDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const engineTier = payload.engineTier ? ` (${payload.engineTier})` : '';
    const message = `Booking confirmed for ${slotDate} at ${payload.slotTime}`;
    const referenceLine = payload.invoiceNumber
      ? `<p>Booking reference: <strong>${payload.invoiceNumber}</strong></p>`
      : '';
    const quoteLine = payload.quoteNumber
      ? `<p>Quote reference: <strong>${payload.quoteNumber}</strong></p>`
      : '';
    const invoiceLink = payload.invoiceUrl ? `<p><a href="${payload.invoiceUrl}">Download invoice</a></p>` : '';
    const quoteLink = payload.quoteUrl ? `<p><a href="${payload.quoteUrl}">Download quote</a></p>` : '';

    if (!resend) {
      this.logger.log(
        `${message} - ${payload.serviceName}${engineTier} - ${price} - reference ${payload.invoiceNumber ?? 'pending'}`,
      );
      return;
    }

    const to = [payload.customerEmail, ...(payload.adminRecipients ?? [])];

    try {
      await resend.emails.send({
        from: '"A1 Service Expert" <no-reply@a1serviceexpert.com>',
        to,
        subject: `Booking confirmed for ${slotDate} ${payload.slotTime}`,
        html: `
          <p>Hi ${payload.customerName},</p>
          <p>Your booking has been confirmed for <strong>${slotDate}</strong> at <strong>${payload.slotTime}</strong>.</p>
          ${referenceLine}
          ${quoteLine}
          <p>Service: <strong>${payload.serviceName}${engineTier}</strong></p>
          <p>Total: <strong>${price}</strong></p>
          ${invoiceLink}
          ${quoteLink}
          <p>We look forward to seeing you.</p>
        `,
        text: `Hi ${payload.customerName},\n\n${message}.\nReference: ${payload.invoiceNumber ?? 'pending'}\nService: ${payload.serviceName}${engineTier}\nTotal: ${price}\n\nWe look forward to seeing you.`,
      });
    } catch (error) {
      this.logger.error('Failed to send booking confirmation email', error as Error);
      this.logger.log(`${message} - ${payload.serviceName}${engineTier} - ${price}`);
    }
  }

  async sendContactMessage(payload: ContactMessage): Promise<void> {
    const resend = this.getClient();
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

    if (!resend || to.length === 0) {
      this.logger.log(`Contact request from ${payload.fromName} <${payload.fromEmail}>: ${payload.message}`);
      return;
    }

    try {
      await resend.emails.send({
        from: '"A1 Service Expert" <no-reply@a1serviceexpert.com>',
        to,
        reply_to: `${payload.fromName} <${payload.fromEmail}>`,
        subject,
        html: htmlBody,
        text: textBody,
      });
    } catch (error) {
      this.logger.error('Failed to send contact notification email', error as Error);
      this.logger.log(`Contact request from ${payload.fromName} <${payload.fromEmail}>: ${payload.message}`);
    }
  }
}
