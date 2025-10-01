import { BookingStatus } from '@prisma/client';
import { AvailabilityService } from './availability.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { HoldsService } from '../holds/holds.service';
import type { SettingsService } from '../settings/settings.service';

describe('AvailabilityService', () => {
  const prisma = {
    exceptionDate: { findUnique: jest.fn() },
    extraSlot: { findMany: jest.fn() },
    booking: { findMany: jest.fn() },
  } as unknown as PrismaService;

  const settingsService = {
    getSettings: jest.fn(),
  } as unknown as SettingsService;

  const holdsService = {
    getHeldSlots: jest.fn(),
  } as unknown as HoldsService;

  const service = new AvailabilityService(prisma, settingsService, holdsService);

  beforeEach(() => {
    jest.resetAllMocks();
    (settingsService.getSettings as jest.Mock).mockResolvedValue({
      defaultSlotsJson: ['09:00', '10:00', '11:00'],
      holdMinutes: 10,
    });
    (prisma.exceptionDate.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.extraSlot.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
    (holdsService.getHeldSlots as jest.Mock).mockResolvedValue(new Set());
  });

  it('returns default slots on a weekday', async () => {
    const response = await service.getAvailability('2025-09-24'); // Wednesday
    expect(response).toEqual({
      date: '2025-09-24',
      slots: [
        { time: '09:00', isAvailable: true },
        { time: '10:00', isAvailable: true },
        { time: '11:00', isAvailable: true },
      ],
    });
  });

  it('returns empty slots on weekend when no extras', async () => {
    const response = await service.getAvailability('2025-09-27'); // Saturday
    expect(response).toEqual({ date: '2025-09-27', slots: [] });
  });

  it('includes extra slots alongside defaults', async () => {
    (prisma.extraSlot.findMany as jest.Mock).mockResolvedValue([
      { time: '13:00' },
    ]);

    const response = await service.getAvailability('2025-09-24');
    expect(response).toEqual({
      date: '2025-09-24',
      slots: [
        { time: '09:00', isAvailable: true },
        { time: '10:00', isAvailable: true },
        { time: '11:00', isAvailable: true },
        { time: '13:00', isAvailable: true },
      ],
    });
  });

  it('returns no slots when an exception date is set', async () => {
    (prisma.exceptionDate.findUnique as jest.Mock).mockResolvedValue({ id: 1, date: new Date(), reason: 'Closed' });
    const response = await service.getAvailability('2025-09-24');
    expect(response).toEqual({ date: '2025-09-24', slots: [] });
  });

  it('excludes slots with confirmed bookings', async () => {
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([
      { slotTime: '10:00', status: BookingStatus.CONFIRMED },
    ]);

    const response = await service.getAvailability('2025-09-24');
    expect(response).toEqual({
      date: '2025-09-24',
      slots: [
        { time: '09:00', isAvailable: true },
        { time: '11:00', isAvailable: true },
      ],
    });
  });

  it('excludes held slots until release', async () => {
    (holdsService.getHeldSlots as jest.Mock).mockResolvedValue(new Set(['09:00']));
    const response = await service.getAvailability('2025-09-24');
    expect(response).toEqual({
      date: '2025-09-24',
      slots: [
        { time: '10:00', isAvailable: true },
        { time: '11:00', isAvailable: true },
      ],
    });
  });
});
