/**
 * DefaultTemplateRenderer
 *
 * Delegates template rendering to hooks provided by EmailService to
 * preserve existing subjects and body content without behaviour changes.
 * Phase 2 will migrate template building fully into this class.
 */
import type { TemplateRenderer, TemplateRenderOutput } from '../template-renderer';

type Hooks = {
  formatDate: (date: Date) => string;
  customerHtml: (payload: any) => string;
  customerText: (payload: any) => string;
  staffHtml: (payload: any, recipients: string[]) => string;
  staffText: (payload: any) => string;
};

export class DefaultTemplateRenderer implements TemplateRenderer {
  constructor(private readonly hooks: Hooks) {}

  async render(input: { template: string; data: Record<string, unknown> }): Promise<TemplateRenderOutput> {
    switch (input.template) {
      case 'booking-customer': {
        const p = input.data as any;
        // Subject mirrors previous logic: computed in EmailService
        return {
          subject: `Booking confirmed for ${this.hooks.formatDate(p.slotDate)} at ${p.slotTime}`,
          html: this.hooks.customerHtml(p),
          text: this.hooks.customerText(p),
        };
      }
      case 'booking-staff': {
        const p = input.data as any;
        return {
          subject: `New booking: ${p.customer.name} on ${this.hooks.formatDate(p.slotDate)} ${p.slotTime}`,
          html: this.hooks.staffHtml(p, (p.adminRecipients ?? []) as string[]),
          text: this.hooks.staffText(p),
        };
      }
      case 'contact-message': {
        const p = input.data as any;
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
          .filter(Boolean)
          .join('\n');
        return { subject, html, text };
      }
      default:
        return { subject: `[${input.template}]` };
    }
  }
}
