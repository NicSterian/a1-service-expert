import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { SettingsService } from '../settings/settings.service';

class CompanySettingsDto {
  companyName?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  vatNumber?: string | null;
  vatRatePercent?: string;
  timezone?: string;
  logoUrl?: string | null;
  bankHolidayRegion?: string;
}

class DvlaKeyDto {
  apiKey: string;
}

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/settings')
export class AdminSettingsEndpointsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('company')
  async getCompanySettings() {
    const settings = await this.settingsService.getSettings();
    return {
      companyName: settings.companyName,
      companyAddress: settings.companyAddress,
      companyPhone: settings.companyPhone,
      vatNumber: settings.vatNumber,
      vatRatePercent: settings.vatRatePercent.toString(),
      timezone: settings.timezone,
      logoUrl: settings.logoUrl,
      bankHolidayRegion: settings.bankHolidayRegion,
    };
  }

  @Put('company')
  async updateCompanySettings(@Body() dto: CompanySettingsDto) {
    const updates: any = {};
    if (dto.companyName !== undefined) updates.companyName = dto.companyName;
    if (dto.companyAddress !== undefined) updates.companyAddress = dto.companyAddress;
    if (dto.companyPhone !== undefined) updates.companyPhone = dto.companyPhone;
    if (dto.vatNumber !== undefined) updates.vatNumber = dto.vatNumber;
    if (dto.vatRatePercent !== undefined) updates.vatRatePercent = dto.vatRatePercent;
    if (dto.timezone !== undefined) updates.timezone = dto.timezone;
    if (dto.logoUrl !== undefined) updates.logoUrl = dto.logoUrl;
    if (dto.bankHolidayRegion !== undefined) updates.bankHolidayRegion = dto.bankHolidayRegion;

    await this.settingsService.updateSettings(updates);
    return { success: true };
  }

  @Put('dvla-key')
  async updateDvlaKey(@Body() dto: DvlaKeyDto) {
    await this.settingsService.updateDvlaApiKey(dto.apiKey);
    return { success: true };
  }
}
