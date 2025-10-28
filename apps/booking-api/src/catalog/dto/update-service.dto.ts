import { ServicePricingMode } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @Length(2, 64)
  code?: string;

  @IsOptional()
  @IsString()
  @Length(2, 128)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ServicePricingMode)
  pricingMode?: ServicePricingMode;

  @IsOptional()
  @IsInt()
  @Min(0)
  fixedPricePence?: number | null;

  @IsOptional()
  @IsString()
  footnotes?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

