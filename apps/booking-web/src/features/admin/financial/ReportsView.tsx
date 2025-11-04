import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../../../lib/api';

type TotalsStrip = {
  draftCount: number;
  issuedThisMonthTotalPence: number;
  unpaidTotalPence: number;
  paidThisMonthTotalPence: number;
};

export function TotalsStrip() {
  const [data, setData] = useState<TotalsStrip | null>(null);
  const currency = useMemo(() => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }), []);
  useEffect(() => {
    apiGet<TotalsStrip>('/admin/documents/stats?type=INVOICE').then(setData).catch(() => setData(null));
  }, []);
  if (!data) return null;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-center">
        <div className="text-xs uppercase tracking-wide text-slate-400">Draft</div>
        <div className="text-lg font-semibold text-white">{data.draftCount}</div>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-center">
        <div className="text-xs uppercase tracking-wide text-slate-400">Issued (month)</div>
        <div className="text-lg font-semibold text-white">{currency.format((data.issuedThisMonthTotalPence || 0) / 100)}</div>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-center">
        <div className="text-xs uppercase tracking-wide text-slate-400">Unpaid total</div>
        <div className="text-lg font-semibold text-white">{currency.format((data.unpaidTotalPence || 0) / 100)}</div>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-center">
        <div className="text-xs uppercase tracking-wide text-slate-400">Paid (month)</div>
        <div className="text-lg font-semibold text-white">{currency.format((data.paidThisMonthTotalPence || 0) / 100)}</div>
      </div>
    </div>
  );
}

type InvoicesSeries = { series: Array<{ month: string; total: number; vat: number; paid: number; issued: number }> };
type VatSummary = { vatTotalPence: number };
type OutstandingRow = { id: number; number: string; totalAmountPence: number; dueAt: string | null; daysOverdue: number | null; customer: string };
type TopService = { description: string; totalPence: number; count: number };

export function ReportsView() {
  const currency = useMemo(() => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }), []);
  const [series, setSeries] = useState<InvoicesSeries['series']>([]);
  const [vat, setVat] = useState<VatSummary | null>(null);
  const [outstanding, setOutstanding] = useState<OutstandingRow[]>([]);
  const [top, setTop] = useState<TopService[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    apiGet<InvoicesSeries>(`/admin/documents/reports/invoices${suffix}`).then((d) => setSeries(d.series));
    apiGet<VatSummary>(`/admin/documents/reports/vat${suffix}`).then(setVat);
    apiGet<{ items: OutstandingRow[] }>(`/admin/documents/reports/outstanding`).then((d) => setOutstanding(d.items));
    apiGet<{ items: TopService[] }>(`/admin/documents/reports/top-services${suffix}`).then((d) => setTop(d.items));
  };

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  useEffect(() => { load(); }, []);
  const exportCsv = (rows: string[][], name: string) => {
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  const exportSeriesCsv = () => {
    const header = ['Month','Total','Paid','Issued','VAT'];
    const rows = series.map((r) => [r.month, String(r.total), String(r.paid), String(r.issued), String(r.vat)]);
    exportCsv([header, ...rows], 'monthly_totals.csv');
  };
  const exportOutstandingCsv = () => {
    const header = ['Number','Customer','Due','Days','TotalPence'];
    const rows = outstanding.map((r) => [r.number, r.customer || '', r.dueAt || '', String(r.daysOverdue ?? 0), String(r.totalAmountPence)]);
    exportCsv([header, ...rows], 'outstanding.csv');
  };
  const exportTopCsv = () => {
    const header = ['Description','Count','TotalPence'];
    const rows = top.map((t) => [t.description, String(t.count), String(t.totalPence)]);
    exportCsv([header, ...rows], 'top_services.csv');
  };

  return (
    <div className="space-y-6">
      <TotalsStrip />

      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Monthly totals</h3>
          <div className="flex items-center gap-2 text-xs">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white" />
            <span>to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white" />
            <button onClick={load} className="rounded border border-slate-600 px-3 py-1 text-slate-200 hover:border-orange-500 hover:text-orange-300">Refresh</button>
            <button onClick={exportSeriesCsv} className="rounded border border-slate-600 px-3 py-1 text-slate-200 hover:border-orange-500 hover:text-orange-300">Export CSV</button>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
            <thead className="bg-slate-800/60 text-xs uppercase text-slate-300">
              <tr><th className="px-3 py-2 text-left">Month</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">Paid</th><th className="px-3 py-2 text-right">Issued</th><th className="px-3 py-2 text-right">VAT</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {series.map((r) => (
                <tr key={r.month}>
                  <td className="px-3 py-2">{r.month}</td>
                  <td className="px-3 py-2 text-right">{currency.format(r.total / 100)}</td>
                  <td className="px-3 py-2 text-right">{currency.format(r.paid / 100)}</td>
                  <td className="px-3 py-2 text-right">{currency.format(r.issued / 100)}</td>
                  <td className="px-3 py-2 text-right">{currency.format(r.vat / 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">VAT summary (YTD)</h3>
          <div className="mt-2 text-2xl font-semibold text-white">{currency.format(((vat?.vatTotalPence ?? 0) / 100))}</div>
        </div>

        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Top services</h3>
            <button onClick={exportTopCsv} className="rounded border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-orange-500 hover:text-orange-300">Export CSV</button>
          </div>
          <ul className="mt-2 space-y-2 text-sm text-slate-200">
            {top.map((t) => (
              <li key={t.description} className="flex items-center justify-between">
                <span>{t.description} <span className="text-slate-400">×{t.count}</span></span>
                <span className="font-semibold">{currency.format(t.totalPence / 100)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Outstanding (Unpaid)</h3>
          <button onClick={exportOutstandingCsv} className="rounded border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-orange-500 hover:text-orange-300">Export CSV</button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
            <thead className="bg-slate-800/60 text-xs uppercase text-slate-300">
              <tr><th className="px-3 py-2 text-left">Number</th><th className="px-3 py-2 text-left">Customer</th><th className="px-3 py-2 text-left">Due</th><th className="px-3 py-2 text-right">Days</th><th className="px-3 py-2 text-right">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {outstanding.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2">{r.number}</td>
                  <td className="px-3 py-2">{r.customer || '—'}</td>
                  <td className="px-3 py-2">{r.dueAt ? new Date(r.dueAt).toLocaleDateString('en-GB') : '—'}</td>
                  <td className="px-3 py-2 text-right">{r.daysOverdue ?? 0}</td>
                  <td className="px-3 py-2 text-right">{currency.format(r.totalAmountPence / 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
