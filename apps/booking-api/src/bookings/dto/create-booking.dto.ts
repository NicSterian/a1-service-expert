import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class VehicleDetailsDto {
  @IsOptional()
  @IsString()
  vrm?: string;

  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  engineSizeCc?: number;

  @IsOptional()
  @IsBoolean()
  manualEntry?: boolean;
}

export class CustomerDetailsDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateBookingDto {
  @IsInt()
  serviceId!: number;

  @IsInt()
  engineTierId!: number;

  @IsOptional()
  @IsInt()
  pricePence?: number;

  @IsDateString()
  date!: string;

  @Matches(TIME_REGEX, { message: 'time must be in HH:mm format' })
  time!: string;

  @IsOptional()
  @IsString()
  holdId?: string;

  @ValidateNested()
  @Type(() => VehicleDetailsDto)
  vehicle!: VehicleDetailsDto;

  @ValidateNested()
  @Type(() => CustomerDetailsDto)
  customer!: CustomerDetailsDto;
}

export class ConfirmBookingDto {
  @IsOptional()
  @IsString()
  captchaToken?: string;
}
