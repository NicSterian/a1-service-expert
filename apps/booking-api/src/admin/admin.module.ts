import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CalendarModule } from '../calendar/calendar.module';
import { CatalogModule } from '../catalog/catalog.module';
import { EmailModule } from '../email/email.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { SettingsModule } from '../settings/settings.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminCalendarController } from './calendar.controller';
import { AdminNotificationRecipientsController } from './notification-recipients.controller';
import { AdminSettingsController } from '../settings/admin-settings.controller';
import { AdminCatalogController } from '../catalog/admin-catalog.controller';
import { AdminUsersController } from './users.controller';
import { AdminBookingsController } from './bookings.controller';
import { AdminSettingsEndpointsController } from './settings-endpoints.controller';
import { DevToolsController } from './dev-tools.controller';
import { DvlaTestController } from './dvla-test.controller';
import { BookingsModule } from '../bookings/bookings.module';
import { AdminLookupsController } from './lookups.controller';
import { DocumentsModule } from '../documents/documents.module';
import { AdminDocumentsController } from './documents.controller';

@Module({
  imports: [
    AuthModule,
    CatalogModule,
    CalendarModule,
    SettingsModule,
    EmailModule,
    VehiclesModule,
    RateLimitModule,
    PrismaModule,
    BookingsModule,
    DocumentsModule,
  ],
  controllers: [
    AdminCalendarController,
    AdminCatalogController,
    AdminSettingsController,
    AdminNotificationRecipientsController,
    AdminUsersController,
    AdminBookingsController,
    AdminSettingsEndpointsController,
    DevToolsController,
    DvlaTestController,
    AdminLookupsController,
    AdminDocumentsController,
  ],
})
export class AdminModule {}
