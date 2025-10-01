import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SettingsModule } from '../settings/settings.module';
import { RecaptchaGuard } from './recaptcha.guard';
import { RecaptchaService } from './recaptcha.service';

@Module({
  imports: [ConfigModule, SettingsModule],
  providers: [RecaptchaService, RecaptchaGuard],
  exports: [RecaptchaService, RecaptchaGuard],
})
export class SecurityModule {}
