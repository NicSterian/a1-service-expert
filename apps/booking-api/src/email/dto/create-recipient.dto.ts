import { IsEmail } from 'class-validator';

export class CreateNotificationRecipientDto {
  @IsEmail()
  email!: string;
}
