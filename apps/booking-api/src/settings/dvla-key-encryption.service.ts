import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

type CipherPayload = {
  ciphertext: string;
  iv: string;
  tag: string;
};

const AES_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits, recommended for GCM

@Injectable()
export class DvlaKeyEncryptionService {
  private readonly logger = new Logger(DvlaKeyEncryptionService.name);
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const rawKey = this.configService.get<string>('SETTINGS_ENCRYPTION_KEY');
    if (!rawKey) {
      throw new Error('SETTINGS_ENCRYPTION_KEY env var must be set for DVLA encryption');
    }

    const normalized = this.normalizeKey(rawKey);
    if (!normalized || normalized.length !== 32) {
      throw new Error('SETTINGS_ENCRYPTION_KEY must resolve to exactly 32 bytes');
    }

    this.key = normalized;
  }

  encrypt(plainText: string): CipherPayload {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(AES_ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  decrypt(payload: CipherPayload): string {
    const decipher = createDecipheriv(
      AES_ALGORITHM,
      this.key,
      Buffer.from(payload.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  private normalizeKey(raw: string): Buffer | null {
    const trimmed = raw.trim();

    // Try Base64
    try {
      const maybeBase64 = Buffer.from(trimmed, 'base64');
      if (maybeBase64.length === 32) {
        return maybeBase64;
      }
    } catch (error) {
      // ignore
    }

    // Try hex
    if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length === 64) {
      return Buffer.from(trimmed, 'hex');
    }

    // Fallback to UTF-8, expecting exactly 32 bytes/characters
    if (trimmed.length === 32) {
      return Buffer.from(trimmed, 'utf8');
    }

    this.logger.error('SETTINGS_ENCRYPTION_KEY must be 32 bytes in base64, hex, or plain UTF-8');
    return null;
  }
}
