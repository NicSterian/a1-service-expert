import { Type } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  IsPositive,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
  Min,
} from 'class-validator';

// Customer details
export class ManualBookingCustomerDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postcode?: string;
}

// Vehicle details
export class ManualBookingVehicleDto {
  @IsString()
  registration: string;

  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  engineSizeCc?: number;
}

// Service item
export class ManualBookingServiceItemDto {
  @IsInt()
  @IsPositive()
  serviceId: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  engineTierId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceOverridePence?: number;
}

// Scheduling details
export class ManualBookingSchedulingDto {
  @IsEnum(['SLOT', 'CUSTOM'])
  mode: 'SLOT' | 'CUSTOM';

  @IsOptional()
  @IsString()
  slotDate?: string; // YYYY-MM-DD format (for SLOT mode)

  @IsOptional()
  @IsString()
  slotTime?: string; // HH:mm format (for SLOT mode)

  @IsOptional()
  @IsString()
  customDate?: string; // ISO datetime (for CUSTOM mode)
}

// Main DTO
export class CreateManualBookingDto {
  @ValidateNested()
  @Type(() => ManualBookingCustomerDto)
  customer: ManualBookingCustomerDto;

  @ValidateNested()
  @Type(() => ManualBookingVehicleDto)
  vehicle: ManualBookingVehicleDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualBookingServiceItemDto)
  services: ManualBookingServiceItemDto[];

  @ValidateNested()
  @Type(() => ManualBookingSchedulingDto)
  scheduling: ManualBookingSchedulingDto;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsEnum(['UNPAID', 'PAID', 'PARTIAL'])
  paymentStatus?: 'UNPAID' | 'PAID' | 'PARTIAL';
}

