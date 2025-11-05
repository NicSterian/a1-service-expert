import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma, Settings } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { DvlaKeyEncryptionService } from './dvla-key-encryption.service';

const SETTINGS_CACHE_MS = 60_000;

const DEFAULT_SETTINGS: Prisma.SettingsCreateInput = {
  id: 1,
  companyName: 'A1 Service Expert',
  companyAddress: null,
  companyPhone: null,
  vatNumber: null,
  vatRatePercent: new Prisma.Decimal('20.00'),
  timezone: 'Europe/London',
  defaultSlotsJson: ['09:00', '10:00', '11:00'] as Prisma.JsonArray,
  bankHolidayRegion: 'England & Wales',
  logoUrl: null,
  holdMinutes: 10,
  captchaEnabled: true,
  captchaRequireInDev: false,
  vrmLookupRateLimitPerMinute: 10,
  signupRateLimitPerHour: 5,
  bookingConfirmRateLimitPerDay: 5,
  dvlaApiKey: null,
  dvlaApiKeyEnc: null,
  dvlaApiKeyIv: null,
  dvlaApiKeyTag: null,
};

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private cache: { value: Settings; expiresAt: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dvlaEncryption: DvlaKeyEncryptionService,
  ) {}

  async getSettings(): Promise<Settings> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.value;
    }

    const settings = await this.ensureSettings();
    this.updateCache(settings);
    return settings;
  }

  /**
   * Return DVLA API key, preferring DB (encrypted) then falling back to .env (DVLA_API_KEY)
   */
  async getDecryptedDvlaApiKey(): Promise<string | null> {
    const settings = await this.getSettings();
    const fromDb = this.decryptDvlaKey(settings);
    const fromEnv = this.normalizeNullableString(process.env.DVLA_API_KEY ?? null);
    return fromDb ?? fromEnv;
  }

  async isDvlaKeyConfigured(): Promise<boolean> {
    const settings = await this.getSettings();
    const hasDb =
      Boolean(settings.dvlaApiKeyEnc && settings.dvlaApiKeyIv && settings.dvlaApiKeyTag) ||
      Boolean(this.normalizeNullableString(settings.dvlaApiKey));
    const hasEnv = Boolean(this.normalizeNullableString(process.env.DVLA_API_KEY ?? null));
    return hasDb || hasEnv;
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<Settings> {
    const data: Prisma.SettingsUpdateInput = {};

    if (dto.companyName !== undefined) {
      data.companyName = this.normalizeNullableString(dto.companyName);
    }
    if (dto.companyAddress !== undefined) {
      data.companyAddress = this.normalizeNullableString(dto.companyAddress);
    }
    if (dto.companyPhone !== undefined) {
      data.companyPhone = this.normalizeNullableString(dto.companyPhone);
    }
    if (dto.companyRegNumber !== undefined) {
      (data as any).companyRegNumber = this.normalizeNullableString(dto.companyRegNumber);
    }
    if (dto.companyWebsite !== undefined) {
      (data as any).companyWebsite = this.normalizeNullableString(dto.companyWebsite);
    }
    if (dto.vatNumber !== undefined) {
      data.vatNumber = this.normalizeNullableString(dto.vatNumber);
    }
    if (dto.vatRatePercent !== undefined) {
      data.vatRatePercent = new Prisma.Decimal(dto.vatRatePercent);
    }
    if (dto.vatRegistered !== undefined) {
      (data as any).vatRegistered = dto.vatRegistered;
    }
    if (dto.timezone !== undefined) {
      const tz = dto.timezone.trim();
      if (tz.length === 0) {
        throw new BadRequestException('Timezone cannot be empty');
      }
      data.timezone = tz;
    }
    if (dto.defaultSlots !== undefined) {
      data.defaultSlotsJson = dto.defaultSlots as Prisma.JsonArray;
    }
    if (dto.saturdaySlots !== undefined) {
      (data as any).saturdaySlotsJson = dto.saturdaySlots as Prisma.JsonArray;
    }
    if (dto.sundaySlots !== undefined) {
      (data as any).sundaySlotsJson = dto.sundaySlots as Prisma.JsonArray;
    }
    if (dto.bankHolidayRegion !== undefined) {
      const region = dto.bankHolidayRegion.trim();
      if (region.length === 0) {
        throw new BadRequestException('Bank holiday region cannot be empty');
      }
      data.bankHolidayRegion = region;
    }
    if (dto.logoUrl !== undefined) {
      data.logoUrl = this.normalizeNullableString(dto.logoUrl);
    }
    if ((dto as any).invoiceNumberFormat !== undefined) {
      (data as any).invoiceNumberFormat = this.normalizeNullableString((dto as any).invoiceNumberFormat);
    }
    if ((dto as any).brandPrimaryColor !== undefined) {
      (data as any).brandPrimaryColor = this.normalizeNullableString((dto as any).brandPrimaryColor);
    }
    if (dto.invoicePaymentNotes !== undefined) {
      (data as any).invoicePaymentNotes = this.normalizeNullableString(dto.invoicePaymentNotes);
    }
    if ((dto as any).invoiceItems !== undefined) {
      (data as any).invoiceItemsJson = (dto as any).invoiceItems as Prisma.JsonArray;
    }
    if (dto.bankName !== undefined) {
      (data as any).bankName = this.normalizeNullableString(dto.bankName);
    }
    if (dto.bankSortCode !== undefined) {
      (data as any).bankSortCode = this.normalizeNullableString(dto.bankSortCode);
    }
    if (dto.bankAccountNumber !== undefined) {
      (data as any).bankAccountNumber = this.normalizeNullableString(dto.bankAccountNumber);
    }
    if (dto.bankIban !== undefined) {
      (data as any).bankIban = this.normalizeNullableString(dto.bankIban);
    }
    if (dto.bankSwift !== undefined) {
      (data as any).bankSwift = this.normalizeNullableString(dto.bankSwift);
    }
    if (dto.holdMinutes !== undefined) {
      data.holdMinutes = dto.holdMinutes;
    }
    if (dto.captchaEnabled !== undefined) {
      data.captchaEnabled = dto.captchaEnabled;
    }
    if (dto.captchaRequireInDev !== undefined) {
      data.captchaRequireInDev = dto.captchaRequireInDev;
    }
    if (dto.vrmLookupRateLimitPerMinute !== undefined) {
      data.vrmLookupRateLimitPerMinute = dto.vrmLookupRateLimitPerMinute ?? null;
    }
    if (dto.signupRateLimitPerHour !== undefined) {
      data.signupRateLimitPerHour = dto.signupRateLimitPerHour ?? null;
    }
    if (dto.bookingConfirmRateLimitPerDay !== undefined) {
      data.bookingConfirmRateLimitPerDay = dto.bookingConfirmRateLimitPerDay ?? null;
    }

    if (dto.dvlaApiKey !== undefined) {
      const normalized = this.normalizeNullableString(dto.dvlaApiKey);
      if (normalized) {
        const encrypted = this.dvlaEncryption.encrypt(normalized);
        data.dvlaApiKey = null;
        data.dvlaApiKeyEnc = encrypted.ciphertext;
        data.dvlaApiKeyIv = encrypted.iv;
        data.dvlaApiKeyTag = encrypted.tag;
      } else {
        data.dvlaApiKey = null;
        data.dvlaApiKeyEnc = null;
        data.dvlaApiKeyIv = null;
        data.dvlaApiKeyTag = null;
      }
    }

    const updated = await this.prisma.settings.update({
      where: { id: 1 },
      data,
    });

    this.updateCache(updated);
    return updated;
  }

  async updateDvlaApiKey(plainKey: string | null, metadata?: { actor?: string }): Promise<Settings> {
    const normalized = this.normalizeNullableString(plainKey);

    const data: Prisma.SettingsUpdateInput = {
      dvlaApiKey: null,
      dvlaApiKeyEnc: null,
      dvlaApiKeyIv: null,
      dvlaApiKeyTag: null,
    };

    if (normalized) {
      const encrypted = this.dvlaEncryption.encrypt(normalized);
      data.dvlaApiKeyEnc = encrypted.ciphertext;
      data.dvlaApiKeyIv = encrypted.iv;
      data.dvlaApiKeyTag = encrypted.tag;
    }

    const updated = await this.prisma.settings.update({ where: { id: 1 }, data });
    this.updateCache(updated);

    const action = normalized ? 'updated' : 'cleared';
    const actorInfo = metadata?.actor ? ` by ${metadata.actor}` : '';
    this.logger.log(`DVLA API key ${action}${actorInfo}`);

    return updated;
  }

  private decryptDvlaKey(settings: Settings): string | null {
    if (settings.dvlaApiKeyEnc && settings.dvlaApiKeyIv && settings.dvlaApiKeyTag) {
      try {
        const decrypted = this.dvlaEncryption.decrypt({
          ciphertext: settings.dvlaApiKeyEnc,
          iv: settings.dvlaApiKeyIv,
          tag: settings.dvlaApiKeyTag,
        });
        return this.normalizeNullableString(decrypted);
      } catch (error) {
        this.logger.error('Failed to decrypt DVLA API key', error as Error);
        return null;
      }
    }

    return this.normalizeNullableString(settings.dvlaApiKey);
  }

  private async ensureSettings(): Promise<Settings> {
    try {
      return await this.prisma.settings.upsert({
        where: { id: 1 },
        update: {},
        create: DEFAULT_SETTINGS,
      });
    } catch (error) {
      this.logger.error('Failed to initialize settings record', error as Error);
      throw error;
    }
  }

  clearCache() {
    this.cache = null;
  }

  private updateCache(settings: Settings) {
    this.cache = { value: settings, expiresAt: Date.now() + SETTINGS_CACHE_MS };
    try { (global as any).__a1SettingsCache = settings; } catch {}
  }

  private normalizeNullableString(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
