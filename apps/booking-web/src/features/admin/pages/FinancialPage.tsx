import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { InvoicesList } from '../financial/InvoicesList';
import { InvoiceEditor } from '../financial/InvoiceEditor';
import { QuotesList } from '../financial/QuotesList';
import { QuoteEditor } from '../financial/QuoteEditor';
import { ReportsView, TotalsStrip } from '../financial/ReportsView';
import { FinancialSettings } from '../financial/FinancialSettings';

export function FinancialPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [params, setParams] = useSearchParams();
  const editId = useMemo(() => {
    const v = params.get('edit');
    return v ? Number(v) : null;
  }, [params]);
  const editQuoteId = useMemo(() => {
    const v = params.get('editQuote');
    return v ? Number(v) : null;
  }, [params]);
  const tab = params.get('tab') || 'invoices';
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Financial</h2>
          <p className="text-sm text-slate-400">Invoices management</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-slate-700">
        <nav className="-mb-px flex gap-4 overflow-x-auto">
          {['invoices','quotes','reports','settings'].map((t) => (
            <button
              key={t}
              onClick={() => { const next = new URLSearchParams(params); next.set('tab', t); next.delete('edit'); setParams(next, { replace: true }); }}
              className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition ${
                tab === t ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {t === 'invoices' ? 'Invoices' : t === 'quotes' ? 'Quotes' : t === 'reports' ? 'Reports' : 'Settings'}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'invoices' && !editId && <TotalsStrip />}

      {editId ? (
        <InvoiceEditor id={editId} />
      ) : editQuoteId ? (
        <QuoteEditor id={editQuoteId} />
      ) : tab === 'quotes' ? (
        <QuotesList />
      ) : tab === 'reports' ? (
        <ReportsView />
      ) : tab === 'settings' ? (
        <FinancialSettings />
      ) : (
        <InvoicesList key={`invoices-${refreshKey}`} onChanged={() => setRefreshKey((v) => v + 1)} />
      )}
    </div>
  );
}
