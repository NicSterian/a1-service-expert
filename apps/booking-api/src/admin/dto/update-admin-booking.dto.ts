import { BookingStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export const PAYMENT_STATUS_VALUES = ['UNPAID', 'PAID', 'PARTIAL'] as const;
export type PaymentStatusValue = (typeof PAYMENT_STATUS_VALUES)[number];

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatus)
  status: BookingStatus;
}

export class UpdateInternalNotesDto {
  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class UpdatePaymentStatusDto {
  @IsOptional()
  @IsIn(PAYMENT_STATUS_VALUES)
  paymentStatus?: PaymentStatusValue;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  landline?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  addressLine3?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  county?: string;

  @IsOptional()
  @IsString()
  postcode?: string;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  registration?: string;

  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  engineSizeCc?: number | null;
}

export class UpdateServiceLineDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  unitPricePence?: number;

  @IsOptional()
  @IsInt()
  engineTierId?: number | null;

  @IsOptional()
  @IsInt()
  serviceId?: number;
}
