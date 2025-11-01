import { FormEvent, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/api';

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
  const [defaultSlots, setDefaultSlots] = useState<string[]>([]);
  const [newSlot, setNewSlot] = useState('');
  const [satSlots, setSatSlots] = useState<string[]>([]);
  const [sunSlots, setSunSlots] = useState<string[]>([]);
  const [newSat, setNewSat] = useState('');
  const [newSun, setNewSun] = useState('');

  const [exceptionForm, setExceptionForm] = useState({ date: '', reason: '' });
  const [extraSlotForm, setExtraSlotForm] = useState({ date: '', time: '' });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [ex, slots, settings] = await Promise.all([
          apiGet<ExceptionDate[]>('/admin/calendar/exceptions'),
          apiGet<ExtraSlot[]>('/admin/calendar/extra-slots'),
          apiGet<{ defaultSlotsJson: string[] }>('\\admin/settings'.replace('\\','/')),
        ]);
        if (!cancelled) {
          setExceptions(ex);
          setExtraSlots(slots);
          setDefaultSlots(Array.isArray((settings as any).defaultSlotsJson) ? (settings as any).defaultSlotsJson : []);
          setSatSlots(Array.isArray((settings as any).saturdaySlotsJson) ? (settings as any).saturdaySlotsJson : []);
          setSunSlots(Array.isArray((settings as any).sundaySlotsJson) ? (settings as any).sundaySlotsJson : []);
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
    const [ex, slots, settings] = await Promise.all([
      apiGet<ExceptionDate[]>('/admin/calendar/exceptions'),
      apiGet<ExtraSlot[]>('/admin/calendar/extra-slots'),
      apiGet<{ defaultSlotsJson: string[]; saturdaySlotsJson?: string[]; sundaySlotsJson?: string[] }>('/admin/settings'),
    ]);
    setExceptions(ex);
    setExtraSlots(slots);
    setDefaultSlots(Array.isArray(settings.defaultSlotsJson) ? settings.defaultSlotsJson : []);
    setSatSlots(Array.isArray((settings as any).saturdaySlotsJson) ? (settings as any).saturdaySlotsJson : []);
    setSunSlots(Array.isArray((settings as any).sundaySlotsJson) ? (settings as any).sundaySlotsJson : []);
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

  // Default slots management
  const saveDefaultSlots = async (slots: string[]) => {
    await apiPatch('/admin/settings', { defaultSlots: slots });
    await refresh();
  };

  const addDefaultSlot = async (event: FormEvent) => {
    event.preventDefault();
    const value = (newSlot || '').trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      setError('Please enter a valid time in HH:mm format.');
      return;
    }
    const next = Array.from(new Set([...defaultSlots, value])).sort();
    await saveDefaultSlots(next);
    setNewSlot('');
  };

  const removeDefaultSlot = async (time: string) => {
    const next = defaultSlots.filter((t) => t !== time);
    await saveDefaultSlots(next);
  };

  const moveDefaultSlot = async (time: string, dir: -1 | 1) => {
    const idx = defaultSlots.findIndex((t) => t === time);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= defaultSlots.length) return;
    const next = defaultSlots.slice();
    const [x] = next.splice(idx, 1);
    next.splice(j, 0, x);
    await saveDefaultSlots(next);
  };

  // Saturday slots
  const saveSat = async (slots: string[]) => {
    await apiPatch('/admin/settings', { saturdaySlots: slots });
    await refresh();
  };
  const addSat = async (e: FormEvent) => {
    e.preventDefault();
    const value = (newSat || '').trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return setError('Invalid Saturday time');
    const next = Array.from(new Set([...satSlots, value])).sort();
    await saveSat(next);
    setNewSat('');
  };
  const removeSat = async (time: string) => saveSat(satSlots.filter((t) => t !== time));
  const moveSat = async (time: string, dir: -1 | 1) => {
    const idx = satSlots.findIndex((t) => t === time);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= satSlots.length) return;
    const next = satSlots.slice();
    const [x] = next.splice(idx, 1);
    next.splice(j, 0, x);
    await saveSat(next);
  };

  // Sunday slots
  const saveSun = async (slots: string[]) => {
    await apiPatch('/admin/settings', { sundaySlots: slots });
    await refresh();
  };
  const addSun = async (e: FormEvent) => {
    e.preventDefault();
    const value = (newSun || '').trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return setError('Invalid Sunday time');
    const next = Array.from(new Set([...sunSlots, value])).sort();
    await saveSun(next);
    setNewSun('');
  };
  const removeSun = async (time: string) => saveSun(sunSlots.filter((t) => t !== time));
  const moveSun = async (time: string, dir: -1 | 1) => {
    const idx = sunSlots.findIndex((t) => t === time);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= sunSlots.length) return;
    const next = sunSlots.slice();
    const [x] = next.splice(idx, 1);
    next.splice(j, 0, x);
    await saveSun(next);
  };

  const handleImportBankHolidays = async () => {
    await apiPost('/admin/calendar/bank-holidays/import');
    await refresh();
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-white">Calendar</h2>
        <p className="text-sm text-slate-400">Manage exceptions, extra slots, and bank-holiday imports.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading calendar...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-inner lg:col-span-2">
            <h3 className="text-lg font-medium text-white">Default time slots (Mon–Fri)</h3>
            <form onSubmit={addDefaultSlot} className="flex flex-wrap items-end gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400">Time (HH:mm)</label>
                <input
                  type="time"
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  className="mt-1 w-32 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
                />
              </div>
              <button type="submit" className="rounded-full bg-brand-orange px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-orange-400">
                Add slot
              </button>
            </form>
            {defaultSlots.length === 0 ? (
              <p className="text-sm text-slate-400">No default slots configured.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {defaultSlots.map((time, idx) => (
                  <div key={time} className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white">
                    <span>{time}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" aria-label="Move up" onClick={() => moveDefaultSlot(time, -1)} disabled={idx === 0} className="rounded border border-slate-600 px-1 text-slate-300 disabled:opacity-40">↑</button>
                      <button type="button" aria-label="Move down" onClick={() => moveDefaultSlot(time, 1)} disabled={idx === defaultSlots.length - 1} className="rounded border border-slate-600 px-1 text-slate-300 disabled:opacity-40">↓</button>
                      <button type="button" aria-label="Remove" onClick={() => removeDefaultSlot(time)} className="rounded border border-red-500/30 px-1 text-red-300">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-500">Changes apply to weekdays. Use Extra slots for one-off additions, and Exception dates to close specific days.</p>
          </div>

          <div className="space-y-3 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-inner lg:col-span-1">
            <h3 className="text-lg font-medium text-white">Saturday slots</h3>
            <form onSubmit={addSat} className="flex flex-wrap items-end gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400">Time (HH:mm)</label>
                <input type="time" value={newSat} onChange={(e) => setNewSat(e.target.value)} className="mt-1 w-32 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200" />
              </div>
              <button type="submit" className="rounded-full bg-brand-orange px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-orange-400">Add slot</button>
            </form>
            {satSlots.length === 0 ? (
              <p className="text-sm text-slate-400">No Saturday slots configured.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {satSlots.map((time, idx) => (
                  <div key={time} className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white">
                    <span>{time}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => moveSat(time, -1)} disabled={idx === 0} className="rounded border border-slate-600 px-1 text-slate-300 disabled:opacity-40">↑</button>
                      <button type="button" onClick={() => moveSat(time, 1)} disabled={idx === satSlots.length - 1} className="rounded border border-slate-600 px-1 text-slate-300 disabled:opacity-40">↓</button>
                      <button type="button" onClick={() => removeSat(time)} className="rounded border border-red-500/30 px-1 text-red-300">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-inner lg:col-span-1">
            <h3 className="text-lg font-medium text-white">Sunday slots</h3>
            <form onSubmit={addSun} className="flex flex-wrap items-end gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400">Time (HH:mm)</label>
                <input type="time" value={newSun} onChange={(e) => setNewSun(e.target.value)} className="mt-1 w-32 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200" />
              </div>
              <button type="submit" className="rounded-full bg-brand-orange px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-orange-400">Add slot</button>
            </form>
            {sunSlots.length === 0 ? (
              <p className="text-sm text-slate-400">No Sunday slots configured.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sunSlots.map((time, idx) => (
                  <div key={time} className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white">
                    <span>{time}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => moveSun(time, -1)} disabled={idx === 0} className="rounded border border-slate-600 px-1 text-slate-300 disabled:opacity-40">↑</button>
                      <button type="button" onClick={() => moveSun(time, 1)} disabled={idx === sunSlots.length - 1} className="rounded border border-slate-600 px-1 text-slate-300 disabled:opacity-40">↓</button>
                      <button type="button" onClick={() => removeSun(time)} className="rounded border border-red-500/30 px-1 text-red-300">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-3 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-inner">
            <h3 className="text-lg font-medium text-white">Exception dates</h3>
            <form onSubmit={handleCreateException} className="grid gap-2 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400">Date</label>
                <input
                  type="date"
                  value={exceptionForm.date}
                  onChange={(event) => setExceptionForm((prev) => ({ ...prev, date: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400">Reason</label>
                <input
                  value={exceptionForm.reason}
                  onChange={(event) => setExceptionForm((prev) => ({ ...prev, reason: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="rounded-full bg-brand-orange px-3 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400"
                >
                  Add exception
                </button>
              </div>
            </form>

            <ul className="space-y-2 text-sm">
              {exceptions.map((exception) => (
                <li key={exception.id} className="flex items-center justify-between rounded border border-slate-700 bg-slate-800 p-3">
                  <div>
                    <p className="font-semibold text-white">{exception.date.slice(0, 10)}</p>
                    {exception.reason ? <p className="text-xs text-slate-300">{exception.reason}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteException(exception.id)}
                    className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:border-red-400"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-inner">
            <h3 className="text-lg font-medium text-white">Extra slots</h3>
            <form onSubmit={handleCreateExtraSlot} className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400">Date</label>
                <input
                  type="date"
                  value={extraSlotForm.date}
                  onChange={(event) => setExtraSlotForm((prev) => ({ ...prev, date: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400">Time (HH:mm)</label>
                <input
                  type="time"
                  value={extraSlotForm.time}
                  onChange={(event) => setExtraSlotForm((prev) => ({ ...prev, time: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="rounded-full bg-brand-orange px-3 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400"
                >
                  Add extra slot
                </button>
              </div>
            </form>

            <button
              type="button"
              onClick={handleImportBankHolidays}
              className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-orange-500"
            >
              Import bank holidays
            </button>

            <ul className="space-y-2 text-sm">
              {extraSlots.map((slot) => (
                <li key={slot.id} className="flex items-center justify-between rounded border border-slate-700 bg-slate-800 p-3">
                  <div>
                    <p className="font-semibold text-white">
                      {slot.date.slice(0, 10)} at {slot.time}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteExtraSlot(slot.id)}
                    className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:border-red-400"
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
