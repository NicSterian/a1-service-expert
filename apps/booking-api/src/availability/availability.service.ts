import { Injectable } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HoldsService } from '../holds/holds.service';
import { SettingsService } from '../settings/settings.service';
import { isWeekend, startOfDay, toUtcDate } from '../common/date-utils';

export type AvailabilitySlot = {
  time: string;
  isAvailable: boolean;
};

export type AvailabilityResponse = {
  date: string;
  slots: AvailabilitySlot[];
};

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly holdsService: HoldsService,
  ) {}

  async getAvailability(dateStr: string): Promise<AvailabilityResponse> {
    const date = toUtcDate(dateStr);
    const start = startOfDay(date);

    const exception = await this.prisma.exceptionDate.findUnique({ where: { date: start } });
    if (exception) {
      return { date: dateStr, slots: [] };
    }

    const settings = await this.settingsService.getSettings();
    const weekdayDefaults = Array.isArray(settings.defaultSlotsJson)
      ? (settings.defaultSlotsJson as unknown as string[])
      : [];
    const saturdayDefaults = Array.isArray((settings as any).saturdaySlotsJson)
      ? ((settings as any).saturdaySlotsJson as string[])
      : [];
    const sundayDefaults = Array.isArray((settings as any).sundaySlotsJson)
      ? ((settings as any).sundaySlotsJson as string[])
      : [];

    const allSlots = new Set<string>();

    const day = date.getUTCDay(); // 0=Sun,6=Sat
    if (day === 6) {
      saturdayDefaults.forEach((slot) => allSlots.add(slot));
    } else if (day === 0) {
      sundayDefaults.forEach((slot) => allSlots.add(slot));
    } else {
      weekdayDefaults.forEach((slot) => allSlots.add(slot));
    }

    const extraSlots = await this.prisma.extraSlot.findMany({
      where: { date: start },
      orderBy: { time: 'asc' },
    });
    extraSlots.forEach((slot) => allSlots.add(slot.time));

    if (allSlots.size === 0) {
      return { date: dateStr, slots: [] };
    }

    const candidates = Array.from(allSlots).sort();

    const bookings = await this.prisma.booking.findMany({
      where: {
        slotDate: start,
        slotTime: { in: candidates },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.HELD] },
      },
      select: { slotTime: true },
    });
    const bookedTimes = new Set(bookings.map((b) => b.slotTime));

    const heldTimes = await this.holdsService.getHeldSlots(dateStr);

    const slots = candidates
      .filter((time) => !bookedTimes.has(time) && !heldTimes.has(time))
      .map<AvailabilitySlot>((time) => ({ time, isAvailable: true }));

    return { date: dateStr, slots };
  }
}
