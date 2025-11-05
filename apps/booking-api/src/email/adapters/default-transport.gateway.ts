/**
 * DefaultTransportGateway
 *
 * Nodemailer-backed TransportGateway used by EmailService by default.
 * Keeps behaviour identical to the inline implementation that was
 * previously constructed inside EmailService.
 */
import type { Transporter } from 'nodemailer';
import type { TransportGateway, SendRequest, SendResult } from '../transport-gateway';

export class DefaultTransportGateway implements TransportGateway {
  constructor(private readonly transporter: Transporter) {}

  async send(req: SendRequest): Promise<SendResult> {
    const info = await this.transporter.sendMail({
      from: req.from,
      to: req.to as any,
      subject: req.subject,
      text: req.text,
      html: req.html,
      attachments: req.attachments as any,
    });
    return { messageId: (info as any)?.messageId, provider: 'smtp' };
  }
}

