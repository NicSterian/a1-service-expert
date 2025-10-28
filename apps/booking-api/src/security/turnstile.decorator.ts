import { SetMetadata } from '@nestjs/common';

export const TURNSTILE_FIELD_KEY = 'turnstile:field';

export const TurnstileProtected = (fieldName = 'captchaToken') => SetMetadata(TURNSTILE_FIELD_KEY, fieldName);

