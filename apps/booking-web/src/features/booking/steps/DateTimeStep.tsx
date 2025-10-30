import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { LoadingIndicator } from '../../../components/LoadingIndicator';
import { apiDelete, apiGet, apiPost } from '../../../lib/api';
import { useBookingWizard } from '../state';

type AvailabilityResponse = {
  date: string;
  slots: { time: string; isAvailable: boolean }[];
};

type HoldResponse = {
  holdId: string;
};

const HOLD_DURATION_MS = 10 * 60 * 1000;

const priceFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

const formatPrice = (pricePence?: number) => {
  if (typeof pricePence !== 'number') {
    return 'N/A';
  }
  return priceFormatter.format(pricePence / 100);
};

const formatDateKey = (date: Date) => format(date, 'yyyy-MM-dd');
const isWeekend = (date: Date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

export function DateTimeStep() {
  const navigate = useNavigate();
  const { draft, updateDraft } = useBookingWizard();

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(draft.date ? new Date(draft.date) : null);
  const [slots, setSlots] = useState<AvailabilityResponse['slots']>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [holdError, setHoldError] = useState<string | null>(null);

  const dateKey = selectedDate ? formatDateKey(selectedDate) : null;

  // Must have service, a tier and a price before we allow slot selection.
  const hasPricingSelection = Boolean(
    draft.serviceId && (draft.engineTierId || draft.engineTierCode) && typeof draft.pricePence === 'number',
  );

  // Load slots for the selected date
  useEffect(() => {
    if (!dateKey) {
      setSlots([]);
      return;
    }

    let cancelled = false;

    const fetchAvailability = async () => {
      try {
        setLoadingSlots(true);
        setAvailabilityError(null);

        const { slots: fetchedSlots } = await apiGet<AvailabilityResponse>(`/availability?date=${dateKey}`);

        if (!cancelled) {
          setSlots(fetchedSlots.filter((slot) => slot.isAvailable));
        }
      } catch (error) {
        if (!cancelled) {
          const message = (error as Error).message || 'Unable to load availability. Please try again.';
          setAvailabilityError(message);
          setSlots([]);
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setLoadingSlots(false);
        }
      }
    };

    fetchAvailability();
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  const releaseHold = useCallback(async (holdId: string) => {
    try {
      await apiDelete(`/holds/${holdId}`);
    } catch {
      // best effort – holds expire automatically
    }
  }, []);

  const clearHold = useCallback(
    async (options: { resetTime?: boolean } = {}) => {
      const targetHoldId = draft.holdId;
      try {
        if (targetHoldId) {
          await releaseHold(targetHoldId);
        }
      } finally {
        updateDraft({
          holdId: undefined,
          holdExpiresAt: undefined,
          ...(options.resetTime ? { time: undefined } : {}),
        });
      }
    },
    [draft.holdId, releaseHold, updateDraft],
  );

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const isDisabledDate = (date: Date) => {
    const today = startOfDay(new Date());
    if (!isSameMonth(date, currentMonth)) return true;
    if (isBefore(date, today)) return true;
    if (isWeekend(date)) return true;
    return false;
  };

  const handleSelectDate = async (date: Date) => {
    if (isDisabledDate(date)) return;
    if (selectedDate && isSameDay(selectedDate, date)) return;

    await clearHold({ resetTime: true });

    setSelectedDate(date);
    setSlots([]);
    setHoldError(null);

    updateDraft({
      date: formatDateKey(date),
      time: undefined,
      holdId: undefined,
      holdExpiresAt: undefined,
    });
  };

  const handleSelectTime = async (time: string) => {
    if (!selectedDate) return;

    const selectedKey = formatDateKey(selectedDate);

    // Try to create a server-side hold silently. If it fails, we still let the
    // user continue (time will be set without hold).
    try {
      setHoldError(null);

      await clearHold();

      const { holdId } = await apiPost<HoldResponse>('/holds', {
        date: selectedKey,
        time,
      });

      const expiresAt = new Date(Date.now() + HOLD_DURATION_MS).toISOString();

      updateDraft({
        date: selectedKey,
        time,
        holdId,
        holdExpiresAt: expiresAt,
      });
      // No success toast / no countdown UI by design.
    } catch (error) {
      const message = (error as Error).message || 'Unable to reserve this slot. You can still try to continue.';
      setHoldError(message);

      // Still set the time so the user can proceed; booking will try to confirm anyway.
      updateDraft({
        date: selectedKey,
        time,
        holdId: undefined,
        holdExpiresAt: undefined,
      });
      toast.error(message);
    }
  };

  if (!hasPricingSelection) {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-brand-black">3. Date &amp; Time</h2>
          <p className="text-slate-600">Confirm your pricing before choosing a date and time.</p>
        </header>

        <section className="space-y-4 rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-inner">
          <p className="text-sm text-red-300">Please confirm your engine tier and price before selecting a slot.</p>
          <button
            type="button"
            onClick={() => navigate('../pricing')}
            className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-400"
          >
            Back to pricing
          </button>
        </section>
      </div>
    );
  }

  const handleBack = async () => {
    await clearHold({ resetTime: true });
    navigate('../pricing');
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-brand-black">3. Date &amp; Time</h2>
        <p className="text-slate-600">Pick a weekday slot.</p>
      </header>

      <section className="space-y-6 rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-inner">
        <div className="rounded-2xl bg-slate-800/60 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-slate-400">Service</p>
              <p className="font-semibold text-white">{draft.serviceName ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Vehicle</p>
              <p className="font-semibold uppercase tracking-wide text-white">
                {(draft.vehicle?.vrm ?? '').toUpperCase() || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Price</p>
              <p className="font-semibold text-orange-400">{formatPrice(draft.pricePence)}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
              className="rounded border border-slate-600 px-3 py-1 text-sm text-slate-200 hover:border-orange-500 hover:text-orange-400"
            >
              Previous
            </button>
            <h3 className="text-lg font-medium text-white">{format(currentMonth, 'MMMM yyyy')}</h3>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="rounded border border-slate-600 px-3 py-1 text-sm text-slate-200 hover:border-orange-500 hover:text-orange-400"
            >
              Next
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-sm">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="font-medium text-slate-300">
                {day}
              </div>
            ))}
            {calendarDays.map((day) => {
              const outsideMonth = !isSameMonth(day, currentMonth);
              const disabled = isDisabledDate(day);
              const selected = selectedDate ? isSameDay(selectedDate, day) : false;

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => void handleSelectDate(day)}
                  className={`rounded border px-2 py-3 transition focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    selected
                      ? 'border-orange-500 bg-orange-500 text-black font-semibold'
                      : disabled
                      ? 'border-slate-700 bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'border-slate-600 bg-slate-800 text-slate-100 hover:border-orange-400 hover:bg-slate-700'
                  } ${outsideMonth ? 'opacity-40' : ''}`}
                  aria-pressed={selected}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-lg font-medium text-white">
            {selectedDate ? format(selectedDate, 'd MMMM yyyy') : 'Select a date to view times'}
          </h4>

          {loadingSlots ? (
            <LoadingIndicator label="Checking available times…" />
          ) : availabilityError ? (
            <p className="text-sm text-red-300">{availabilityError}</p>
          ) : selectedDate ? (
            slots.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => {
                  const selected = slot.time === draft.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => void handleSelectTime(slot.time)}
                      className={`rounded border px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        selected
                          ? 'border-orange-500 bg-orange-500 text-black'
                          : 'border-slate-600 bg-slate-800 text-slate-100 hover:border-orange-400 hover:bg-slate-700'
                      }`}
                      aria-pressed={selected}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No slots available for this date.</p>
            )
          ) : (
            <p className="text-sm text-slate-400">Select a date above to see available times.</p>
          )}

          {holdError ? <p className="text-sm text-red-300">{holdError}</p> : null}
        </div>
      </section>

      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => void handleBack()}
          className="rounded border border-slate-600 px-4 py-2 text-slate-700 hover:border-brand-orange hover:text-brand-orange"
        >
          Back
        </button>
      </div>
    </div>
  );
}
