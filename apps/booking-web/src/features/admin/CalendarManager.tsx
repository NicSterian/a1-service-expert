import { FormEvent, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost } from '../../lib/api';

interface ExceptionDate {
  id: number;
  date: string;
  reason?: string | null;
}

interface ExtraSlot {
  id: number;
  date: string;
  time: string;
}

export function CalendarManager() {
  const [exceptions, setExceptions] = useState<ExceptionDate[]>([]);
  const [extraSlots, setExtraSlots] = useState<ExtraSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [exceptionForm, setExceptionForm] = useState({ date: '', reason: '' });
  const [extraSlotForm, setExtraSlotForm] = useState({ date: '', time: '' });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [ex, slots] = await Promise.all([
          apiGet<ExceptionDate[]>('/admin/calendar/exceptions'),
          apiGet<ExtraSlot[]>('/admin/calendar/extra-slots'),
        ]);
        if (!cancelled) {
          setExceptions(ex);
          setExtraSlots(slots);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message ?? 'Failed to load calendar data.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = async () => {
    const [ex, slots] = await Promise.all([
      apiGet<ExceptionDate[]>('/admin/calendar/exceptions'),
      apiGet<ExtraSlot[]>('/admin/calendar/extra-slots'),
    ]);
    setExceptions(ex);
    setExtraSlots(slots);
  };

  const handleCreateException = async (event: FormEvent) => {
    event.preventDefault();
    await apiPost('/admin/calendar/exceptions', {
      date: exceptionForm.date,
      reason: exceptionForm.reason || undefined,
    });
    setExceptionForm({ date: '', reason: '' });
    await refresh();
  };

  const handleDeleteException = async (id: number) => {
    await apiDelete(`/admin/calendar/exceptions/${id}`);
    await refresh();
  };

  const handleCreateExtraSlot = async (event: FormEvent) => {
    event.preventDefault();
    await apiPost('/admin/calendar/extra-slots', {
      date: extraSlotForm.date,
      time: extraSlotForm.time,
    });
    setExtraSlotForm({ date: '', time: '' });
    await refresh();
  };

  const handleDeleteExtraSlot = async (id: number) => {
    await apiDelete(`/admin/calendar/extra-slots/${id}`);
    await refresh();
  };

  const handleImportBankHolidays = async () => {
    await apiPost('/admin/calendar/bank-holidays/import');
    await refresh();
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-brand-black">Calendar</h2>
        <p className="text-sm text-slate-600">Manage exceptions, extra slots, and bank-holiday imports.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading calendar...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 rounded border border-slate-200 bg-white p-4">
            <h3 className="text-lg font-medium text-brand-black">Exception dates</h3>
            <form onSubmit={handleCreateException} className="grid gap-2 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600">Date</label>
                <input
                  type="date"
                  value={exceptionForm.date}
                  onChange={(event) => setExceptionForm((prev) => ({ ...prev, date: event.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600">Reason</label>
                <input
                  value={exceptionForm.reason}
                  onChange={(event) => setExceptionForm((prev) => ({ ...prev, reason: event.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="rounded bg-brand-orange px-3 py-2 text-sm text-white hover:bg-orange-500"
                >
                  Add exception
                </button>
              </div>
            </form>

            <ul className="space-y-2 text-sm">
              {exceptions.map((exception) => (
                <li key={exception.id} className="flex items-center justify-between rounded border border-slate-200 p-3">
                  <div>
                    <p className="font-semibold text-brand-black">{exception.date.slice(0, 10)}</p>
                    {exception.reason ? <p className="text-xs text-slate-600">{exception.reason}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteException(exception.id)}
                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:border-red-400"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 rounded border border-slate-200 bg-white p-4">
            <h3 className="text-lg font-medium text-brand-black">Extra slots</h3>
            <form onSubmit={handleCreateExtraSlot} className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600">Date</label>
                <input
                  type="date"
                  value={extraSlotForm.date}
                  onChange={(event) => setExtraSlotForm((prev) => ({ ...prev, date: event.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">Time (HH:mm)</label>
                <input
                  type="time"
                  value={extraSlotForm.time}
                  onChange={(event) => setExtraSlotForm((prev) => ({ ...prev, time: event.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="rounded bg-brand-orange px-3 py-2 text-sm text-white hover:bg-orange-500"
                >
                  Add extra slot
                </button>
              </div>
            </form>

            <button
              type="button"
              onClick={handleImportBankHolidays}
              className="rounded border border-slate-300 px-3 py-2 text-sm hover:border-brand-orange"
            >
              Import bank holidays
            </button>

            <ul className="space-y-2 text-sm">
              {extraSlots.map((slot) => (
                <li key={slot.id} className="flex items-center justify-between rounded border border-slate-200 p-3">
                  <div>
                    <p className="font-semibold text-brand-black">
                      {slot.date.slice(0, 10)} at {slot.time}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteExtraSlot(slot.id)}
                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:border-red-400"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}