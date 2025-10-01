import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import type { SettingsService } from '../settings/settings.service';
import { VehiclesService } from './vehicles.service';

describe('VehiclesService', () => {
  const configService = {
    get: jest.fn(),
  } as unknown as ConfigService;

  const settingsService = {
    getDecryptedDvlaApiKey: jest.fn(),
  } as unknown as SettingsService;

  const prisma = {
    engineTier: { findMany: jest.fn() },
    servicePrice: { findMany: jest.fn() },
  } as unknown as PrismaService;

  let service: VehiclesService;
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    (settingsService.getDecryptedDvlaApiKey as jest.Mock).mockResolvedValue('test-key');
    service = new VehiclesService(configService, settingsService, prisma);
    global.fetch = originalFetch;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('returns manual fallback when DVLA lookup times out', async () => {
    jest.useFakeTimers();

    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const fetchMock = jest.fn().mockImplementation((_: string, init?: RequestInit) => {
      const signal = init?.signal;
      return new Promise((_, reject) => {
        if (signal) {
          const onAbort = () => {
            signal.removeEventListener('abort', onAbort);
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          };
          signal.addEventListener('abort', onAbort);
        }
      });
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const lookupPromise = service.lookupVrm({ vrm: 'AB12 CDE', serviceId: 1 });
    const timeoutMs = (service as unknown as { dvlaFetchTimeoutMs: number }).dvlaFetchTimeoutMs;

    await jest.advanceTimersByTimeAsync(timeoutMs);
    await expect(lookupPromise).resolves.toEqual({ ok: false, allowManual: true });
    expect(fetchMock).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      `DVLA lookup timed out after ${timeoutMs}ms. Falling back to manual entry.`,
    );
  });
});
