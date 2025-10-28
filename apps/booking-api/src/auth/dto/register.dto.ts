import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { TITLE_OPTIONS, UK_POSTCODE_REGEX } from '../../common/validation/profile.constants';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  captchaToken!: string;

  @IsIn(TITLE_OPTIONS as readonly string[])
  title!: string;

  @IsString()
  @MinLength(2)
  firstName!: string;

  @IsString()
  @MinLength(2)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyName?: string;

  @IsString()
  @MinLength(6)
  mobileNumber!: string;

  @IsOptional()
  @IsString()
  landlineNumber?: string;

  @IsString()
  @MinLength(2)
  addressLine1!: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  addressLine3?: string;

  @IsString()
  @MinLength(2)
  city!: string;

  @IsString()
  @MinLength(2)
  county!: string;

  @IsString()
  @Matches(UK_POSTCODE_REGEX, { message: 'Invalid UK postcode' })
  postcode!: string;

  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
