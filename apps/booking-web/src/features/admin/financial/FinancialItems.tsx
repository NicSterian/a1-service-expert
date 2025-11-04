import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiGet, apiPatch } from '../../../lib/api';

type Item = { code?: string; description: string; defaultQty?: number; unitPricePence: number; vatPercent?: number };
type AdminSettingsItems = { invoiceItemsJson?: Item[] };
type CatalogService = { code?: string; name: string; fixedPricePence?: number };

export function FinancialItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await apiGet<AdminSettingsItems>('/admin/settings');
        setItems(settings.invoiceItemsJson || []);
      } catch (err) {
        toast.error((err as Error).message ?? 'Failed to load items');
      }
    };
    load();
  }, []);

  const add = () => setItems((prev) => [...prev, { code: '', description: '', defaultQty: 1, unitPricePence: 0, vatPercent: 0 }]);
  const remove = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const update = (idx: number, patch: Partial<Item>) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const save = async () => {
    try {
      setSaving(true);
      await apiPatch('/admin/settings', { invoiceItems: items });
      toast.success('Items saved');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const importFromCatalog = async () => {
    try {
      // Fetch services from catalog
      const services = await apiGet<CatalogService[]>('/admin/catalog/services');

      // Convert services to financial items format, avoiding duplicates
      const existingDescriptions = new Set(items.map((it) => it.description.toLowerCase()));
      const imported: Item[] = [];

      services.forEach((service) => {
        // Skip if already exists (case-insensitive comparison)
        if (existingDescriptions.has(service.name.toLowerCase())) {
          return;
        }

        // Map service to item
        const item: Item = {
          code: service.code || '',
          description: service.name,
          defaultQty: 1,
          // Use fixed price if available, otherwise use 0 (tiered services need price assignment)
          unitPricePence: service.fixedPricePence || 0,
          vatPercent: 20, // Default VAT rate
        };
        imported.push(item);
        existingDescriptions.add(service.name.toLowerCase());
      });

      if (imported.length === 0) {
        toast.success('No new services to import (all already exist)');
        return;
      }

      // Append to existing items
      setItems((prev) => [...prev, ...imported]);
      toast.success(`Imported ${imported.length} service(s) from catalog`);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to import from catalog');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Products / Services</h3>
        <div className="flex gap-2">
          <button onClick={importFromCatalog} className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-orange-500 hover:text-orange-300">Import from Catalog</button>
          <button onClick={add} className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-orange-500 hover:text-orange-300">+ Add Item</button>
          <button onClick={save} disabled={saving} className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-700/40">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-700">
        <table className="min-w-full divide-y divide-slate-700 text-sm text-slate-200">
          <thead className="bg-slate-800/60 text-xs uppercase text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-right">Default Qty</th>
              <th className="px-3 py-2 text-right">Unit (pence)</th>
              <th className="px-3 py-2 text-right">VAT %</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items.map((it, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2"><input value={it.code ?? ''} onChange={(e) => update(idx, { code: e.target.value })} className="w-28 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white" /></td>
                <td className="px-3 py-2"><input value={it.description} onChange={(e) => update(idx, { description: e.target.value })} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white" /></td>
                <td className="px-3 py-2 text-right"><input value={String(it.defaultQty ?? 1)} onChange={(e) => update(idx, { defaultQty: Number(e.target.value || '0') })} className="w-20 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white text-right" /></td>
                <td className="px-3 py-2 text-right"><input value={String(it.unitPricePence)} onChange={(e) => update(idx, { unitPricePence: Number(e.target.value || '0') })} className="w-28 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white text-right" /></td>
                <td className="px-3 py-2 text-right"><input value={String(it.vatPercent ?? 0)} onChange={(e) => update(idx, { vatPercent: Number(e.target.value || '0') })} className="w-20 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white text-right" /></td>
                <td className="px-3 py-2 text-right"><button onClick={() => remove(idx)} className="rounded-full border border-red-500 px-3 py-1 text-xs text-red-200 hover:bg-red-500/10">Remove</button></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td className="px-3 py-3 text-center text-slate-400" colSpan={6}>No items configured.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

