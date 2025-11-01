import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CalendarModule } from '../calendar/calendar.module';
import { CatalogModule } from '../catalog/catalog.module';
import { EmailModule } from '../email/email.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminCalendarController } from './calendar.controller';
import { AdminNotificationRecipientsController } from './notification-recipients.controller';
import { AdminSettingsController } from '../settings/admin-settings.controller';
import { AdminCatalogController } from '../catalog/admin-catalog.controller';

@Module({
  imports: [AuthModule, CatalogModule, CalendarModule, SettingsModule, EmailModule, VehiclesModule, RateLimitModule],
  controllers: [
    AdminCalendarController,
    AdminCatalogController,
    AdminSettingsController,
    AdminNotificationRecipientsController,
  ],
})
export class AdminModule {}
