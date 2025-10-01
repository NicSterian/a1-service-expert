import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from './email.service';
import { NotificationRecipientsService } from './notification-recipients.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [EmailService, NotificationRecipientsService],
  exports: [EmailService, NotificationRecipientsService],
})
export class EmailModule {}
