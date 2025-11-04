import { useState } from 'react';
import { apiPatch } from '../../../lib/api';

export function PaymentModal({ open, ids, onClose, onSuccess }: { open: boolean; ids: number[]; onClose: () => void; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState('CASH');

  if (!open) return null;

  const confirm = async () => {
    try {
      setSaving(true);
      setError(null);
      await apiPatch('/admin/documents/bulk-status', {
        ids,
        status: 'PAID',
        paymentMethod: method,
      });
      onSuccess();
    } catch (e) {
      setError((e as Error).message ?? 'Failed to mark as paid');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-200">
        <h3 className="text-lg font-semibold text-white">Mark paid</h3>
        <p className="mt-1 text-sm text-slate-400">{ids.length} invoice(s) will be marked as PAID.</p>
        <label className="mt-4 block text-sm">
          Payment method
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-900 p-2">
            <option>CASH</option>
            <option>CARD</option>
            <option>BANK_TRANSFER</option>
            <option>OTHER</option>
          </select>
        </label>
        {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-3 text-sm">
          <button onClick={onClose} className="rounded border border-slate-600 px-3 py-1 text-slate-300 hover:border-slate-500">Cancel</button>
          <button onClick={confirm} disabled={saving} className="rounded bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-500 disabled:opacity-60">{saving ? 'Saving…' : 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
}

