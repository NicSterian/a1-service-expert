import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiDelete, apiGet, apiPost } from '../../../lib/api';

type DocumentStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

type Row = {
  id: number;
  number: string;
  status: DocumentStatus;
  totalAmountPence: number;
  createdAt: string;
  bookingId: number | null;
};

export function QuotesList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const currency = useMemo(() => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }), []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setStatus('loading');
        setError(null);
        const data = await apiGet<{ items: Row[] }>(`/admin/documents?type=QUOTE`);
        if (!cancelled) {
          setRows(data.items);
          setStatus('idle');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setError((err as Error).message ?? 'Failed to load quotes');
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const convertToInvoice = async (id: number) => {
    try {
      const created = await apiPost(`/admin/documents/${id}/convert-to-invoice`, {});
      toast.success('Converted to invoice');
      window.open(`/admin/financial?tab=invoices`, '_self');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to convert');
    }
  };

  const deleteQuote = async (id: number) => {
    if (!confirm('Are you sure you want to delete this quote?')) return;
    try {
      await apiDelete(`/admin/documents/${id}`);
      toast.success('Quote deleted');
      setRows(rows.filter((r) => r.id !== id));
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to delete quote');
    }
  };

  const editQuote = (id: number) => {
    window.location.href = `/admin/financial?tab=quotes&editQuote=${id}`;
  };

  const sendEmail = async (id: number) => {
    try {
      await apiPost(`/admin/documents/${id}/send`, {});
      toast.success('Email sent to customer');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to send email');
    }
  };

  const createQuote = async () => {
    try {
      const created = await apiPost<{ id: number }>('/admin/documents', { type: 'QUOTE' });
      toast.success('Quote draft created');
      // Navigate to quote editor (would need route setup)
      window.location.href = `/admin/financial?tab=quotes&editQuote=${created.id}`;
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to create quote');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Quotes</h3>
        <button
          type="button"
          onClick={createQuote}
          className="rounded-full bg-brand-orange px-4 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400"
        >
          Create Quote
        </button>
      </div>
      {status === 'error' && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-slate-700">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-800/60 text-xs uppercase text-slate-300">
            <tr>
              <th className="px-4 py-3 text-left">Number</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Created</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Booking</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm text-slate-200">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-800/40">
                <td className="px-4 py-2 font-semibold">
                  <button onClick={() => editQuote(row.id)} className="text-white hover:text-orange-300 underline underline-offset-4">
                    {row.number}
                  </button>
                  <div className="text-xs text-slate-400 sm:hidden mt-1">{row.status}</div>
                </td>
                <td className="px-4 py-2 hidden sm:table-cell">{row.status}</td>
                <td className="px-4 py-2 text-right">{currency.format(row.totalAmountPence / 100)}</td>
                <td className="px-4 py-2 hidden lg:table-cell">{new Date(row.createdAt).toLocaleDateString('en-GB')}</td>
                <td className="px-4 py-2 hidden lg:table-cell">
                  {row.bookingId ? (
                    <Link to={`/admin/bookings/${row.bookingId}`} className="text-orange-300 underline underline-offset-4">#{row.bookingId}</Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex flex-col sm:flex-row justify-end gap-2">
                    <button onClick={() => editQuote(row.id)} className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-blue-500 hover:text-blue-300">View</button>
                    {row.status !== 'DRAFT' && (
                      <button onClick={() => sendEmail(row.id)} className="rounded-full border border-slate-600 px-3 py-1 text-xs text-green-300 hover:border-green-500">Email</button>
                    )}
                    <button onClick={() => deleteQuote(row.id)} className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-red-500 hover:text-red-300">Delete</button>
                    <button onClick={() => convertToInvoice(row.id)} className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-orange-500 hover:text-orange-300">Convert to Invoice</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

