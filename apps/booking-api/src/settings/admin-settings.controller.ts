import { Body, Controller, Get, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Settings } from '@prisma/client';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VrmLookupRateLimitGuard } from '../rate-limit/vrm-lookup-rate-limit.guard';
import { VehiclesService } from '../vehicles/vehicles.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateDvlaKeyDto } from './dto/update-dvla-key.dto';
import { TestDvlaLookupDto } from './dto/test-dvla-lookup.dto';
import { SettingsService } from './settings.service';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  @Get()
  async getSettings() {
    const settings = await this.settingsService.getSettings();
    return this.present(settings);
  }

  @Patch()
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    const updated = await this.settingsService.updateSettings(dto);
    return this.present(updated);
  }

  @Put('dvla')
  async updateDvlaKey(@Body() dto: UpdateDvlaKeyDto, @Req() request: any) {
    const actor = request?.user?.email ?? request?.user?.id ?? 'admin';
    const updated = await this.settingsService.updateDvlaApiKey(dto.dvlaApiKeyPlain ?? null, { actor });
    return this.present(updated);
  }

  @Post('test-dvla')
  @UseGuards(VrmLookupRateLimitGuard)
  async testDvla(@Body() dto: TestDvlaLookupDto) {
    return this.vehiclesService.lookupVrm({ vrm: dto.reg }, { dryRun: true });
  }

  private present(settings: Settings) {
    const { dvlaApiKey, dvlaApiKeyEnc, dvlaApiKeyIv, dvlaApiKeyTag, ...rest } = settings;
    const configured = Boolean(
      (dvlaApiKeyEnc && dvlaApiKeyIv && dvlaApiKeyTag) || (typeof dvlaApiKey === 'string' && dvlaApiKey.trim().length > 0),
    );

    return {
      ...rest,
      dvlaApiKey: null,
      dvlaApiKeyConfigured: configured,
    };
  }
}
