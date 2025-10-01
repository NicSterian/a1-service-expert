import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { BookingConfirmRateLimitGuard } from './booking-confirm-rate-limit.guard';
import { RateLimitService } from './rate-limit.service';
import { SignupRateLimitGuard } from './signup-rate-limit.guard';
import { VrmLookupRateLimitGuard } from './vrm-lookup-rate-limit.guard';

@Module({
  imports: [SettingsModule],
  providers: [RateLimitService, SignupRateLimitGuard, VrmLookupRateLimitGuard, BookingConfirmRateLimitGuard],
  exports: [RateLimitService, SignupRateLimitGuard, VrmLookupRateLimitGuard, BookingConfirmRateLimitGuard],
})
export class RateLimitModule {}
