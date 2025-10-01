import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class RecommendEngineTierDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  engineSizeCc!: number;
}
