import { IsDateString, Matches } from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateExtraSlotDto {
  @IsDateString()
  date!: string;

  @Matches(TIME_REGEX, { message: 'time must be in HH:mm format' })
  time!: string;
}
