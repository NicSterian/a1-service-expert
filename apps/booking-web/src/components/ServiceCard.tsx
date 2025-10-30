import React from 'react';

const gbCurrency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export function ServiceCard(props: {
  title: string;
  description: string | null | undefined;
  priceFromPence: number | null | undefined;
  disabled?: boolean;
  selected?: boolean;
  onSelect: () => void;
  onToggleSelected?: () => void;
}) {
  const { title, description, priceFromPence, disabled, selected, onSelect, onToggleSelected } = props;
  const priceLabel = typeof priceFromPence === 'number' ? gbCurrency.format(priceFromPence / 100) : 'Contact us';

  return (
    <div
      className={`flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-inner ${
        disabled ? 'opacity-60' : 'hover:border-orange-500'
      } ${selected ? 'border-orange-500 shadow-[0_0_0_2px_rgba(249,115,22,0.35)]' : ''}`}
      aria-disabled={disabled}
    >
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {description ? <p className="text-sm text-slate-300">{description}</p> : null}
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-xs text-slate-400">Price from</p>
          <p className="text-xl font-bold text-orange-400">{priceLabel}</p>
        </div>
        {disabled ? (
          <span className="rounded border border-slate-600 px-3 py-1 text-sm text-slate-300">Not available</span>
        ) : selected ? (
          <button
            type="button"
            onClick={onToggleSelected ?? onSelect}
            className="inline-flex items-center gap-2 rounded border border-orange-400 bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-600 hover:bg-orange-100"
          >
            <span aria-hidden>✓</span>
            Selected
          </button>
        ) : (
          <button
            type="button"
            onClick={onSelect}
            className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-orange-400"
          >
            Select
          </button>
        )}
      </div>
    </div>
  );
}
