import React from 'react';
import { useBookingWizard } from '../features/booking/state';
import type { CatalogSummary } from '../features/booking/types';

const gbCurrency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export function PricingTable(props: { catalog: CatalogSummary | null; variant?: 'light' | 'dark' }) {
  const { catalog, variant = 'light' } = props;
  if (!catalog) return null;

  const tiers = [...catalog.engineTiers].sort((a,b)=>a.sortOrder-b.sortOrder);
  const services = [...catalog.services].filter((s)=>!!s.code);

  const priceMap = new Map<string, number>();
  catalog.prices.forEach((p)=>{
    priceMap.set(`${p.serviceId}:${p.engineTierId}`, p.amountPence);
  });

  const rowName = (name: string, maxCc: number | null) => {
    if (maxCc === null) return `${name} over 2200cc`;
    return `${name} up to ${maxCc}cc`;
  };

  const isDark = variant === 'dark';
  const cardClass = isDark
    ? 'mt-12 rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-inner'
    : 'mt-12 rounded-xl border border-slate-200 bg-white p-4 shadow-sm';
  const headClass = isDark ? 'bg-slate-800 text-left text-slate-200' : 'bg-slate-100 text-left text-slate-700';
  const rowText = isDark ? 'text-slate-100' : 'text-slate-700';
  const cellClass = 'px-3 py-2';

  return (
    <section className={cardClass}>
      <header className="mb-3">
        <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Fixed Price Menu Servicing</h3>
        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>All prices include VAT at 20% and apply to 4 cylinder cars only.</p>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className={headClass}>
              <th className={cellClass}>Engine size</th>
              {services.map((s)=>(
                <th key={s.id} className={cellClass}>{s.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tiers.map((t)=> (
              <tr key={t.id} className="border-t border-slate-200">
                <td className={`${cellClass} ${rowText}`}>{rowName(t.name, t.maxCc)}</td>
                {services.map((s)=>{
                  const v = priceMap.get(`${s.id}:${t.id}`);
                  return (
                    <td key={`${s.id}:${t.id}`} className={cellClass}>
                      {typeof v === 'number' ? gbCurrency.format(v/100) : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className={`mt-3 list-disc space-y-1 pl-5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <li>Up to 5 litres of standard oil included. Certain oil types may incur an additional charge.</li>
        <li>Additional parts are supplied at cost only; no extra labour fees applied.</li>
      </ul>
    </section>
  );
}
