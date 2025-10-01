import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

interface RateLimitBucket {
  count: number;
  expiresAt: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly buckets = new Map<string, RateLimitBucket>();

  consume(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.expiresAt <= now) {
      this.buckets.set(key, { count: 1, expiresAt: now + windowMs });
      return { remaining: limit - 1 };
    }

    if (bucket.count >= limit) {
      this.logger.warn(`Rate limit exceeded for key ${key}`);
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    bucket.count += 1;
    return { remaining: Math.max(limit - bucket.count, 0) };
  }
}
