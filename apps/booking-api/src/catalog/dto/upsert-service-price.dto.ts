import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpsertServicePriceDto {
  @Type(() => Number)
  @IsInt()
  serviceId!: number;

  @Type(() => Number)
  @IsInt()
  engineTierId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  amountPence!: number;
}
