import { ServicePricingMode } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 64)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 128)
  name!: string;

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

