import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class ContactRequestDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsString()
  @MaxLength(2000)
  message!: string;
}