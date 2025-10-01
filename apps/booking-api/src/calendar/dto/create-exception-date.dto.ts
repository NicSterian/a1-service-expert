import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateExceptionDateDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
