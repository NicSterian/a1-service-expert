import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AccountModule } from './account/account.module';
import { AvailabilityModule } from './availability/availability.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { CalendarModule } from './calendar/calendar.module';
import { CatalogModule } from './catalog/catalog.module';
import { ContactModule } from './contact/contact.module';
import { DocumentsModule } from './documents/documents.module';
import { EmailModule } from './email/email.module';
import { HoldsModule } from './holds/holds.module';
import { PrismaModule } from './prisma/prisma.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { HealthController } from './routes/health.controller';
import { FilesController } from './files/files.controller';
import { SecurityModule } from './security/security.module';
import { SettingsModule } from './settings/settings.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Load both the app-level and repo-root env files (first match wins)
      envFilePath: [
        'apps/booking-api/.env',
        '.env',
      ],
    }),
    PrismaModule,
    SettingsModule,
    EmailModule,
    SecurityModule,
    RateLimitModule,
    HoldsModule,
    CalendarModule,
    AvailabilityModule,
    VehiclesModule,
    CatalogModule,
    AdminModule,
    DocumentsModule,
    ContactModule,
    BookingsModule,
    AuthModule,
    AccountModule,
  ],
  controllers: [HealthController, FilesController],
})
export class AppModule {}
