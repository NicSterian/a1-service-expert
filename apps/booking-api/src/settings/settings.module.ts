import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsService } from './settings.service';
import { DvlaKeyEncryptionService } from './dvla-key-encryption.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [SettingsService, DvlaKeyEncryptionService],
  exports: [SettingsService],
})
export class SettingsModule {}
