import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiGet, apiPost, apiGetBlob } from '../../../lib/api';
import { PaymentModal } from './PaymentModal';
import { VoidModal } from './VoidModal';

type DocumentStatus = 'DRAFT' | 'ISSUED' | 'SENT' | 'PAID' | 'VOID' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

type InvoiceRow = {
  id: number;
  number: string;
  status: DocumentStatus;
  totalAmountPence: number;
  vatAmountPence: number;
  pdfUrl: string | null;
  createdAt: string;
  issuedAt: string | null;
  dueAt: string | null;
  bookingId: number | null;
  paidAt?: string | null;
  paymentMethod?: string | null;
};

export function InvoicesList({ onChanged }: { onChanged?: () => void }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>(params.get('status') || '');
  const [from, setFrom] = useState<string>(params.get('from') || '');
  const [to, setTo] = useState<string>(params.get('to') || '');
  const [q, setQ] = useState<string>(params.get('q') || '');
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setStatus('loading');
        setError(null);
        const next = new URLSearchParams(params);
        next.set('type', 'INVOICE');
        if (statusFilter) next.set('status', statusFilter); else next.delete('status');
        if (from) next.set('from', from); else next.delete('from');
        if (to) next.set('to', to); else next.delete('to');
        if (q) next.set('q', q); else next.delete('q');
        setParams(next, { replace: true });
        const data = await apiGet<{ items: InvoiceRow[] }>(`/admin/documents?${next.toString()}`);
        if (!cancelled) {
          setRows(data.items);
          setStatus('idle');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setError((err as Error).message ?? 'Failed to load invoices');
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, from, to, q, params, setParams]);

  const createDraft = async () => {
    try {
      const draft = await apiPost<{ id: number }>(`/admin/documents`, {
        lines: [{ description: 'Labour', quantity: 1, unitPricePence: 0 }],
      });
      toast.success('Draft invoice created');
      navigate(`/admin/financial?edit=${draft.id}`);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to create draft');
    }
  };

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentIds, setPaymentIds] = useState<number[]>([]);
  const markPaid = (id: number) => {
    setPaymentIds([id]);
    setPaymentOpen(true);
  };

  const issue = async (id: number) => {
    try {
      await apiPost(`/admin/documents/${id}/issue`, {});
      toast.success('Invoice issued');
      onChanged?.();
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to issue invoice');
    }
  };

  const [voidOpen, setVoidOpen] = useState(false);
  const [voidIds, setVoidIds] = useState<number[]>([]);
  const voidInvoice = (id: number) => {
    setVoidIds([id]);
    setVoidOpen(true);
  };

  const openPdf = (url: string | null) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  const exportCsv = async () => {
    try {
      const qs = new URLSearchParams();
      qs.set('type', 'INVOICE');
      if (statusFilter) qs.set('status', statusFilter);
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      if (q) qs.set('q', q);
      const blob = await apiGetBlob(`/admin/documents/csv?${qs.toString()}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'invoices.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to export CSV');
    }
  };

  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const toggleAll = (checked: boolean) => {
    const map: Record<number, boolean> = {};
    rows.forEach((r) => (map[r.id] = checked));
    setSelected(map);
  };
  const bulkMarkPaid = () => {
    const ids = rows.filter((r) => selected[r.id]).map((r) => r.id);
    if (ids.length === 0) return;
    setPaymentIds(ids);
    setPaymentOpen(true);
  };

  const deleteDraft = async (id: number) => {
    const ok = window.confirm('Delete this draft invoice? This action cannot be undone.');
    if (!ok) return;
    try {
      await apiPost(`/admin/documents/${id}/delete`, {});
      toast.success('Draft deleted');
      onChanged?.();
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to delete draft');
    }
  };

  const sendEmail = async (id: number) => {
    try {
      await apiPost(`/admin/documents/${id}/send`, {});
      toast.success('Email sent to customer');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to send email');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Invoices</h3>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-orange-500 hover:text-orange-300">Export CSV</button>
          <button onClick={bulkMarkPaid} className="rounded-full border border-emerald-500 px-3 py-1 text-xs text-emerald-200 hover:bg-emerald-500/10">Mark Paid (selected)</button>
          <button
            onClick={createDraft}
            className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black transition hover:bg-orange-400"
          >
            + New Draft
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-3 text-xs text-slate-200">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400">Status</div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded border border-slate-600 bg-slate-900 px-2 py-1">
              <option value="">All</option>
              <option value="DRAFT">Draft</option>
              <option value="ISSUED">Issued</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400">From</div>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border border-slate-600 bg-slate-900 px-2 py-1" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400">To</div>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border border-slate-600 bg-slate-900 px-2 py-1" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <div className="text-[10px] uppercase tracking-wide text-slate-400">Search</div>
            <input placeholder="name/email/number" value={q} onChange={(e) => setQ(e.target.value)} className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1" />
          </div>
          <button onClick={() => { setFrom(''); setTo(''); setQ(''); setStatusFilter(''); }} className="rounded border border-slate-600 px-3 py-1 text-slate-300 hover:border-orange-500 hover:text-orange-300">Clear</button>
        </div>
      </div>

      {status === 'error' && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-700">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-800/60 text-xs uppercase text-slate-300">
            <tr>
              <th className="px-2 py-3 text-left hidden md:table-cell"><input type="checkbox" onChange={(e) => toggleAll(e.target.checked)} /></th>
              <th className="px-4 py-3 text-left">Number</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Created</th>
              <th className="px-4 py-3 text-left hidden xl:table-cell">Due</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Booking</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm text-slate-200">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-800/40">
                <td className="px-2 py-2 hidden md:table-cell"><input type="checkbox" checked={!!selected[row.id]} onChange={(e) => setSelected((m) => ({ ...m, [row.id]: e.target.checked }))} /></td>
                <td className="px-4 py-2 font-semibold">
                  {row.status === 'DRAFT' ? (
                    <Link to={`/admin/financial?edit=${row.id}`} className="text-white hover:text-orange-300 underline underline-offset-4">
                      {row.number}
                    </Link>
                  ) : (
                    <span className="text-white">{row.number}</span>
                  )}
                  <div className="text-xs text-slate-400 sm:hidden mt-1">{row.status}</div>
                </td>
                <td className="px-4 py-2 hidden sm:table-cell">{row.status === 'PAID' ? `PAID${row.paymentMethod ? ` (${row.paymentMethod})` : ''}` : row.status}</td>
                <td className="px-4 py-2 text-right">{currency.format(row.totalAmountPence / 100)}</td>
                <td className="px-4 py-2 hidden lg:table-cell">{new Date(row.createdAt).toLocaleDateString('en-GB')}</td>
                <td className="px-4 py-2 hidden xl:table-cell">{row.dueAt ? new Date(row.dueAt).toLocaleDateString('en-GB') : '—'}</td>
                <td className="px-4 py-2 hidden lg:table-cell">
                  {row.bookingId ? (
                    <Link to={`/admin/bookings/${row.bookingId}`} className="text-orange-300 underline underline-offset-4">
                      #{row.bookingId}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex flex-col sm:flex-row justify-end gap-2">
                    {row.status === 'DRAFT' ? (
                      <>
                        <Link
                          to={`/admin/financial?edit=${row.id}`}
                          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-orange-500 hover:text-orange-300"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => issue(row.id)}
                          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-orange-500 hover:text-orange-300"
                        >
                          Issue
                        </button>
                        <button
                          onClick={() => deleteDraft(row.id)}
                          className="rounded-full border border-red-500 px-3 py-1 text-xs text-red-200 hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          to={`/admin/financial?edit=${row.id}`}
                          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-blue-500 hover:text-blue-300"
                        >
                          View
                        </Link>
                        {row.pdfUrl ? (
                          <button
                            onClick={() => openPdf(row.pdfUrl)}
                            className="rounded-full border border-slate-600 px-3 py-1 text-xs text-orange-300 hover:border-orange-500"
                          >
                            PDF
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">PDF pending</span>
                        )}
                        <button
                          onClick={() => sendEmail(row.id)}
                          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-green-300 hover:border-green-500"
                        >
                          Email
                        </button>
                        {row.status !== 'PAID' && (
                          <button
                            onClick={() => markPaid(row.id)}
                            className="rounded-full border border-emerald-500 px-3 py-1 text-xs text-emerald-200 hover:bg-emerald-500/10"
                          >
                            Mark Paid
                          </button>
                        )}
                        {row.status === 'ISSUED' && (
                          <button
                            onClick={() => voidInvoice(row.id)}
                            className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-orange-500 hover:text-orange-300"
                          >
                            Void
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaymentModal
        open={paymentOpen}
        ids={paymentIds}
        onClose={() => setPaymentOpen(false)}
        onSuccess={() => { setPaymentOpen(false); onChanged?.(); }}
      />
      <VoidModal
        open={voidOpen}
        ids={voidIds}
        onClose={() => setVoidOpen(false)}
        onSuccess={() => { setVoidOpen(false); onChanged?.(); }}
      />
    </div>
  );
}
