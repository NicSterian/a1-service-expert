import { useState } from 'react';
import { apiDelete, apiGet, apiPost } from '../lib/api';

export function DevPage() {
  const [availability, setAvailability] = useState<string[]>([]);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [holdId, setHoldId] = useState<string | null>(null);
  const [holdMessage, setHoldMessage] = useState<string | null>(null);
  const [holdError, setHoldError] = useState<string | null>(null);

  const targetDate = '2025-09-29';
  const targetTime = '09:00';

  const handleAvailability = async () => {
    try {
      setAvailabilityError(null);
      const result = await apiGet<string[]>(`/availability?date=${targetDate}`);
      setAvailability(result);
    } catch (error) {
      setAvailability([]);
      setAvailabilityError((error as Error).message);
    }
  };

  const handleCreateHold = async () => {
    try {
      setHoldError(null);
      const result = await apiPost<{ holdId: string }>('/holds', {
        date: targetDate,
        time: targetTime,
      });
      setHoldId(result.holdId);
      setHoldMessage(`Hold created: ${result.holdId}`);
    } catch (error) {
      setHoldMessage(null);
      setHoldError((error as Error).message);
    }
  };

  const handleReleaseHold = async () => {
    if (!holdId) {
      setHoldError('No holdId to release.');
      return;
    }
    try {
      setHoldError(null);
      await apiDelete(`/holds/${holdId}`);
      setHoldMessage(`Hold released: ${holdId}`);
      setHoldId(null);
    } catch (error) {
      setHoldError((error as Error).message);
    }
  };

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold text-brand-black">Developer Utilities</h1>
      <p className="text-slate-600">Quick hooks to verify API connectivity.</p>

      <div className="rounded border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="text-xl font-medium">Availability</h2>
        <button
          onClick={handleAvailability}
          className="rounded bg-brand-orange px-3 py-2 text-white hover:bg-orange-500"
        >
          Fetch availability for {targetDate}
        </button>
        {availabilityError ? (
          <p className="text-sm text-red-600">{availabilityError}</p>
        ) : (
          <pre className="overflow-x-auto rounded bg-slate-100 p-2 text-xs">{JSON.stringify(availability, null, 2)}</pre>
        )}
      </div>

      <div className="rounded border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="text-xl font-medium">Holds</h2>
        <div className="flex gap-3">
          <button
            onClick={handleCreateHold}
            className="rounded bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-500"
          >
            Create hold ({targetDate} {targetTime})
          </button>
          <button
            onClick={handleReleaseHold}
            className="rounded bg-slate-600 px-3 py-2 text-white hover:bg-slate-500"
          >
            Release hold
          </button>
        </div>
        {holdMessage ? <p className="text-sm text-emerald-700">{holdMessage}</p> : null}
        {holdError ? <p className="text-sm text-red-600">{holdError}</p> : null}
      </div>
    </section>
  );
}
