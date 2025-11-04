import { useEffect, useState } from 'react';
import { apiGet } from '../../../lib/api';

type Stats = {
  draftCount: number;
  issuedThisMonthTotalPence: number;
  unpaidTotalPence: number;
  paidThisMonthTotalPence: number;
};

export function TotalsStrip() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    apiGet<Stats>('/admin/documents/stats')
      .then(setStats)
      .catch((e) => setError((e as Error).message ?? 'Failed to load stats'));
  }, []);
  const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
        <div className="text-slate-400">Drafts</div>
        <div className="text-xl text-white">{stats?.draftCount ?? '–'}</div>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
        <div className="text-slate-400">Issued this month</div>
        <div className="text-xl text-white">{currency.format((stats?.issuedThisMonthTotalPence ?? 0) / 100)}</div>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
        <div className="text-slate-400">Unpaid total</div>
        <div className="text-xl text-white">{currency.format((stats?.unpaidTotalPence ?? 0) / 100)}</div>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
        <div className="text-slate-400">Paid this month</div>
        <div className="text-xl text-white">{currency.format((stats?.paidThisMonthTotalPence ?? 0) / 100)}</div>
      </div>
      {error ? <div className="col-span-full text-xs text-red-500">{error}</div> : null}
    </div>
  );
}

export function ReportsView() {
  const [series, setSeries] = useState<Array<{ month: string; total: number; vat: number; paid: number; issued: number }>>([]);
  const [vat, setVat] = useState<{ vatTotalPence: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([
      apiGet<{ series: Array<{ month: string; total: number; vat: number; paid: number; issued: number }> }>(
        '/admin/documents/reports/invoices',
      ),
      apiGet<{ vatTotalPence: number }>('/admin/documents/reports/vat'),
    ])
      .then(([a, b]) => {
        setSeries(a.series);
        setVat(b);
      })
      .catch((e) => setError((e as Error).message ?? 'Failed to load reports'));
  }, []);
  const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <div className="text-sm text-slate-400">Invoices by month</div>
        <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-slate-200">
          {series.map((s) => (
            <div key={s.month} className="flex justify-between">
              <div className="text-slate-400">{s.month}</div>
              <div>
                Total {currency.format(s.total / 100)} · Paid {currency.format(s.paid / 100)} · VAT {currency.format(s.vat / 100)}
              </div>
            </div>
          ))}
          {series.length === 0 ? <div className="text-slate-500">No data</div> : null}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200">
        <div className="text-slate-400">Year-to-date VAT</div>
        <div className="text-xl text-white">{currency.format(((vat?.vatTotalPence ?? 0) / 100) || 0)}</div>
      </div>
      {error ? <div className="text-xs text-red-500">{error}</div> : null}
    </div>
  );
}

