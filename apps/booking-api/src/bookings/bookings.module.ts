import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DocumentsModule } from '../documents/documents.module';
import { EmailModule } from '../email/email.module';
import { HoldsModule } from '../holds/holds.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { SecurityModule } from '../security/security.module';
import { SettingsModule } from '../settings/settings.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [
    PrismaModule,
    SettingsModule,
    EmailModule,
    HoldsModule,
    AuthModule,
    SecurityModule,
    RateLimitModule,
    DocumentsModule,
    VehiclesModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
