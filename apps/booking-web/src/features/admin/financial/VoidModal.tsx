import { useState } from 'react';
import toast from 'react-hot-toast';
import { apiPatch } from '../../../lib/api';

export function VoidModal({ open, ids, onClose, onSuccess }: { open: boolean; ids: number[]; onClose: () => void; onSuccess?: () => void }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  if (!open) return null;
  const submit = async () => {
    try {
      setLoading(true);
      if (ids.length === 1) {
        await apiPatch(`/admin/documents/${ids[0]}/status`, { status: 'VOID', reason });
      } else {
        await apiPatch(`/admin/documents/bulk-status`, { ids, status: 'VOID' });
      }
      toast.success(ids.length === 1 ? 'Invoice voided' : `Voided ${ids.length} invoices`);
      onClose();
      onSuccess?.();
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to void');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 text-sm text-slate-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Void {ids.length > 1 ? `${ids.length} Invoices` : 'Invoice'}</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:text-white">×</button>
        </div>
        <div className="mt-4 space-y-3">
          <div className="text-xs uppercase tracking-wide text-slate-400">Reason (optional)</div>
          <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white" placeholder="Enter reason (optional)" />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-orange-500 hover:text-orange-300">Cancel</button>
          <button type="button" onClick={submit} disabled={loading} className="rounded-full border border-red-500 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/10">
            {loading ? 'Voiding…' : 'Confirm Void'}
          </button>
        </div>
      </div>
    </div>
  );
}

