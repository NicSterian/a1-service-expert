/**
 * DefaultTemplateRenderer
 *
 * Consolidates email subject/body/html building. Receives minimal deps
 * so content matches EmailService behaviour exactly.
 */
import type { TemplateRenderer, TemplateRenderOutput } from '../template-renderer';
import type { BookingConfirmationEmail } from '../dto/booking-confirmation-email';
import type { ContactMessage } from '../dto/contact-message';

type Deps = {
  formatDate: (date: Date) => string;
  formatCurrency: (pence: number) => string;
  buildBookingUrl: (bookingId?: number) => string;
  loadLogoDataUri: () => string | null;
  supportEmail: string;
};

export class DefaultTemplateRenderer implements TemplateRenderer {
  constructor(private readonly d: Deps) {}

  async render(input: { template: string; data: Record<string, unknown> }): Promise<TemplateRenderOutput> {
    switch (input.template) {
      case 'booking-customer': {
        const p = input.data as unknown as BookingConfirmationEmail;
        return {
          subject: `Booking confirmed for ${this.d.formatDate(p.slotDate)} at ${p.slotTime}`,
          html: this.renderCustomerBookingHtml(p),
          text: this.renderCustomerBookingText(p),
        };
      }
      case 'booking-staff': {
        const p = input.data as unknown as BookingConfirmationEmail;
        return {
          subject: `New booking: ${p.customer.name} on ${this.d.formatDate(p.slotDate)} ${p.slotTime}`,
          html: this.renderStaffBookingHtml(p, (p.adminRecipients ?? []) as string[]),
          text: this.renderStaffBookingText(p),
        };
      }
      case 'contact-message': {
        const p = input.data as unknown as ContactMessage;
        const subject = `New contact enquiry from ${p.fromName}`;
        const phoneLine = p.fromPhone ? `<p>Phone: ${p.fromPhone}</p>` : '';
        const html = `
      <p>You received a new contact request from the website.</p>
      <p><strong>Name:</strong> ${p.fromName}</p>
      <p><strong>Email:</strong> ${p.fromEmail}</p>
      ${phoneLine}
      <p><strong>Message:</strong></p>
      <p>${String(p.message ?? '').replace(/\n/g, '<br />')}</p>
    `;
        const text = [
          'You received a new contact request from the website.',
          `Name: ${p.fromName}`,
          `Email: ${p.fromEmail}`,
          p.fromPhone ? `Phone: ${p.fromPhone}` : undefined,
          'Message:',
          p.message,
        ]
          .filter((v): v is string => Boolean(v))
          .join('\n');
        return { subject, html, text };
      }
      default:
        return { subject: `[${input.template}]` };
    }
  }

  private renderCustomerBookingHtml(payload: BookingConfirmationEmail): string {
    const logo = this.d.loadLogoDataUri();
    const serviceLine = payload.service.engineTier ? `${payload.service.name} (${payload.service.engineTier})` : payload.service.name;
    const slotDate = this.d.formatDate(payload.slotDate);
    const price = this.d.formatCurrency(payload.totals.pricePence);
    const bookingUrl = this.d.buildBookingUrl(payload.bookingId);

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
              <p style="margin:0 0 6px;">Phone: 07394 433889 ï¿½ Email: ${this.d.supportEmail}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderCustomerBookingText(payload: BookingConfirmationEmail): string {
    const slotDate = this.d.formatDate(payload.slotDate);
    const price = this.d.formatCurrency(payload.totals.pricePence);
    const bookingUrl = this.d.buildBookingUrl(payload.bookingId);
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
      `Email: ${this.d.supportEmail}`,
    ].join('\n');
  }

  private renderStaffBookingHtml(payload: BookingConfirmationEmail, staffRecipients: string[]): string {
    const logo = this.d.loadLogoDataUri();
    const slotDate = this.d.formatDate(payload.slotDate);
    const price = this.d.formatCurrency(payload.totals.pricePence);
    const bookingUrl = this.d.buildBookingUrl(payload.bookingId);
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
                  <td style="padding:8px 0;">${payload.customer.companyName ?? '-'}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:600;">Address</td>
                  <td style="padding:8px 0;">${addressLines.length > 0 ? addressLines.join('<br />') : '-'}</td>
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
              </tbody>
            </table>
            ${documents}
            ${notesSection}
            <div style="margin-top:24px;">
              <a href="${bookingUrl}" style="display:inline-block;background:#f97316;color:#0f172a;font-weight:600;padding:10px 22px;border-radius:999px;text-decoration:none;">Open booking</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderStaffBookingText(payload: BookingConfirmationEmail): string {
    const slotDate = this.d.formatDate(payload.slotDate);
    const price = this.d.formatCurrency(payload.totals.pricePence);
    const bookingUrl = this.d.buildBookingUrl(payload.bookingId);
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
      const link = payload.documents.invoiceUrl ? `<a href="${payload.documents.invoiceUrl}" style=\"color:#2563eb;\">${payload.documents.invoiceNumber}</a>` : payload.documents.invoiceNumber;
      rows.push(`<tr><td style=\"padding:6px 0;width:32%;font-weight:600;\">Invoice</td><td style=\"padding:6px 0;\">${link}</td></tr>`);
    }
    if (payload.documents.quoteNumber) {
      const link = payload.documents.quoteUrl ? `<a href="${payload.documents.quoteUrl}" style=\"color:#2563eb;\">${payload.documents.quoteNumber}</a>` : payload.documents.quoteNumber;
      rows.push(`<tr><td style=\"padding:6px 0;width:32%;font-weight:600;\">Quote</td><td style=\"padding:6px 0;\">${link}</td></tr>`);
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
      return '-';
    }
    return Array.from(new Set(phones.map((p) => p.trim()))).join(' / ');
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
}
