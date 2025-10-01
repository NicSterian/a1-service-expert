import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDvlaKeyDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  dvlaApiKeyPlain?: string | null;
}
