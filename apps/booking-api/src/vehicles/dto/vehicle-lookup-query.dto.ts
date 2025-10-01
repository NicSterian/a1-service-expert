import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class VehicleLookupQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceId?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['1', 'true', 't', 'yes', 'y', 'on'].includes(normalized)) {
        return true;
      }
      if (['0', 'false', 'f', 'no', 'n', 'off'].includes(normalized)) {
        return false;
      }
    }
    return undefined;
  })
  @IsBoolean()
  dryRun?: boolean;
}
