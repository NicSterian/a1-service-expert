import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toUtcDate } from '../common/date-utils';
import { CreateExceptionDateDto } from './dto/create-exception-date.dto';
import { CreateExtraSlotDto } from './dto/create-extra-slot.dto';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  getExceptionDates() {
    return this.prisma.exceptionDate.findMany({
      orderBy: { date: 'asc' },
    });
  }

  async createExceptionDate(dto: CreateExceptionDateDto) {
    const date = toUtcDate(dto.date);
    return this.prisma.exceptionDate.upsert({
      where: { date },
      update: { reason: dto.reason },
      create: { date, reason: dto.reason },
    });
  }

  async removeExceptionDate(id: number) {
    try {
      await this.prisma.exceptionDate.delete({ where: { id } });
    } catch (error) {
      throw new NotFoundException('Exception date not found');
    }
  }

  getExtraSlots(date?: string) {
    if (date) {
      return this.prisma.extraSlot.findMany({
        where: { date: toUtcDate(date) },
        orderBy: { time: 'asc' },
      });
    }

    return this.prisma.extraSlot.findMany({ orderBy: [{ date: 'asc' }, { time: 'asc' }] });
  }

  async createExtraSlot(dto: CreateExtraSlotDto) {
    const date = toUtcDate(dto.date);
    return this.prisma.extraSlot.create({
      data: { date, time: dto.time },
    });
  }

  async removeExtraSlot(id: number) {
    try {
      await this.prisma.extraSlot.delete({ where: { id } });
    } catch (error) {
      throw new NotFoundException('Extra slot not found');
    }
  }

  async importBankHolidays() {
    const candidates = [
      join(process.cwd(), 'apps', 'booking-api', 'assets', 'bank-holidays', 'england-wales.json'),
      join(process.cwd(), 'assets', 'bank-holidays', 'england-wales.json'),
    ];

    const filePath = await this.resolveExistingPath(candidates);
    const raw = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(raw) as { events?: { date: string; title?: string }[] };
    const events = data.events ?? [];

    for (const event of events) {
      if (!event.date) {
        continue;
      }
      const date = toUtcDate(event.date);
      await this.prisma.exceptionDate.upsert({
        where: { date },
        update: {},
        create: {
          date,
          reason: event.title ?? 'Bank holiday',
        },
      });
    }

    return { imported: events.length };
  }

  private async resolveExistingPath(paths: string[]): Promise<string> {
    for (const path of paths) {
      try {
        await fs.access(path);
        return path;
      } catch {
        // ignore and try next
      }
    }
    throw new NotFoundException('Bank holiday data file not found');
  }
}
