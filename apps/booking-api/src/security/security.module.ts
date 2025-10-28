import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SettingsModule } from '../settings/settings.module';
import { TurnstileGuard } from './turnstile.guard';
import { TurnstileService } from './turnstile.service';

@Module({
  imports: [ConfigModule, SettingsModule],
  providers: [TurnstileService, TurnstileGuard],
  exports: [TurnstileService, TurnstileGuard],
})
export class SecurityModule {}
