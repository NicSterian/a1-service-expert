import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiGet, apiPatch, API_BASE_URL } from '../../../lib/api';
import { getAuthToken } from '../../../lib/auth';

type Settings = {
  companyName?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  vatNumber?: string | null;
  vatRegistered: boolean;
  vatRatePercent: string | number;
  invoiceNumberFormat?: string | null;
  brandPrimaryColor?: string | null;
  logoUrl?: string | null;
};

export function FinancialSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<Settings>('/admin/settings').then(setSettings).catch((e) => toast.error(e.message || 'Failed to load settings'));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      await apiPatch('/admin/settings', {
        companyName: settings.companyName ?? null,
        companyAddress: settings.companyAddress ?? null,
        companyPhone: settings.companyPhone ?? null,
        vatNumber: settings.vatNumber ?? null,
        vatRegistered: settings.vatRegistered,
        vatRatePercent: Number(settings.vatRatePercent),
        invoiceNumberFormat: settings.invoiceNumberFormat ?? null,
        brandPrimaryColor: settings.brandPrimaryColor ?? null,
        logoUrl: settings.logoUrl ?? null,
      });
      toast.success('Settings saved');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Please log in again');
        return;
      }
      const res = await fetch(API_BASE_URL + '/admin/settings/logo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setSettings((prev) => (prev ? { ...prev, logoUrl: json.logoUrl } : prev));
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error((err as Error).message ?? 'Logo upload failed');
    }
  };

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Company Information</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 text-sm text-slate-200 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Company Name</label>
            <input
              value={settings.companyName ?? ''}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Company Phone</label>
            <input
              value={settings.companyPhone ?? ''}
              onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Company Address</label>
            <textarea
              rows={3}
              value={settings.companyAddress ?? ''}
              onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white"
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">VAT</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 text-sm text-slate-200 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">VAT Number</label>
            <input
              value={settings.vatNumber ?? ''}
              onChange={(e) => setSettings({ ...settings, vatNumber: e.target.value })}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">VAT Rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={String(settings.vatRatePercent ?? '')}
              onChange={(e) => setSettings({ ...settings, vatRatePercent: e.target.value })}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white"
              placeholder="20"
            />
          </div>
          <div className="md:col-span-2">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={settings.vatRegistered} onChange={(e) => setSettings({ ...settings, vatRegistered: e.target.checked })} />
              VAT Registered
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Numbering & Branding</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 text-sm text-slate-200 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Invoice number format</label>
            <input value={settings.invoiceNumberFormat ?? ''} onChange={(e) => setSettings({ ...settings, invoiceNumberFormat: e.target.value })} className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="INV-{{YYYY}}-{{0000}}" />
            <div className="mt-1 text-xs text-slate-400">Use tokens: {'{{YYYY}}, {{0000}}'}</div>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Brand primary color</label>
            <input type="color" value={settings.brandPrimaryColor ?? '#f97316'} onChange={(e) => setSettings({ ...settings, brandPrimaryColor: e.target.value })} className="h-10 w-20 rounded border border-slate-600 bg-slate-800" />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Logo Filename</label>
            <input
              value={settings.logoUrl ?? ''}
              onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white"
              placeholder="logo.png"
            />
            <div className="mt-1 text-xs text-slate-400">
              Just the filename (e.g. logo.png or logo.webp). Upload your logo to: <code className="text-orange-300">apps\booking-api\storage\uploads\</code>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Upload Logo</label>
            <div className="flex items-center gap-3">
              <input type="file" accept="image/*" onChange={(e) => e.target.files && uploadLogo(e.target.files[0])} />
              {settings.logoUrl && (
                <a href={`${API_BASE_URL}/admin/settings/logo/${settings.logoUrl}`} target="_blank" rel="noreferrer" className="text-orange-300 underline">View current logo</a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-black hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-700/40">
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
