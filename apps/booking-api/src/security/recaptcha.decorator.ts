import { SetMetadata } from '@nestjs/common';

export const RECAPTCHA_FIELD_KEY = 'recaptcha:field';

export const RecaptchaProtected = (fieldName = 'captchaToken') =>
  SetMetadata(RECAPTCHA_FIELD_KEY, fieldName);
