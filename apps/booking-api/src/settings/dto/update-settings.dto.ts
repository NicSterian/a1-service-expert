import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
} from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  companyName?: string | null;

  @IsOptional()
  @IsString()
  companyAddress?: string | null;

  @IsOptional()
  @IsString()
  companyPhone?: string | null;

  @IsOptional()
  @IsString()
  vatNumber?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  vatRatePercent?: number;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(24)
  @Matches(TIME_REGEX, { each: true, message: 'defaultSlots must contain HH:mm values' })
  defaultSlots?: string[];

  @IsOptional()
  @IsString()
  bankHolidayRegion?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(180)
  holdMinutes?: number;

  @IsOptional()
  @IsBoolean()
  captchaEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  captchaRequireInDev?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  vrmLookupRateLimitPerMinute?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  signupRateLimitPerHour?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bookingConfirmRateLimitPerDay?: number | null;

  @IsOptional()
  @IsString()
  dvlaApiKey?: string | null;
}
