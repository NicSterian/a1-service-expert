import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContactRequestDto } from './dto/contact-request.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async submitContactRequest(dto: ContactRequestDto) {
    try {
      let to: string[] = [];
      try {
        const recipients = await this.prisma.notificationRecipient.findMany();
        to = recipients.map((recipient) => recipient.email);
      } catch (error) {
        this.logger.warn(`Failed to load notification recipients: ${(error as Error).message}`);
        to = [];
      }

      if (to.length === 0) {
        this.logger.warn('No notification recipients configured. Contact form submission will be logged only.');
      }

      await this.emailService.sendContactMessage({
        fromName: dto.name,
        fromEmail: dto.email,
        fromPhone: dto.phone,
        message: dto.message,
        recipients: to,
      });

      return { ok: true };
    } catch (error) {
      this.logger.error('Contact submission failed', error as Error);
      // Always 202 even if email sending/logging fails
      return { ok: true };
    }
  }
}
