import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { apiPatch } from '../../../lib/api';

type Props = {
  open: boolean;
  ids: number[];
  onClose: () => void;
  onSuccess?: () => void;
};

const METHODS = ['CASH', 'CARD', 'BANK', 'OTHER'] as const;

export function PaymentModal({ open, ids, onClose, onSuccess }: Props) {
  const [method, setMethod] = useState<string>('CASH');
  const [date, setDate] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
      setMethod('CASH');
    }
  }, [open]);

  const submit = async () => {
    if (!ids || ids.length === 0) return;
    try {
      setLoading(true);
      if (ids.length === 1) {
        await apiPatch(`/admin/documents/${ids[0]}/status`, {
          status: 'PAID',
          paymentMethod: method,
          paidAt: date ? new Date(date).toISOString() : undefined,
        });
      } else {
        await apiPatch(`/admin/documents/bulk-status`, {
          ids,
          status: 'PAID',
          paymentMethod: method,
          paidAt: date ? new Date(date).toISOString() : undefined,
        });
      }
      toast.success(ids.length === 1 ? 'Invoice marked as paid' : `Marked ${ids.length} invoices as paid`);
      onClose();
      onSuccess?.();
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to mark paid');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 text-sm text-slate-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Mark {ids.length > 1 ? `${ids.length} Invoices` : 'Invoice'} as Paid</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:text-white">×</button>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Payment Method</div>
            <div className="flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    method === m ? 'border-orange-500 text-orange-300' : 'border-slate-600 text-slate-300 hover:border-orange-500 hover:text-orange-300'
                  }`}
                >
                  {m === 'BANK' ? 'Bank Transfer' : m.charAt(0) + m.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Payment Date (optional)</div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-48 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-orange-500 hover:text-orange-300">Cancel</button>
          <button type="button" onClick={submit} disabled={loading} className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-700/40">
            {loading ? 'Saving…' : 'Confirm Paid'}
          </button>
        </div>
      </div>
    </div>
  );
}

