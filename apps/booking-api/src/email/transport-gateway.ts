/**
 * TransportGateway
 *
 * Abstraction for sending an email message through a provider transport.
 * This is a scaffold for future refactor; not yet wired into EmailService.
 */

export type EmailAddress = string;

export type SendRequest = {
  from: EmailAddress;
  to: EmailAddress | EmailAddress[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
};

export type SendResult = {
  messageId?: string;
  provider?: string;
};

export interface TransportGateway {
  send(request: SendRequest): Promise<SendResult>;
}

/**
 * NoopTransportGateway
 * A minimal gateway that pretends to send mail. Useful as a seam for tests
 * and while migrating EmailService.
 */
export class NoopTransportGateway implements TransportGateway {
  async send(_: SendRequest): Promise<SendResult> {
    return { messageId: 'noop', provider: 'noop' };
  }
}

