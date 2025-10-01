import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import type Redis from 'ioredis';
import { toUtcDate } from '../common/date-utils';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { SettingsService } from '../settings/settings.service';

interface HoldMetadata {
  date: string;
  time: string;
}

@Injectable()
export class HoldsService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly settingsService: SettingsService,
    private readonly prisma: PrismaService,
  ) {}

  async createHold(date: string, time: string): Promise<{ holdId: string }> {
    const slotKey = this.slotKey(date, time);
    const existingHold = await this.redis.get(slotKey);
    if (existingHold) {
      throw new ConflictException('Slot is already held.');
    }

    const dateUtc = toUtcDate(date);
    const booking = await this.prisma.booking.findFirst({
      where: {
        slotDate: dateUtc,
        slotTime: time,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.HELD] },
      },
    });
    if (booking) {
      throw new ConflictException('Slot is already booked.');
    }

    const settings = await this.settingsService.getSettings();
    const ttlSeconds = (settings.holdMinutes ?? 10) * 60;
    const holdId = randomUUID();
    const holdKey = this.holdKey(holdId);
    const payload: HoldMetadata = { date, time };

    await this.redis
      .multi()
      .set(holdKey, JSON.stringify(payload), 'EX', ttlSeconds)
      .set(slotKey, holdId, 'EX', ttlSeconds)
      .exec();

    return { holdId };
  }

  async releaseHold(holdId: string): Promise<void> {
    const holdKey = this.holdKey(holdId);
    const data = await this.redis.get(holdKey);
    if (!data) {
      throw new NotFoundException('Hold not found');
    }

    const metadata = JSON.parse(data) as HoldMetadata;
    await this.redis.del(holdKey);
    await this.redis.del(this.slotKey(metadata.date, metadata.time));
  }

  async getHeldSlots(date: string): Promise<Set<string>> {
    const keys = await this.redis.keys(this.slotKey(date, '*'));
    const times = keys
      .map((key) => key.split(':')[2])
      .filter((value): value is string => Boolean(value))
      .map((value) => value.replace('-', ':'));
    return new Set(times);
  }

  private holdKey(holdId: string): string {
    return `hold:${holdId}`;
  }

  private slotKey(date: string, time: string): string {
    const safeTime = time === '*' ? '*' : time.replace(':', '-');
    return `slot-hold:${date}:${safeTime}`;
  }
}
