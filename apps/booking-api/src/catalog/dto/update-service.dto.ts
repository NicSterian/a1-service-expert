import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

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
  @IsBoolean()
  isActive?: boolean;
}
