import { IsString, Matches, MinLength } from 'class-validator';

const REGISTRATION_REGEX = /^[A-Z0-9\s-]+$/i;

export class TestDvlaLookupDto {
  @IsString()
  @MinLength(2)
  @Matches(REGISTRATION_REGEX, { message: 'Registration must contain only alphanumeric characters, spaces, or hyphens' })
  reg!: string;
}
