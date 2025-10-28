import React from 'react';

const gbCurrency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export function ServiceCard(props: {
  title: string;
  description: string | null | undefined;
  priceFromPence: number | null | undefined;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const { title, description, priceFromPence, disabled, onSelect } = props;
  const priceLabel =
    typeof priceFromPence === 'number' ? gbCurrency.format(priceFromPence / 100) : 'Contact us';

  return (
    <div
      className={`flex h-full flex-col justify-between rounded-lg border border-slate-700 bg-black p-4 text-white ${
        disabled ? 'opacity-60' : 'hover:border-orange-500'
      }`}
      aria-disabled={disabled}
    >
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description ? (
          <p className="text-sm text-slate-300">{description}</p>
        ) : null}
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-xs text-slate-400">Price from</p>
          <p className="text-xl font-bold text-orange-400">{priceLabel}</p>
        </div>
        <button
          type="button"
          onClick={onSelect}
          disabled={disabled}
          className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Select
        </button>
      </div>
    </div>
  );
}
