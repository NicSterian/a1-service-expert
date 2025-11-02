import { Body, Controller, Get, Patch, Post, Put, Req, Res, SetMetadata, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname, join } from 'path';
import { promises as fs } from 'fs';
import { Settings } from '@prisma/client';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VrmLookupRateLimitGuard } from '../rate-limit/vrm-lookup-rate-limit.guard';
import { VehiclesService } from '../vehicles/vehicles.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateDvlaKeyDto } from './dto/update-dvla-key.dto';
import { TestDvlaLookupDto } from './dto/test-dvla-lookup.dto';
import { SettingsService } from './settings.service';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

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

  @Post('logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@UploadedFile() file?: any) {
    if (!file || !(file as any).buffer) return { ok: false } as const;
    const dir = join(process.cwd(), 'storage', 'uploads');
    await fs.mkdir(dir, { recursive: true });
    const ts = Date.now();
    const ext = extname(file.originalname || '') || '.bin';
    const filename = `logo-${ts}${ext}`;
    const full = join(dir, filename);
    await fs.writeFile(full, (file as any).buffer);
    // Save just the filename, not the full URL path
    const updated = await this.settingsService.updateSettings({ logoUrl: filename } as any);
    return { ok: true, logoUrl: updated.logoUrl };
  }

  @Public()
  @Get('logo/:filename')
  async getLogo(@Req() req: any, @Res() res: Response) {
    const filename = req.params.filename as string;
    const filePath = join(process.cwd(), 'storage', 'uploads', filename);
    return res.sendFile(filePath);
  }
}
